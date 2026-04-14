import type { MenuItem } from "@/types/webapp";

import { ProductCard } from "@/components/menu/product-card";

type MenuSectionProps = {
  title: string;
  items: MenuItem[];
  currency: string;
  sectionId?: string;
  quantities?: Record<string, number>;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
};

export function MenuSection({
  title,
  items,
  currency,
  sectionId,
  quantities,
  onIncrement,
  onDecrement
}: MenuSectionProps) {
  return (
    <section className="menu-section" id={sectionId}>
      <div className="section-heading menu-section-heading">
        <div>
          <p className="eyebrow">Categoria</p>
          <h2>{title}</h2>
        </div>
        <span className="section-count">{items.length}</span>
      </div>
      <div className="product-list">
        {items.map((item) => (
          <ProductCard
            key={item.sku}
            item={item}
            currency={currency}
            quantity={quantities?.[item.sku] ?? 0}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ))}
      </div>
    </section>
  );
}
