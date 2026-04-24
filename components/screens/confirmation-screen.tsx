"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { OrderStatusCard } from "@/components/order/order-status-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { TenantLink } from "@/components/shared/tenant-link";
import { useOrderFlowContext } from "@/context/order-flow-context";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";
import { ApiRequestError, fetchOrderStatus } from "@/services/webapp-api";
import type {
  OrderStatusOrderSnapshot,
  OrderUiStatus,
  SubmittedOrderRecap
} from "@/types/webapp";

const POLLING_INTERVAL_MS = 4000;

function mergeOrderRecap(
  localOrder: SubmittedOrderRecap | null,
  remoteOrder: OrderStatusOrderSnapshot | null,
  tenantId: string,
  orderId?: string,
  uiStatus: OrderUiStatus = "pending_payment_review"
): SubmittedOrderRecap | null {
  if (!localOrder && !remoteOrder && !orderId) {
    return null;
  }

  const baseItems =
    remoteOrder?.items && remoteOrder.items.length > 0
      ? remoteOrder.items
      : localOrder?.items ?? [];

  return {
    order_id: remoteOrder?.order_id ?? localOrder?.order_id ?? orderId ?? "",
    tenant_id: remoteOrder?.tenant_id ?? localOrder?.tenant_id ?? tenantId,
    customer_name: remoteOrder?.customer_name ?? localOrder?.customer_name ?? "",
    customer_phone: remoteOrder?.customer_phone ?? localOrder?.customer_phone ?? "",
    requested_time: remoteOrder?.requested_time ?? localOrder?.requested_time ?? "",
    notes: remoteOrder?.notes ?? localOrder?.notes ?? "",
    items: baseItems,
    total_amount: remoteOrder?.total_amount ?? localOrder?.total_amount ?? 0,
    status: uiStatus,
    payment_proof_file:
      remoteOrder?.payment_proof_file ?? localOrder?.payment_proof_file ?? undefined,
    payment_proof_name:
      remoteOrder?.payment_proof_name ?? localOrder?.payment_proof_name ?? undefined,
    created_at: remoteOrder?.created_at ?? localOrder?.created_at ?? new Date().toISOString()
  };
}

export function ConfirmationScreen() {
  const tenantId = useTenantId();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? undefined;
  const orderFlow = useOrderFlowContext();
  const { data, isLoading, error } = useBootstrap(tenantId);
  const storedConfirmation = orderFlow.getConfirmation(tenantId);
  const confirmation =
    storedConfirmation && (!orderId || storedConfirmation.order_id === orderId)
      ? storedConfirmation
      : null;
  const [remoteUiStatus, setRemoteUiStatus] = useState<OrderUiStatus | null>(null);
  const [remoteOrder, setRemoteOrder] = useState<OrderStatusOrderSnapshot | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopPollingRef = useRef(false);
  const confirmationRef = useRef<SubmittedOrderRecap | null>(confirmation);
  const setConfirmationRef = useRef(orderFlow.setConfirmation);

  useEffect(() => {
    confirmationRef.current = confirmation;
  }, [confirmation]);

  useEffect(() => {
    setConfirmationRef.current = orderFlow.setConfirmation;
  }, [orderFlow.setConfirmation]);

  const resolvedUiStatus = remoteUiStatus ?? confirmation?.status ?? "pending_payment_review";
  const displayOrder = useMemo(
    () => mergeOrderRecap(confirmation, remoteOrder, tenantId, orderId, resolvedUiStatus),
    [confirmation, orderId, remoteOrder, resolvedUiStatus, tenantId]
  );

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isActive = true;
    stopPollingRef.current = confirmationRef.current?.status === "paid";

    const clearScheduledPoll = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const abortInFlightRequest = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };

    const stopPolling = () => {
      stopPollingRef.current = true;
      clearScheduledPoll();
      abortInFlightRequest();
    };

    const shouldRetryAfterError = (error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }

      if (error instanceof ApiRequestError) {
        if ((error.status >= 400 && error.status < 500 && error.status !== 429) || error.status === 500) {
          return false;
        }
      }

      return true;
    };

    const pollOrderStatus = async () => {
      if (!isActive || stopPollingRef.current) {
        return;
      }

      abortInFlightRequest();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const nextStatus = await fetchOrderStatus(tenantId, orderId, controller.signal);

        if (!isActive || stopPollingRef.current) {
          return;
        }

        setRemoteUiStatus(nextStatus.ui_status);
        setRemoteOrder(nextStatus.order);

        const mergedNextOrder = mergeOrderRecap(
          confirmationRef.current,
          nextStatus.order,
          tenantId,
          orderId,
          nextStatus.ui_status
        );

        if (mergedNextOrder && nextStatus.ui_status === "paid") {
          setConfirmationRef.current(tenantId, mergedNextOrder);
          stopPolling();
          return;
        }
      } catch (error) {
        if (!isActive || stopPollingRef.current) {
          return;
        }

        if (!shouldRetryAfterError(error)) {
          stopPolling();
          return;
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }

      if (!isActive || stopPollingRef.current) {
        return;
      }

      timeoutRef.current = window.setTimeout(pollOrderStatus, POLLING_INTERVAL_MS);
    };

    void pollOrderStatus();

    return () => {
      isActive = false;
      stopPolling();
    };
  }, [orderId, tenantId]);

  if (isLoading || !orderFlow.isHydrated) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <ErrorState message={error || "No encontramos informacion para este tenant."} />
      </PageShell>
    );
  }

  if (!confirmation && !orderId) {
    return (
      <PageShell contentClassName="page-shell-padding">
        <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
        <EmptyState
          title="No hay un pedido reciente para mostrar"
          message="Cuando completes el pago, aqui veras el recap final de tu pedido."
          actionLabel="Volver al menu"
          actionHref="/"
          tenantId={tenantId}
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      <div className="screen-stack confirmation-screen-stack">
        <OrderStatusCard
          orderId={orderId}
          order={displayOrder}
          currency={data.tenant.currency}
          uiStatus={resolvedUiStatus}
        />
        <TenantLink href="/" tenantId={tenantId} className="button button-secondary button-block">
          Volver al menu
        </TenantLink>
      </div>
    </PageShell>
  );
}
