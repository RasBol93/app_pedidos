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
  const locationText = getContentValue(content, "location_text");

  return (
    <header
      className="hero-card"
      style={
        {
          "--brand-primary": tenant.branding?.primaryColor ?? "#b43a20",
          "--brand-accent": tenant.branding?.accentColor ?? "#ff9b5e",
          "--brand-surface": tenant.branding?.surfaceColor ?? "#fff7f1"
        } as CSSProperties
      }
    >
      <div className="hero-media">
        {tenant.cover_image_url ? <img src={tenant.cover_image_url} alt={tenant.restaurant_name} /> : null}
      </div>
      <div className="hero-overlay" />
      <div className="hero-content">
        <div className="hero-brand">
          <div className="hero-logo">
            {tenant.logo_url ? <img src={tenant.logo_url} alt={`${tenant.restaurant_name} logo`} /> : null}
          </div>
          <div className="hero-brand-copy">
            <p className="eyebrow">Pickup web-app</p>
            <h1>{tenant.restaurant_name}</h1>
            {locationText ? <p className="hero-meta">{locationText}</p> : null}
          </div>
        </div>
        <p className="hero-copy">{welcomeText}</p>
        <nav className="top-links" aria-label="Navegacion principal">
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
