"use client";

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

export function ConfirmationScreen() {
  const tenantId = useTenantId();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? undefined;
  const orderFlow = useOrderFlowContext();
  const { data, isLoading, error } = useBootstrap(tenantId);

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

  const confirmation = orderFlow.getConfirmation(tenantId);

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
        <OrderStatusCard orderId={orderId} order={confirmation} currency={data.tenant.currency} />
        <TenantLink href="/" tenantId={tenantId} className="button button-secondary button-block">
          Volver al menu
        </TenantLink>
      </div>
    </PageShell>
  );
}
