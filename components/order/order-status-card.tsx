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
      <span className="badge badge-success">Pedido enviado</span>
      <h2>Tu comprobante esta en revision</h2>
      <p>
        Tu pedido fue enviado y tu comprobante esta en revision. Te confirmaremos pronto desde el
        canal habitual del restaurante.
      </p>

      {resolvedOrderId ? (
        <div className="status-order-id">
          <span>Referencia</span>
          <strong>{resolvedOrderId}</strong>
        </div>
      ) : null}

      {order ? (
        <div className="confirmation-grid">
          <div className="mini-summary">
            <div>
              <span>Cliente</span>
              <strong>{order.customer_name}</strong>
            </div>
            <div>
              <span>Telefono</span>
              <strong>{order.customer_phone}</strong>
            </div>
            <div>
              <span>Pickup</span>
              <strong>{order.requested_time}</strong>
            </div>
            {order.notes ? (
              <div>
                <span>Notas</span>
                <strong>{order.notes}</strong>
              </div>
            ) : null}
          </div>

          <div className="mini-summary">
            {order.items.map((item) => (
              <div key={item.sku}>
                <span>
                  {item.quantity} x {item.name}
                </span>
                <strong>{formatCurrency(item.price * item.quantity, currency)}</strong>
              </div>
            ))}
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.total_amount, currency)}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
