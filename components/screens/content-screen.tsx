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

type WeeklyScheduleItem = {
  day: string;
  hours: string;
  isClosed: boolean;
};

type ContentPanelConfig = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  hoursTodayLabel?: string;
  hoursTodayMessage?: string;
  weeklySchedule?: WeeklyScheduleItem[];
};

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo"
};

function getContentValue(content: { key: string; value: string; active: boolean }[], key: string) {
  return content.find((entry) => entry.key === key && entry.active)?.value ?? "";
}

function normalizeOpenDays(value: string[] | string) {
  if (Array.isArray(value)) {
    return value.map((day) => day.toLowerCase());
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((day) => day.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function buildWeeklySchedule(settings: {
  weekly_open_days: string[] | string;
  weekly_slot_mode: "single" | "split";
  weekly_slot1_open?: string;
  weekly_slot1_close?: string;
  weekly_slot2_open?: string;
  weekly_slot2_close?: string;
}): WeeklyScheduleItem[] {
  const openDays = new Set(normalizeOpenDays(settings.weekly_open_days));
  const slotOne =
    settings.weekly_slot1_open && settings.weekly_slot1_close
      ? `${settings.weekly_slot1_open} - ${settings.weekly_slot1_close}`
      : "";
  const slotTwo =
    settings.weekly_slot_mode === "split" && settings.weekly_slot2_open && settings.weekly_slot2_close
      ? `${settings.weekly_slot2_open} - ${settings.weekly_slot2_close}`
      : "";
  const openHours = [slotOne, slotTwo].filter(Boolean).join(" / ") || "Horario no disponible";

  return Object.entries(WEEKDAY_LABELS).map(([dayKey, label]) => ({
    day: label,
    hours: openDays.has(dayKey) ? openHours : "Cerrado",
    isClosed: !openDays.has(dayKey)
  }));
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
  const weeklySchedule = buildWeeklySchedule(data.admin_settings);

  const contentByKind = {
    location: {
      eyebrow: "Ubicacion",
      title: "Recoge tu pedido aqui",
      body: locationText,
      ctaLabel: undefined,
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
      body: "",
      ctaLabel: undefined,
      ctaHref: undefined,
      hoursTodayLabel: data.open_status.today_hours_label,
      hoursTodayMessage: data.open_status.message,
      weeklySchedule
    }
  } satisfies Record<ContentKind, ContentPanelConfig>;

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
        hoursTodayLabel={current.hoursTodayLabel}
        hoursTodayMessage={current.hoursTodayMessage}
        weeklySchedule={current.weeklySchedule}
      />
    </PageShell>
  );
}
