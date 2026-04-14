import { slugifyCategory } from "@/lib/format";

import { TenantLink } from "@/components/shared/tenant-link";

type CategoryChipRowProps = {
  categories: string[];
  tenantId: string;
  activeCategory?: string;
};

export function CategoryChipRow({
  categories,
  tenantId,
  activeCategory
}: CategoryChipRowProps) {
  return (
    <div className="category-row">
      <TenantLink
        href="/"
        tenantId={tenantId}
        className={`category-chip ${!activeCategory ? "category-chip-active" : ""}`}
      >
        Todo
      </TenantLink>
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
  );
}
