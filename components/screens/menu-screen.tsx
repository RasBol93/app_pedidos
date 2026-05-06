"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { slugifyCategory } from "@/lib/format";
import { groupMenuByCategory } from "@/lib/menu";

export function MenuScreen() {
  const tenantId = useTenantId();
  const cart = useCartContext();
  const { data, isLoading, error } = useBootstrap(tenantId);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeCategory, setActiveCategory] = useState<string | undefined>();

  const groupedMenu = useMemo(() => (data ? groupMenuByCategory(data.menu) : {}), [data]);
  const categories = useMemo(() => Object.keys(groupedMenu), [groupedMenu]);
  const quantities = useMemo(
    () => Object.fromEntries(cart.getItems(tenantId).map((item) => [item.sku, item.quantity])),
    [cart, tenantId]
  );

  useEffect(() => {
    const sections = Object.entries(sectionRefs.current);
    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible) {
          const category = visible.target.getAttribute("data-category");
          if (category) {
            setActiveCategory(category);
          }
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    sections.forEach(([, element]) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [categories]);

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

  function handleSelectCategory(category?: string) {
    if (!category) {
      setActiveCategory(undefined);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setActiveCategory(category);
    const section = sectionRefs.current[category];

    if (!section) {
      return;
    }

    const top = section.getBoundingClientRect().top + window.scrollY - 108;
    window.scrollTo({
      top,
      behavior: "smooth"
    });
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />

      <div className="menu-top-stack">
        <section
          className={`alert menu-status-card ${
            data.open_status.can_place_order ? "alert-success" : "alert-danger"
          }`}
        >
          <div className="menu-status-copy">
            <strong>{data.open_status.can_place_order ? "Comercio abierto" : "Pedidos pausados"}</strong>
            {!data.open_status.can_place_order ? <span>{data.open_status.message}</span> : null}
          </div>
        </section>

        <div className="menu-sticky-nav">
          <CategoryChipRow
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
          />
        </div>
      </div>

      <div className="menu-grid">
        {Object.entries(groupedMenu).map(([category, items]) => (
          <div
            key={category}
            ref={(element) => {
              sectionRefs.current[category] = element;
            }}
            data-category={category}
            className="menu-section-anchor"
          >
            <MenuSection
              title={category}
              sectionId={slugifyCategory(category)}
              items={items}
              currency={data.tenant.currency}
              quantities={quantities}
              onIncrement={(item) => cart.addItem(tenantId, item)}
              onDecrement={(item) =>
                cart.updateQuantity(tenantId, item.sku, Math.max(0, (quantities[item.sku] ?? 0) - 1))
              }
            />
          </div>
        ))}
      </div>

      <CartFloatingBar tenantId={tenantId} currency={data.tenant.currency} />
    </PageShell>
  );
}
