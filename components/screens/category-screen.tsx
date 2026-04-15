"use client";

import { useMemo } from "react";

import { CartFloatingBar } from "@/components/cart/cart-floating-bar";
import { CategoryChipRow } from "@/components/menu/category-chip-row";
import { MenuSection } from "@/components/menu/menu-section";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";
import { slugifyCategory } from "@/lib/format";
import { groupMenuByCategory } from "@/lib/menu";

type CategoryScreenProps = {
  slug: string;
};

export function CategoryScreen({ slug }: CategoryScreenProps) {
  const tenantId = useTenantId();
  const { data, isLoading, error } = useBootstrap(tenantId);

  const groupedMenu = useMemo(() => (data ? groupMenuByCategory(data.menu) : {}), [data]);
  const categories = Object.keys(groupedMenu);
  const activeCategory = categories.find((category) => slugifyCategory(category) === slug);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <ErrorState message={error || "No encontramos informacion para este tenant."} />
      </PageShell>
    );
  }

  if (!activeCategory) {
    return (
      <PageShell>
        <EmptyState
          title="Categoria no encontrada"
          message="Esta categoria no existe para el restaurante seleccionado."
          actionLabel="Volver al menu"
          actionHref="/"
          tenantId={tenantId}
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      <CategoryChipRow categories={categories} tenantId={tenantId} activeCategory={activeCategory} />
      <MenuSection
        title={activeCategory}
        items={groupedMenu[activeCategory]}
        currency={data.tenant.currency}
      />
      <CartFloatingBar tenantId={tenantId} currency={data.tenant.currency} />
    </PageShell>
  );
}
