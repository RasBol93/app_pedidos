"use client";

import { useCartContext } from "@/context/cart-context";
import { formatCurrency } from "@/lib/format";

import { TenantLink } from "@/components/shared/tenant-link";

type CartFloatingBarProps = {
  tenantId: string;
  currency: string;
};

export function CartFloatingBar({ tenantId, currency }: CartFloatingBarProps) {
  const cart = useCartContext();
  const count = cart.getCount(tenantId);
  const subtotal = cart.getSubtotal(tenantId);
  const itemsLabel = `${count} ${count === 1 ? "producto" : "productos"}`;

  if (!cart.isHydrated || count === 0) {
    return null;
  }

  return (
    <TenantLink href="/cart" tenantId={tenantId} className="cart-bar">
      <div>
        <span className="cart-bar-label">{itemsLabel}</span>
        <strong>Revisar pedido</strong>
      </div>
      <span>{formatCurrency(subtotal, currency)}</span>
    </TenantLink>
  );
}
