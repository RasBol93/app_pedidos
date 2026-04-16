import { slugifyCategory } from "@/lib/format";

import { TenantLink } from "@/components/shared/tenant-link";

type CategoryChipRowProps = {
  categories: string[];
  tenantId?: string;
  activeCategory?: string;
  onSelectCategory?: (category?: string) => void;
  showAllChip?: boolean;
};

export function CategoryChipRow({
  categories,
  tenantId,
  activeCategory,
  onSelectCategory,
  showAllChip = true
}: CategoryChipRowProps) {
  if (onSelectCategory) {
    return (
      <div className="category-nav-shell">
        <div className="category-carousel-viewport">
          <div className="category-row-scroll" aria-label="Categorias">
            <div className="category-row category-row-nowrap category-chip-track">
              {showAllChip ? (
                <button
                  type="button"
                  className={`category-chip ${!activeCategory ? "category-chip-active" : ""}`}
                  onClick={() => onSelectCategory(undefined)}
                >
                  Todo
                </button>
              ) : null}
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-chip ${activeCategory === category ? "category-chip-active" : ""}`}
                  onClick={() => onSelectCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-nav-shell">
      <div className="category-carousel-viewport">
        <div className="category-row-scroll" aria-label="Categorias">
          <div className="category-row category-row-nowrap category-chip-track">
            {showAllChip ? (
              <TenantLink
                href="/"
                tenantId={tenantId}
                className={`category-chip ${!activeCategory ? "category-chip-active" : ""}`}
              >
                Todo
              </TenantLink>
            ) : null}
            {categories.map((category) => (
              <TenantLink
                key={category}
                href={`/category/${slugifyCategory(category)}`}
                tenantId={tenantId}
                className={`category-chip ${activeCategory === category ? "category-chip-active" : ""}`}
              >
                {category}
              </TenantLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
