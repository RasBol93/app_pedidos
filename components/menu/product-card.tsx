import { formatCurrency } from "@/lib/format";
import type { MenuItem } from "@/types/webapp";

type ProductCardProps = {
  item: MenuItem;
  currency: string;
  onAdd: (item: MenuItem) => void;
};

export function ProductCard({ item, currency, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-copy">
        <span className="product-sku">{item.sku}</span>
        <h3>{item.name}</h3>
        <p className="product-description">{item.description || "Descripcion disponible pronto."}</p>
        <div className="product-footer">
          <strong>{formatCurrency(item.price, currency)}</strong>
          <button type="button" className="button button-primary button-small" onClick={() => onAdd(item)}>
            Agregar
          </button>
        </div>
      </div>
      <div className="product-image">
        {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : <span>Sin foto</span>}
      </div>
    </article>
  );
}
