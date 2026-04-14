"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useOrderFlowContext } from "@/context/order-flow-context";
import { formatCurrency } from "@/lib/format";
import { buildTenantHref } from "@/lib/tenant";
import type { WebappBootstrap } from "@/types/webapp";

type CartCheckoutPanelProps = {
  tenantId: string;
  bootstrap: WebappBootstrap;
  totalItems: number;
  totalAmount: number;
};

export function CartCheckoutPanel({
  tenantId,
  bootstrap,
  totalItems,
  totalAmount
}: CartCheckoutPanelProps) {
  const router = useRouter();
  const orderFlow = useOrderFlowContext();
  const draft = orderFlow.getDraft(tenantId);

  useEffect(() => {
    if (!draft.requested_time && bootstrap.open_status.pickup_slots[0]) {
      orderFlow.saveDraft(tenantId, {
        requested_time: bootstrap.open_status.pickup_slots[0]
      });
    }
  }, [bootstrap.open_status.pickup_slots, draft.requested_time, orderFlow, tenantId]);

  const canContinue = useMemo(() => {
    return Boolean(
      bootstrap.open_status.can_place_order &&
        totalItems > 0 &&
        draft.customer_name.trim() &&
        draft.customer_phone.trim() &&
        draft.requested_time
    );
  }, [
    bootstrap.open_status.can_place_order,
    draft.customer_name,
    draft.customer_phone,
    draft.requested_time,
    totalItems
  ]);

  return (
    <section className="form-card cart-checkout-card">
      <div className="section-heading cart-checkout-heading">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2>Pickup y datos</h2>
          <p className="cart-checkout-intro">Completa tus datos y elige una hora para retirar tu pedido.</p>
        </div>
      </div>

      {!bootstrap.open_status.can_place_order ? (
        <div className="alert alert-danger">{bootstrap.open_status.message}</div>
      ) : (
        <div className="alert alert-success">
          {bootstrap.open_status.message} Horario de hoy: {bootstrap.open_status.today_hours_label}
        </div>
      )}

      <div className="cart-section-block">
        <div className="cart-block-heading">
          <p className="eyebrow">Datos</p>
          <h3>Tu contacto</h3>
        </div>
        <div className="cart-checkout-fields">
          <label className="field">
            <span>Nombre</span>
            <input
              value={draft.customer_name}
              onChange={(event) => orderFlow.saveDraft(tenantId, { customer_name: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Telefono</span>
            <input
              type="tel"
              inputMode="tel"
              value={draft.customer_phone}
              onChange={(event) => orderFlow.saveDraft(tenantId, { customer_phone: event.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="pickup-panel">
        <div className="cart-block-heading">
          <p className="eyebrow">Pickup</p>
          <h3>Selecciona una hora</h3>
        </div>
        <div className="pickup-panel-heading">
          <span>Hora elegida</span>
          <strong>{draft.requested_time || "Selecciona una hora"}</strong>
        </div>
        <div className="pickup-slot-grid">
          {bootstrap.open_status.pickup_slots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`pickup-slot ${draft.requested_time === slot ? "pickup-slot-active" : ""}`}
              onClick={() => orderFlow.saveDraft(tenantId, { requested_time: slot })}
              disabled={!bootstrap.open_status.can_place_order}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      <div className="cart-section-block">
        <div className="cart-block-heading">
          <p className="eyebrow">Notas</p>
          <h3>Algo para tener en cuenta</h3>
        </div>
        <label className="field">
          <span>Notas (opcional)</span>
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(event) => orderFlow.saveDraft(tenantId, { notes: event.target.value })}
          />
        </label>
      </div>

      <div className="cart-totals-card">
        <div className="cart-total-row">
          <span>Items</span>
          <strong>{totalItems}</strong>
        </div>
        <div className="cart-total-row">
          <span>Subtotal</span>
          <strong>{formatCurrency(totalAmount, bootstrap.tenant.currency)}</strong>
        </div>
        <div className="cart-total-row cart-total-row-final">
          <span>Total</span>
          <strong>{formatCurrency(totalAmount, bootstrap.tenant.currency)}</strong>
        </div>
      </div>

      <button
        type="button"
        className="button button-primary button-block cart-cta-button"
        disabled={!canContinue}
        onClick={() => router.push(buildTenantHref("/payment", tenantId))}
      >
        Continuar al pago
      </button>
    </section>
  );
}
