type OrderStatusCardProps = {
  orderId?: string;
};

export function OrderStatusCard({ orderId }: OrderStatusCardProps) {
  return (
    <section className="status-card">
      <span className="badge badge-success">Pedido enviado</span>
      <h2>Tu comprobante esta en revision</h2>
      <p>
        Tu pedido fue enviado y tu comprobante esta en revision. Te confirmaremos pronto desde el
        canal habitual del restaurante.
      </p>
      {orderId ? (
        <div className="status-order-id">
          <span>Referencia</span>
          <strong>{orderId}</strong>
        </div>
      ) : null}
    </section>
  );
}
