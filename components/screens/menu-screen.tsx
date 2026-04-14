"use client";

import { useMemo } from "react";

import { CartFloatingBar } from "@/components/cart/cart-floating-bar";
import { CategoryChipRow } from "@/components/menu/category-chip-row";
import { MenuSection } from "@/components/menu/menu-section";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useCartContext } from "@/context/cart-context";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";
import { groupMenuByCategory } from "@/lib/menu";

export function MenuScreen() {
  const tenantId = useTenantId();
  const cart = useCartContext();
  const { data, isLoading, error } = useBootstrap(tenantId);

  const categories = useMemo(() => {
    if (!data) {
      return [];
    }

    return Object.keys(groupMenuByCategory(data.menu));
  }, [data]);

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

  const groupedMenu = groupMenuByCategory(data.menu);

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />

      <section className={`alert ${data.open_status.can_place_order ? "alert-success" : "alert-danger"}`}>
        <strong>{data.open_status.can_place_order ? "Pickup habilitado" : "Pedidos pausados"}</strong>
        <span>{data.open_status.message}</span>
      </section>

      <CategoryChipRow categories={categories} tenantId={tenantId} />

      <div className="menu-grid">
        {Object.entries(groupedMenu).map(([category, items]) => (
          <MenuSection
            key={category}
            title={category}
            items={items}
            currency={data.tenant.currency}
            onAdd={(item) => cart.addItem(tenantId, item)}
          />
        ))}
      </div>

      <CartFloatingBar tenantId={tenantId} currency={data.tenant.currency} />
    </PageShell>
  );
}
