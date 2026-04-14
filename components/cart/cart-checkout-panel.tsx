"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useOrderFlowContext } from "@/context/order-flow-context";
import { buildTenantHref } from "@/lib/tenant";
import type { WebappBootstrap } from "@/types/webapp";

type CartCheckoutPanelProps = {
  tenantId: string;
  bootstrap: WebappBootstrap;
  totalItems: number;
};

export function CartCheckoutPanel({
  tenantId,
  bootstrap,
  totalItems
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
    <section className="form-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pickup</p>
          <h2>Datos del pedido</h2>
        </div>
      </div>

      {!bootstrap.open_status.can_place_order ? (
        <div className="alert alert-danger">{bootstrap.open_status.message}</div>
      ) : (
        <div className="alert alert-success">
          {bootstrap.open_status.message} Horario de hoy: {bootstrap.open_status.today_hours_label}
        </div>
      )}

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

      <label className="field">
        <span>Hora de pickup</span>
        <select
          value={draft.requested_time}
          onChange={(event) => orderFlow.saveDraft(tenantId, { requested_time: event.target.value })}
          disabled={!bootstrap.open_status.can_place_order}
        >
          {bootstrap.open_status.pickup_slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Notas para cocina (opcional)</span>
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => orderFlow.saveDraft(tenantId, { notes: event.target.value })}
        />
      </label>

      <button
        type="button"
        className="button button-primary button-block"
        disabled={!canContinue}
        onClick={() => router.push(buildTenantHref("/payment", tenantId))}
      >
        Ir a pago QR
      </button>
    </section>
  );
}
