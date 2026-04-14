import { formatCurrency } from "@/lib/format";
import type { MenuItem } from "@/types/webapp";

type ProductCardProps = {
  item: MenuItem;
  currency: string;
  quantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
};

export function ProductCard({
  item,
  currency,
  quantity,
  onIncrement,
  onDecrement
}: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-media">
        <div className="product-image">
          {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <span>Sin foto</span>}
        </div>
      </div>
      <div className="product-copy">
        <div className="product-header">
          <h3>{item.name}</h3>
          <strong className="product-price">{formatCurrency(item.price, currency)}</strong>
        </div>
        {item.description ? <p className="product-description">{item.description}</p> : null}
        <div className="product-footer">
          {quantity > 0 ? (
            <div className="product-stepper" aria-label={`Cantidad de ${item.name}`}>
              <button type="button" className="product-stepper-button" onClick={() => onDecrement(item)}>
                -
              </button>
              <span className="product-stepper-value">{quantity}</span>
              <button type="button" className="product-stepper-button" onClick={() => onIncrement(item)}>
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="button button-primary button-small product-add-button"
              onClick={() => onIncrement(item)}
              aria-label={`Agregar ${item.name}`}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
