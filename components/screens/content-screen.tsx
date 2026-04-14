"use client";

import { InfoPanel } from "@/components/info/info-panel";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";

type ContentKind = "location" | "faq" | "hours";

type ContentScreenProps = {
  kind: ContentKind;
};

function getContentValue(content: { key: string; value: string; active: boolean }[], key: string) {
  return content.find((entry) => entry.key === key && entry.active)?.value ?? "";
}

export function ContentScreen({ kind }: ContentScreenProps) {
  const tenantId = useTenantId();
  const { data, isLoading, error } = useBootstrap(tenantId);

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

  const locationText = getContentValue(data.content, "location_text");
  const locationLink = getContentValue(data.content, "location_link");
  const faqText = getContentValue(data.content, "faq_text");

  const contentByKind = {
    location: {
      eyebrow: "Ubicacion",
      title: "Recoge tu pedido aqui",
      body: locationText,
      ctaLabel: "Abrir mapa",
      ctaHref: locationLink
    },
    faq: {
      eyebrow: "FAQ",
      title: "Preguntas frecuentes",
      body: faqText,
      ctaLabel: undefined,
      ctaHref: undefined
    },
    hours: {
      eyebrow: "Horarios",
      title: "Disponibilidad de pickup",
      body: `Horario de hoy: ${data.open_status.today_hours_label}\n\n${data.open_status.message}\n\nTiempo de preparacion: ${data.admin_settings.prep_time_min} min.\nSlots: cada ${data.admin_settings.pickup_interval_minutes} min.`,
      ctaLabel: undefined,
      ctaHref: undefined
    }
  } satisfies Record<
    ContentKind,
    { eyebrow: string; title: string; body: string; ctaLabel?: string; ctaHref?: string }
  >;

  const current = contentByKind[kind];

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader
        tenant={data.tenant}
        content={data.content}
        tenantId={tenantId}
        activePath={kind === "location" ? "/location" : kind === "faq" ? "/faq" : "/hours"}
      />
      <InfoPanel
        eyebrow={current.eyebrow}
        title={current.title}
        body={current.body}
        ctaLabel={current.ctaLabel}
        ctaHref={current.ctaHref}
      />
    </PageShell>
  );
}
