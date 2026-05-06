import type { CSSProperties } from "react";

import type { ContentBlock, TenantInfo } from "@/types/webapp";

import { TenantLink } from "@/components/shared/tenant-link";

type AppHeaderProps = {
  tenant: TenantInfo;
  content: ContentBlock[];
  tenantId: string;
  activePath?: string;
};

function getContentValue(content: ContentBlock[], key: ContentBlock["key"]) {
  return content.find((entry) => entry.key === key && entry.active)?.value ?? "";
}

export function AppHeader({ tenant, content, tenantId, activePath = "/" }: AppHeaderProps) {
  const welcomeText = getContentValue(content, "welcome_text");
  const hasCoverImage = Boolean(tenant.cover_image_url);

  return (
    <header
      className={`hero-card ${hasCoverImage ? "hero-card-with-cover" : "hero-card-compact"}`}
      style={
        {
          "--brand-primary": "#2563EB",
          "--brand-accent": "#3B82F6",
          "--brand-surface": "#DBEAFE"
        } as CSSProperties
      }
    >
      {hasCoverImage ? (
        <>
          <div className="hero-media">
            <img src={tenant.cover_image_url} alt={tenant.restaurant_name} />
          </div>
          <div className="hero-overlay" />
        </>
      ) : null}
      <div className={`hero-content ${hasCoverImage ? "" : "hero-content-compact"}`}>
        <div className="hero-brand">
          <div className="hero-logo">
            {tenant.logo_url ? <img src={tenant.logo_url} alt={`${tenant.restaurant_name} logo`} /> : null}
          </div>
          <div className="hero-brand-copy">
            <p className="eyebrow">Orden online</p>
            <h1>{tenant.restaurant_name}</h1>
            <p className="hero-meta">Pide en minutos y retira sin esperas</p>
          </div>
        </div>
        <p className="hero-copy">{welcomeText}</p>
      </div>
      <div className="hero-utility-nav">
        <nav className="top-links hero-links" aria-label="Navegacion principal">
          <TenantLink
            href="/"
            tenantId={tenantId}
            className={`chip-link ${activePath === "/" ? "chip-link-active" : ""}`}
          >
            Menu
          </TenantLink>
          <TenantLink
            href="/location"
            tenantId={tenantId}
            className={`chip-link ${activePath === "/location" ? "chip-link-active" : ""}`}
          >
            Ubicacion
          </TenantLink>
          <TenantLink
            href="/faq"
            tenantId={tenantId}
            className={`chip-link ${activePath === "/faq" ? "chip-link-active" : ""}`}
          >
            FAQ
          </TenantLink>
          <TenantLink
            href="/hours"
            tenantId={tenantId}
            className={`chip-link ${activePath === "/hours" ? "chip-link-active" : ""}`}
          >
            Horarios
          </TenantLink>
        </nav>
      </div>
    </header>
  );
}
