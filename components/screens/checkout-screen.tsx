"use client";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useCartContext } from "@/context/cart-context";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";

export function CheckoutScreen() {
  const tenantId = useTenantId();
  const cart = useCartContext();
  const { data, isLoading, error } = useBootstrap(tenantId);

  if (isLoading) {
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

  if (items.length === 0) {
    return (
      <PageShell contentClassName="page-shell-padding">
        <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
        <EmptyState
          title="Aun no hay nada para pagar"
          message="Primero agrega productos al carrito para continuar con el checkout."
          actionLabel="Ir al menu"
          actionHref="/"
          tenantId={tenantId}
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      <CheckoutForm
        tenantId={tenantId}
        bootstrap={data}
        items={items}
        total={cart.getSubtotal(tenantId)}
      />
    </PageShell>
  );
}
