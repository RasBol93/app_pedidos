import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";
import { reportOrderPaid, reportPaymentProof } from "@/services/webapp-api";
import type { SubmittedOrderRecap } from "@/types/webapp";

type OrderStatusCardProps = {
  tenantId: string;
  orderId?: string;
  order?: SubmittedOrderRecap | null;
  currency: string;
};

export function OrderStatusCard({ tenantId, orderId, order, currency }: OrderStatusCardProps) {
  const resolvedOrderId = order?.order_id ?? orderId;
  const [proofReference, setProofReference] = useState("");
  const [proofStatus, setProofStatus] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [paidStatus, setPaidStatus] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [isSendingProof, setIsSendingProof] = useState(false);
  const [isReportingPaid, setIsReportingPaid] = useState(false);
  const proofCaption = useMemo(() => {
    if (!order?.customer_name) {
      return undefined;
    }

    return `Comprobante enviado desde WebApp por ${order.customer_name}`;
  }, [order?.customer_name]);

  async function handleSendProof() {
    if (!resolvedOrderId) {
      setProofError("No encontramos el pedido para asociar el comprobante.");
      return;
    }

    if (!proofReference.trim()) {
      setProofError("Ingresa una URL o referencia del comprobante.");
      return;
    }

    try {
      setIsSendingProof(true);
      setProofError(null);
      setProofStatus(null);

      const response = await reportPaymentProof({
        tenant_id: tenantId,
        order_id: resolvedOrderId,
        proof_type: "external_url",
        proof_reference: proofReference.trim(),
        proof_caption: proofCaption
      });

      setProofStatus(
        response.message || "Recibimos tu comprobante. Lo revisaremos con el equipo del restaurante."
      );
    } catch (error) {
      setProofError(
        error instanceof Error ? error.message : "No pudimos registrar tu comprobante. Intenta nuevamente."
      );
    } finally {
      setIsSendingProof(false);
    }
  }

  async function handleReportPaid() {
    if (!resolvedOrderId) {
      setPaidError("No encontramos el pedido para reportar el pago.");
      return;
    }

    try {
      setIsReportingPaid(true);
      setPaidError(null);
      setPaidStatus(null);

      const response = await reportOrderPaid({
        tenant_id: tenantId,
        order_id: resolvedOrderId
      });

      setPaidStatus(response.message || "Avisamos al restaurante que ya realizaste el pago.");
    } catch (error) {
      setPaidError(
        error instanceof Error ? error.message : "No pudimos avisar que ya pagaste. Intenta nuevamente."
      );
    } finally {
      setIsReportingPaid(false);
    }
  }

  return (
    <section className="status-card">
      <div className="status-hero">
        <span className="badge badge-success">Pedido enviado</span>
        <div className="status-hero-copy">
          <h2>Tu comprobante esta en revision</h2>
          <p>
            Tu pedido fue enviado y tu comprobante esta en revision. Te confirmaremos pronto desde el
            canal habitual del restaurante.
          </p>
        </div>
      </div>

      {resolvedOrderId ? (
        <div className="status-order-id">
          <span className="status-meta-label">Referencia</span>
          <strong>{resolvedOrderId}</strong>
        </div>
      ) : null}

      {order ? (
        <div className="confirmation-grid">
          <section className="confirmation-section">
            <div className="confirmation-section-heading">
              <p className="eyebrow">Cliente</p>
              <h3>Datos de contacto</h3>
            </div>
            <div className="mini-summary confirmation-summary-list">
              <div>
                <span>Nombre</span>
                <strong>{order.customer_name}</strong>
              </div>
              <div>
                <span>Telefono</span>
                <strong>{order.customer_phone}</strong>
              </div>
            </div>
          </section>

          <section className="confirmation-section">
            <div className="confirmation-section-heading">
              <p className="eyebrow">Pickup</p>
              <h3>Retiro</h3>
            </div>
            <div className="mini-summary confirmation-summary-list">
              <div>
                <span>Hora seleccionada</span>
                <strong>{order.requested_time}</strong>
              </div>
              {order.notes ? (
                <div className="confirmation-notes-row">
                  <span>Notas</span>
                  <strong>{order.notes}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="confirmation-section">
            <div className="confirmation-section-heading">
              <p className="eyebrow">Pedido</p>
              <h3>Resumen</h3>
            </div>
            <div className="mini-summary confirmation-summary-list">
              {order.items.map((item) => (
                <div key={item.sku}>
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <strong>{formatCurrency(item.price * item.quantity, currency)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="confirmation-section confirmation-total-section">
            <div className="confirmation-total-row">
              <span>Total</span>
              <strong>{formatCurrency(order.total_amount, currency)}</strong>
            </div>
          </section>
        </div>
      ) : null}

      {resolvedOrderId ? (
        <section className="confirmation-section">
          <div className="confirmation-section-heading">
            <p className="eyebrow">Pago</p>
            <h3>Reporta tu comprobante</h3>
          </div>

          <label className="field">
            <span>URL o referencia del comprobante</span>
            <input
              placeholder="Ej. https://... o numero de referencia"
              value={proofReference}
              onChange={(event) => setProofReference(event.target.value)}
            />
          </label>

          {proofStatus ? <div className="alert alert-success">{proofStatus}</div> : null}
          {proofError ? <div className="alert alert-danger">{proofError}</div> : null}
          {paidStatus ? <div className="alert alert-success">{paidStatus}</div> : null}
          {paidError ? <div className="alert alert-danger">{paidError}</div> : null}

          <div className="inline-actions confirmation-action-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={handleSendProof}
              disabled={isSendingProof || isReportingPaid}
            >
              {isSendingProof ? "Enviando comprobante..." : "Enviar comprobante"}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleReportPaid}
              disabled={isReportingPaid || isSendingProof}
            >
              {isReportingPaid ? "Avisando..." : "Ya pague"}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
