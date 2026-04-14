"use client";

import { PaymentForm } from "@/components/payment/payment-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useCartContext } from "@/context/cart-context";
import { useOrderFlowContext } from "@/context/order-flow-context";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";

export function PaymentScreen() {
  const tenantId = useTenantId();
  const cart = useCartContext();
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

  const items = cart.getItems(tenantId);
  const draft = orderFlow.getDraft(tenantId);

  if (
    items.length === 0 ||
    !draft.customer_name.trim() ||
    !draft.customer_phone.trim() ||
    !draft.requested_time
  ) {
    return (
      <PageShell contentClassName="page-shell-padding">
        <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
        <EmptyState
          title="Primero completa tu carrito"
          message="Antes de pagar, necesitamos que revises los items y definas tus datos de pickup."
          actionLabel="Ir al carrito"
          actionHref="/cart"
          tenantId={tenantId}
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      <PaymentForm
        tenantId={tenantId}
        bootstrap={data}
        items={items}
        total={cart.getSubtotal(tenantId)}
      />
    </PageShell>
  );
}
