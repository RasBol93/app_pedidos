"use client";

import { formatCurrency } from "@/lib/format";
import type { CartItem } from "@/types/webapp";

import { TenantLink } from "@/components/shared/tenant-link";

type CartSummaryProps = {
  tenantId: string;
  items: CartItem[];
  currency: string;
  total: number;
  onUpdateQuantity: (sku: string, quantity: number) => void;
  onRemove: (sku: string) => void;
  showCheckoutButton?: boolean;
  primaryActionHref?: string;
  primaryActionLabel?: string;
};

export function CartSummary({
  tenantId,
  items,
  currency,
  total,
  onUpdateQuantity,
  onRemove,
  showCheckoutButton = true,
  primaryActionHref = "/payment",
  primaryActionLabel = "Continuar"
}: CartSummaryProps) {
  return (
    <div className="summary-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Carrito</p>
          <h2>Resumen del pedido</h2>
        </div>
      </div>
      <div className="cart-list">
        {items.map((item) => (
          <article key={item.sku} className="cart-row">
            <div className="cart-row-main">
              <div className="cart-thumb">
                {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <span>{item.name[0]}</span>}
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{formatCurrency(item.price, currency)} c/u</p>
              </div>
            </div>
            <div className="cart-row-actions">
              <div className="qty-stepper">
                <button type="button" onClick={() => onUpdateQuantity(item.sku, item.quantity - 1)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => onUpdateQuantity(item.sku, item.quantity + 1)}>
                  +
                </button>
              </div>
              <strong>{formatCurrency(item.quantity * item.price, currency)}</strong>
              <button type="button" className="text-button" onClick={() => onRemove(item.sku)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="totals-panel">
        <div>
          <span>Subtotal</span>
          <strong>{formatCurrency(total, currency)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatCurrency(total, currency)}</strong>
        </div>
      </div>
      {showCheckoutButton ? (
        <div className="inline-actions">
          <TenantLink href="/" tenantId={tenantId} className="button button-secondary">
            Seguir viendo menu
          </TenantLink>
          <TenantLink href={primaryActionHref} tenantId={tenantId} className="button button-primary">
            {primaryActionLabel}
          </TenantLink>
        </div>
      ) : null}
    </div>
  );
}
