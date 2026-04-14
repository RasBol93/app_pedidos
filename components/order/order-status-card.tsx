import { formatCurrency } from "@/lib/format";
import type { SubmittedOrderRecap } from "@/types/webapp";

type OrderStatusCardProps = {
  orderId?: string;
  order?: SubmittedOrderRecap | null;
  currency: string;
};

export function OrderStatusCard({ orderId, order, currency }: OrderStatusCardProps) {
  const resolvedOrderId = order?.order_id ?? orderId;

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
    </section>
  );
}
