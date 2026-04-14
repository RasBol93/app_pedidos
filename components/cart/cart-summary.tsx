"use client";

import { formatCurrency } from "@/lib/format";
import type { CartItem } from "@/types/webapp";

import { TenantLink } from "@/components/shared/tenant-link";

type CartSummaryProps = {
  tenantId: string;
  items: CartItem[];
  currency: string;
  onUpdateQuantity: (sku: string, quantity: number) => void;
  showCheckoutButton?: boolean;
  showContinueShoppingButton?: boolean;
  primaryActionHref?: string;
  primaryActionLabel?: string;
};

export function CartSummary({
  tenantId,
  items,
  currency,
  onUpdateQuantity,
  showCheckoutButton = true,
  showContinueShoppingButton = true,
  primaryActionHref = "/payment",
  primaryActionLabel = "Continuar"
}: CartSummaryProps) {
  return (
    <div className="summary-card cart-summary-card">
      <div className="section-heading cart-summary-heading">
        <div>
          <p className="eyebrow">Carrito</p>
          <h2>Tu pedido</h2>
          <p className="cart-summary-note">Revisa tus productos antes de pasar al pago.</p>
        </div>
        <span className="section-count">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
      </div>
      <div className="cart-list">
        {items.map((item) => (
          <article key={item.sku} className="cart-row">
            <div className="cart-row-main">
              <div className="cart-row-copy">
                <div className="cart-thumb">
                  {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <span>{item.name[0]}</span>}
                </div>
                <div className="cart-row-copy-text">
                  <h3>{item.name}</h3>
                  <p className="cart-row-label">Precio por unidad</p>
                  <p className="cart-row-unit-price">{formatCurrency(item.price, currency)}</p>
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
                <strong className="cart-row-price">
                  {formatCurrency(item.quantity * item.price, currency)}
                </strong>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="cart-summary-footer">
        {showContinueShoppingButton ? (
          <TenantLink href="/" tenantId={tenantId} className="button button-secondary button-block cart-secondary-button">
            Seguir comprando
          </TenantLink>
        ) : null}
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
    </div>
  );
}
