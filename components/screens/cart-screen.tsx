"use client";

import { CartSummary } from "@/components/cart/cart-summary";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useCartContext } from "@/context/cart-context";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";

export function CartScreen() {
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

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      {items.length === 0 ? (
        <EmptyState
          title="Tu carrito esta vacio"
          message="Agrega algunos productos para continuar con tu pedido."
          actionLabel="Ver menu"
          actionHref="/"
          tenantId={tenantId}
        />
      ) : (
        <CartSummary
          tenantId={tenantId}
          items={items}
          currency={data.tenant.currency}
          total={cart.getSubtotal(tenantId)}
          onUpdateQuantity={(sku, quantity) => cart.updateQuantity(tenantId, sku, quantity)}
          onRemove={(sku) => cart.removeItem(tenantId, sku)}
        />
      )}
    </PageShell>
  );
}
