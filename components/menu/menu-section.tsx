import type { MenuItem } from "@/types/webapp";

import { ProductCard } from "@/components/menu/product-card";

type MenuSectionProps = {
  title: string;
  items: MenuItem[];
  currency: string;
  onAdd: (item: MenuItem) => void;
};

export function MenuSection({ title, items, currency, onAdd }: MenuSectionProps) {
  return (
    <section className="menu-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Categoria</p>
          <h2>{title}</h2>
        </div>
        <span className="section-count">{items.length}</span>
      </div>
      <div className="product-list">
        {items.map((item) => (
          <ProductCard key={item.sku} item={item} currency={currency} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
