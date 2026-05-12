"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageShell } from "@/components/shared/page-shell";
import { fetchDashboardSummary } from "@/services/dashboard-api";
import type {
  DashboardCategory,
  DashboardInsight,
  DashboardKpiComparison,
  DashboardKpiComparisonMap,
  DashboardKpis,
  DashboardPeriodKey,
  DashboardSeriesPoint,
  DashboardSummaryResponse,
  DashboardTopCustomer,
  DashboardTopProduct
} from "@/types/dashboard";

type DashboardKpiCard = {
  key: "sales_total" | "orders_paid" | "avg_ticket" | "unique_customers";
  label: string;
  value: string;
  methodology: string;
  comparisons: Array<{
    id: string;
    label: string;
    deltaText: string;
    sentiment: "positive" | "negative" | "neutral";
    currentValueLabel: string;
    referenceValueLabel: string;
    currentWidth: number;
    referenceWidth: number;
  }>;
  tone?: "primary" | "neutral";
};

type DashboardPeriodContext = {
  title: string;
  description: string;
  note: string;
  progressPercent: number;
  progressStartLabel: string;
  progressCurrentLabel: string;
  progressEndLabel: string;
  progressCaption: string;
};

type DashboardPeriodChartRow = {
  id: string;
  label: string;
  sales: number;
  orders: number;
};

type DashboardHourlyChartRow = {
  id: string;
  label: string;
  sales: number;
  orders: number;
};

const PERIOD_OPTIONS: Array<{ value: DashboardPeriodKey; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "this_week", label: "Esta semana" },
  { value: "month_to_date", label: "Mes en curso" }
];

const KPI_METHODOLOGY: Record<DashboardKpiCard["key"], string> = {
  sales_total:
    "Ventas totales suma el monto de los pedidos pagados dentro del período seleccionado. No incluye pedidos creados que todavía no fueron pagados. Las comparaciones usan períodos equivalentes según el período seleccionado.",
  orders_paid:
    "Pedidos pagados cuenta solo los pedidos confirmados como pagados dentro del período seleccionado. No incluye pedidos pendientes o no pagados.",
  avg_ticket:
    "Ticket promedio se calcula dividiendo las ventas totales entre los pedidos pagados del período. Mide cuánto gasta en promedio cada cliente por pedido pagado.",
  unique_customers:
    "Clientes únicos cuenta la cantidad de contactos distintos que hicieron pedidos pagados dentro del período. Si un cliente hizo varios pedidos, cuenta una sola vez."
};

const WEEK_DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"] as const;

function formatCurrency(amount: number, currency = "BOB") {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-BO", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short"
  }).format(value);
}

function formatWeekdayDate(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("es-BO", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }

  return formatNumber(value);
}

function formatOrdersLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "pedido" : "pedidos"}`;
}

function formatUnitsLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "unidad" : "unidades"}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getRecordNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function getRecordText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getTenantName(tenant: DashboardSummaryResponse["tenant"]) {
  if (typeof tenant === "string") {
    return tenant;
  }

  return tenant.restaurant_name || tenant.name || tenant.tenant_id || "Dashboard";
}

function getTenantCurrency(
  tenant: DashboardSummaryResponse["tenant"],
  metadata: DashboardSummaryResponse["metadata"]
) {
  if (typeof tenant !== "string" && typeof tenant.currency === "string" && tenant.currency) {
    return tenant.currency;
  }

  if (metadata && typeof metadata.currency === "string" && metadata.currency) {
    return metadata.currency;
  }

  return "BOB";
}

function formatDeltaPercent(value: number | undefined) {
  if (value === undefined) {
    return "sin referencia";
  }

  if (value === 0) {
    return "0%";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)}%`;
}

function getSentiment(value: unknown): "positive" | "negative" | "neutral" {
  return value === "positive" || value === "negative" || value === "neutral" ? value : "neutral";
}

function formatComparisonMetric(
  key: DashboardKpiCard["key"],
  value: number,
  currency: string
) {
  if (key === "sales_total" || key === "avg_ticket") {
    return formatCurrency(value, currency);
  }

  return formatCompactNumber(value);
}

function buildComparisonItems(
  kpiKey: DashboardKpiCard["key"],
  comparisons: DashboardKpiComparison[] | undefined,
  currency: string
) {
  return (comparisons ?? []).map((comparison, index) => {
    const currentValue = toNumber(comparison.current_value) ?? 0;
    const referenceValue = toNumber(comparison.reference_value) ?? 0;
    const deltaPercent = toNumber(comparison.delta_percent);
    const maxValue = Math.max(currentValue, referenceValue, 1);

    return {
      id: comparison.key?.trim() || `${kpiKey}-${index + 1}`,
      label: comparison.label?.trim() || "Comparacion",
      deltaText: formatDeltaPercent(deltaPercent),
      sentiment: getSentiment(comparison.sentiment),
      currentValueLabel: formatComparisonMetric(kpiKey, currentValue, currency),
      referenceValueLabel: formatComparisonMetric(kpiKey, referenceValue, currency),
      currentWidth: currentValue > 0 ? (currentValue / maxValue) * 100 : 0,
      referenceWidth: referenceValue > 0 ? (referenceValue / maxValue) * 100 : 0
    };
  });
}

function buildKpiCards(
  kpis: DashboardKpis,
  comparisons: DashboardKpiComparisonMap | null | undefined,
  currency: string
): DashboardKpiCard[] {
  const totalSales =
    getRecordNumber(kpis as Record<string, unknown>, [
      "total_sales",
      "gross_sales",
      "sales_total",
      "total_revenue",
      "paid_amount"
    ]) ?? 0;
  const paidOrders =
    getRecordNumber(kpis as Record<string, unknown>, [
      "paid_orders",
      "orders_paid",
      "completed_orders"
    ]) ?? 0;
  const averageTicket =
    getRecordNumber(kpis as Record<string, unknown>, [
      "avg_ticket",
      "average_ticket",
      "ticket_average"
    ]) ?? 0;
  const uniqueCustomers =
    getRecordNumber(kpis as Record<string, unknown>, [
      "unique_customers",
      "customers_unique",
      "customers_total"
    ]) ?? 0;

  return [
    {
      key: "sales_total",
      label: "Ventas totales",
      value: formatCurrency(totalSales, currency),
      methodology: KPI_METHODOLOGY.sales_total,
      comparisons: buildComparisonItems("sales_total", comparisons?.sales_total, currency),
      tone: "primary"
    },
    {
      key: "orders_paid",
      label: "Pedidos pagados",
      value: formatNumber(paidOrders),
      methodology: KPI_METHODOLOGY.orders_paid,
      comparisons: buildComparisonItems("orders_paid", comparisons?.orders_paid, currency)
    },
    {
      key: "avg_ticket",
      label: "Ticket promedio",
      value: formatCurrency(averageTicket, currency),
      methodology: KPI_METHODOLOGY.avg_ticket,
      comparisons: buildComparisonItems("avg_ticket", comparisons?.avg_ticket, currency)
    },
    {
      key: "unique_customers",
      label: "Clientes unicos",
      value: formatNumber(uniqueCustomers),
      methodology: KPI_METHODOLOGY.unique_customers,
      comparisons: buildComparisonItems("unique_customers", comparisons?.unique_customers, currency)
    }
  ];
}

function normalizeSeries(items: DashboardSeriesPoint[], fallbackLabel: string) {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    const label =
      getRecordText(record, ["label", "date", "day", "hour", "time"]) || `${fallbackLabel} ${index + 1}`;
    const value =
      getRecordNumber(record, ["value", "sales", "total", "revenue", "amount", "count", "orders"]) ?? 0;

    return { label, value };
  });
}

function getWeekdayIndexFromLabel(label: string) {
  const normalized = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.startsWith("lun")) return 0;
  if (normalized.startsWith("mar")) return 1;
  if (normalized.startsWith("mie") || normalized.startsWith("mer")) return 2;
  if (normalized.startsWith("jue")) return 3;
  if (normalized.startsWith("vie")) return 4;
  if (normalized.startsWith("sab")) return 5;
  if (normalized.startsWith("dom")) return 6;

  return undefined;
}

function getWeekdayIndexFromRecord(record: Record<string, unknown>) {
  const dateText = getRecordText(record, ["date"]);

  if (dateText) {
    const date = new Date(dateText);
    if (!Number.isNaN(date.getTime())) {
      const day = date.getDay();
      return day === 0 ? 6 : day - 1;
    }
  }

  const label = getRecordText(record, ["label", "day"]);
  return label ? getWeekdayIndexFromLabel(label) : undefined;
}

function normalizeSalesByDayChart(items: DashboardSeriesPoint[], period: DashboardPeriodKey): DashboardPeriodChartRow[] {
  const normalized = items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["date", "label", "day"]) || `period-row-${index + 1}`,
      label: getRecordText(record, ["label", "date", "day"]) || `Dia ${index + 1}`,
      sales: getRecordNumber(record, ["sales", "total", "revenue", "amount", "value"]) ?? 0,
      orders: getRecordNumber(record, ["orders_paid", "paid_orders", "orders", "count"]) ?? 0,
      weekdayIndex: getWeekdayIndexFromRecord(record)
    };
  });

  if (period !== "this_week") {
    return normalized.map(({ id, label, sales, orders }) => ({ id, label, sales, orders }));
  }

  return WEEK_DAY_LABELS.map((label, index) => {
    const match = normalized.find((item) => item.weekdayIndex === index);

    return {
      id: `weekday-${label}`,
      label,
      sales: match?.sales ?? 0,
      orders: match?.orders ?? 0
    };
  });
}

function parseHourLabel(label: string) {
  const match = label.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.POSITIVE_INFINITY;
  }

  return hours * 60 + minutes;
}

function normalizeSalesByHourChart(items: DashboardSeriesPoint[]): DashboardHourlyChartRow[] {
  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      return {
        id: getRecordText(record, ["label", "hour", "time"]) || `hour-${index + 1}`,
        label: getRecordText(record, ["label", "hour", "time"]) || `Hora ${index + 1}`,
        sales: getRecordNumber(record, ["sales", "total", "revenue", "amount", "value"]) ?? 0,
        orders: getRecordNumber(record, ["orders_paid", "paid_orders", "orders", "count"]) ?? 0
      };
    })
    .sort((left, right) => parseHourLabel(left.label) - parseHourLabel(right.label));
}

function getHourlyAnalysisInfo(period: DashboardPeriodKey) {
  if (period === "today") {
    return "Este análisis muestra las ventas pagadas y la cantidad de pedidos pagados por hora del día. Los montos están expresados en Bs.";
  }

  if (period === "this_week") {
    return "Este análisis muestra cómo se distribuyen las ventas pagadas y pedidos pagados por hora durante la semana seleccionada. Los montos están expresados en Bs.";
  }

  return "Este análisis muestra cómo se distribuyen las ventas pagadas y pedidos pagados por hora durante el mes en curso. Los montos están expresados en Bs.";
}

function normalizeTopProducts(items: DashboardTopProduct[]) {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["sku", "name", "product_name", "title"]) || `product-${index + 1}`,
      name: getRecordText(record, ["name", "product_name", "title", "sku"]) || "Producto",
      category: getRecordText(record, ["category", "category_name", "label"]) || "",
      revenue: getRecordNumber(record, ["revenue", "sales", "total", "amount"]) ?? 0,
      units: getRecordNumber(record, ["quantity", "units", "count", "orders"]) ?? 0
    };
  });
}

function normalizeCategories(items: DashboardCategory[]) {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["name", "category", "label"]) || `category-${index + 1}`,
      name: getRecordText(record, ["name", "category", "label"]) || "Categoria",
      value:
        getRecordNumber(record, ["revenue", "sales", "total", "amount", "quantity", "units", "orders", "count"]) ??
        0
    };
  });
}

function normalizeTopCustomers(items: DashboardTopCustomer[]) {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["phone", "customer_phone", "name", "customer_name"]) || `customer-${index + 1}`,
      name: getRecordText(record, ["name", "customer_name", "phone", "customer_phone"]) || "Cliente",
      total: getRecordNumber(record, ["total", "total_spent", "revenue", "orders", "count"]) ?? 0
    };
  });
}

function normalizeSurveyHistogram(survey: DashboardSummaryResponse["survey_summary"]) {
  if (!survey) {
    return [];
  }

  return [1, 2, 3, 4, 5].map((rating) => ({
    label: `${rating}`,
    value: toNumber(survey.general_stars_hist[String(rating)]) ?? 0
  }));
}

function normalizeInsights(insights: DashboardInsight[]) {
  return insights
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      return entry.message?.trim() || entry.body?.trim() || entry.title?.trim() || "";
    })
    .filter(Boolean);
}

function formatGeneratedAt(value?: string) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0%";
  }

  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)}%`;
}

function getSalesGoalTitle(period: DashboardPeriodKey) {
  if (period === "today") {
    return "Objetivo de ventas de hoy";
  }

  if (period === "this_week") {
    return "Objetivo de ventas semanal";
  }

  return "Objetivo de ventas mensual";
}

function getSalesGoalToneClassName(achievementPercent: number | null | undefined) {
  if (achievementPercent === null || achievementPercent === undefined || !Number.isFinite(achievementPercent)) {
    return "dashboard-sales-goal-fill--danger";
  }

  if (achievementPercent >= 100) {
    return "dashboard-sales-goal-fill--success";
  }

  if (achievementPercent >= 70) {
    return "dashboard-sales-goal-fill--near";
  }

  if (achievementPercent >= 40) {
    return "dashboard-sales-goal-fill--warning";
  }

  return "dashboard-sales-goal-fill--danger";
}

function getPeriodChartTitle(period: DashboardPeriodKey) {
  return period === "this_week" ? "Comportamiento de la semana" : "Comportamiento del mes";
}

function getPeriodChartInfo(period: DashboardPeriodKey) {
  if (period === "this_week") {
    return "Este gráfico muestra las ventas pagadas y la cantidad de pedidos pagados por día de la semana. Los montos están expresados en Bs. Los días sin actividad se muestran con Bs 0 y 0 pedidos.";
  }

  return "Este gráfico muestra las ventas pagadas y la cantidad de pedidos pagados durante el mes en curso según los datos disponibles. Los montos están expresados en Bs. Solo se consideran pedidos confirmados como pagados.";
}

function resolveContextDate(metadata: DashboardSummaryResponse["metadata"]) {
  const generatedAt = metadata?.generated_at;

  if (generatedAt) {
    const date = new Date(generatedAt);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return new Date();
}

function buildPeriodContext(period: DashboardPeriodKey, metadata: DashboardSummaryResponse["metadata"]): DashboardPeriodContext {
  const contextDate = resolveContextDate(metadata);

  if (period === "today") {
    const minutesElapsed = contextDate.getHours() * 60 + contextDate.getMinutes();

    return {
      title: "Analisis de rendimiento hasta esta hora",
      description:
        "El analisis considera los resultados acumulados de hoy hasta la hora actual. Las comparaciones se hacen contra otros dias usando esta misma hora de corte, para evitar comparar un dia parcial contra un dia completo.",
      note:
        "En Hoy, las referencias se calculan hasta la misma hora actual. Por ejemplo: hoy hasta las 15:00 vs ayer hasta las 15:00.",
      progressPercent: (minutesElapsed / (24 * 60)) * 100,
      progressStartLabel: "00:00",
      progressCurrentLabel: formatTime(contextDate),
      progressEndLabel: "23:59",
      progressCaption: `Calculado hasta: ${formatTime(contextDate)}`
    };
  }

  if (period === "this_week") {
    const day = contextDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(contextDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(contextDate.getDate() + mondayOffset);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const totalMs = weekEnd.getTime() - weekStart.getTime();
    const elapsedMs = Math.max(0, contextDate.getTime() - weekStart.getTime());

    return {
      title: "Analisis de rendimiento hasta hoy",
      description:
        "El analisis considera los resultados acumulados de esta semana hasta hoy. Las comparaciones usan el mismo avance semanal, por ejemplo esta semana hasta hoy contra la semana anterior hasta este mismo dia.",
      note:
        "En Esta semana, las referencias se calculan hasta el mismo avance semanal. Por ejemplo: esta semana hasta martes vs semana anterior hasta martes.",
      progressPercent: totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0,
      progressStartLabel: formatWeekdayDate(weekStart),
      progressCurrentLabel: formatWeekdayDate(contextDate),
      progressEndLabel: formatWeekdayDate(weekEnd),
      progressCaption: `Corte actual: ${formatWeekdayDate(contextDate)}`
    };
  }

  const monthStart = new Date(contextDate.getFullYear(), contextDate.getMonth(), 1);
  const monthEnd = new Date(contextDate.getFullYear(), contextDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const totalMs = monthEnd.getTime() - monthStart.getTime();
  const elapsedMs = Math.max(0, contextDate.getTime() - monthStart.getTime());

  return {
    title: "Analisis de rendimiento hasta la fecha",
    description:
      "El analisis considera los resultados acumulados desde el inicio del mes hasta la fecha actual. Las comparaciones usan el mismo avance del mes, para evitar comparar un mes parcial contra un mes completo.",
    note:
      "En Mes en curso, las referencias se calculan hasta el mismo avance del mes. Por ejemplo: 1 al 12 de este mes vs 1 al 12 del mes anterior.",
    progressPercent: totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0,
    progressStartLabel: formatShortDate(monthStart),
    progressCurrentLabel: formatShortDate(contextDate),
    progressEndLabel: formatShortDate(monthEnd),
    progressCaption: `Corte actual: ${formatWeekdayDate(contextDate)}`
  };
}

export function DashboardScreen() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenant_id")?.trim() || "";
  const token = searchParams.get("token")?.trim() || "";
  const periodFromUrl = (searchParams.get("period")?.trim() as DashboardPeriodKey | null) || null;
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodKey>(periodFromUrl || "month_to_date");
  const [openMethodology, setOpenMethodology] = useState<Record<string, boolean>>({});
  const [isPeriodChartInfoOpen, setIsPeriodChartInfoOpen] = useState(false);
  const [isHourlyAnalysisInfoOpen, setIsHourlyAnalysisInfoOpen] = useState(false);
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (periodFromUrl) {
      setSelectedPeriod(periodFromUrl);
    }
  }, [periodFromUrl]);

  useEffect(() => {
    if (!tenantId || !token) {
      setIsLoading(false);
      setError(!tenantId ? "Falta tenant_id en la URL del dashboard." : "Falta token en la URL del dashboard.");
      setData(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    fetchDashboardSummary({
      tenantId,
      period: selectedPeriod,
      token
    })
      .then((payload) => {
        if (!active) {
          return;
        }

        setData(payload);
        setIsLoading(false);
      })
      .catch((nextError: Error) => {
        if (!active) {
          return;
        }

        setError(nextError.message);
        setData(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPeriod, tenantId, token]);

  const currency = getTenantCurrency(data?.tenant ?? "Dashboard", data?.metadata ?? null);
  const kpiCards = useMemo(
    () => buildKpiCards(data?.kpis ?? {}, data?.kpi_comparisons ?? null, currency),
    [currency, data?.kpi_comparisons, data?.kpis]
  );
  const periodChartRows = useMemo(
    () => normalizeSalesByDayChart(data?.sales_by_day ?? [], selectedPeriod),
    [data?.sales_by_day, selectedPeriod]
  );
  const salesByHour = useMemo(() => normalizeSalesByHourChart(data?.sales_by_hour ?? []), [data?.sales_by_hour]);
  const topProducts = useMemo(() => normalizeTopProducts(data?.top_products ?? []), [data?.top_products]);
  const categories = useMemo(() => normalizeCategories(data?.categories ?? []), [data?.categories]);
  const topCustomers = useMemo(
    () =>
      normalizeTopCustomers(
        data?.customers_summary?.top_customers ?? data?.customers_summary?.customers ?? []
      ),
    [data?.customers_summary]
  );
  const surveyHistogram = useMemo(
    () => normalizeSurveyHistogram(data?.survey_summary ?? null),
    [data?.survey_summary]
  );
  const insights = useMemo(() => normalizeInsights(data?.insights ?? []), [data?.insights]);
  const periodContext = useMemo(
    () => buildPeriodContext(selectedPeriod, data?.metadata ?? null),
    [data?.metadata, selectedPeriod]
  );
  const salesGoal = data?.sales_goal ?? null;
  const clampedProgressPercent = Math.min(Math.max(periodContext.progressPercent, 0), 100);
  const salesGoalTarget = toNumber(salesGoal?.target_amount);
  const salesGoalCurrent = toNumber(salesGoal?.current_amount) ?? 0;
  const salesGoalRemaining = toNumber(salesGoal?.remaining_amount);
  const salesGoalAchievement = toNumber(salesGoal?.achievement_percent);
  const salesGoalIsConfigured =
    Boolean(salesGoal) && salesGoal?.status !== "not_configured" && salesGoalTarget !== undefined && salesGoalTarget > 0;
  const salesGoalProgressPercent =
    salesGoalAchievement !== undefined && Number.isFinite(salesGoalAchievement)
      ? Math.min(Math.max(salesGoalAchievement, 0), 100)
      : salesGoalTarget && salesGoalTarget > 0
        ? Math.min(Math.max((salesGoalCurrent / salesGoalTarget) * 100, 0), 100)
        : 0;
  const salesGoalOverTarget =
    salesGoalTarget !== undefined && salesGoalCurrent > salesGoalTarget ? salesGoalCurrent - salesGoalTarget : 0;
  const salesGoalToneClassName = getSalesGoalToneClassName(salesGoalAchievement);
  const displayPeriodLabel =
    data?.period?.label || PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.label || selectedPeriod;
  const periodRangeText = data?.period?.range_text?.trim() || "";
  const surveyAverage = toNumber(data?.survey_summary?.general_stars_avg) ?? 0;
  const surveyTotalAnswers = toNumber(data?.survey_summary?.total_answers) ?? 0;
  const surveyUniqueResponses = toNumber(data?.survey_summary?.total_unique_responses) ?? 0;
  const currentProgressLabelClassName = [
    "dashboard-period-progress-label-current",
    clampedProgressPercent <= 10 ? "dashboard-period-progress-label-current--start" : "",
    clampedProgressPercent >= 90 ? "dashboard-period-progress-label-current--end" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const maxPeriodChartSales = Math.max(...periodChartRows.map((item) => item.sales), 1);
  const maxSalesByHour = Math.max(...salesByHour.map((item) => item.sales), 1);
  const maxCategoryValue = Math.max(...categories.map((item) => item.value), 1);
  const maxSurveyValue = Math.max(...surveyHistogram.map((item) => item.value), 1);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState title="No pudimos cargar el dashboard" message={error} />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <EmptyState
          title="No hay datos del dashboard"
          message="No encontramos informacion para el periodo seleccionado."
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <div className="dashboard-shell">
        <section className="dashboard-header">
          <div className="dashboard-header-copy">
            <p className="eyebrow">Dashboard</p>
            <h1>{getTenantName(data.tenant)}</h1>
            <p className="dashboard-subtitle">Resumen operativo del negocio para tomar decisiones rapidas.</p>
          </div>
          <div className="dashboard-header-meta">
            <span className="dashboard-period-chip">
              {displayPeriodLabel}
            </span>
            <span className="dashboard-updated-at">
              Actualizado: {formatGeneratedAt(data.metadata?.generated_at)}
            </span>
            {periodRangeText ? <span className="dashboard-updated-at">Periodo: {periodRangeText}</span> : null}
          </div>
        </section>

        <section className="dashboard-periods" aria-label="Selector de periodo">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dashboard-period-button ${selectedPeriod === option.value ? "dashboard-period-button-active" : ""}`}
              onClick={() => setSelectedPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </section>

        <section className="dashboard-card dashboard-period-context">
          <div className="dashboard-period-context-header">
            <div>
              <p className="eyebrow">Contexto del periodo</p>
              <h2>{periodContext.title}</h2>
            </div>
            <span className="dashboard-period-context-caption">{periodContext.progressCaption}</span>
          </div>
          <div className="dashboard-period-progress">
            <div className="dashboard-period-progress-track">
              <div
                className="dashboard-period-progress-fill"
                style={{ width: `${clampedProgressPercent}%` }}
              />
            </div>
            <div className="dashboard-period-progress-labels">
              <span className="dashboard-period-progress-label-start">{periodContext.progressStartLabel}</span>
              <span
                className={currentProgressLabelClassName}
                style={{ left: `${clampedProgressPercent}%` }}
              >
                {periodContext.progressCurrentLabel}
              </span>
              <span className="dashboard-period-progress-label-end">{periodContext.progressEndLabel}</span>
            </div>
          </div>
          <div className="dashboard-period-context-copy">
            <p>{periodContext.description}</p>
            <p>{periodContext.note}</p>
          </div>
        </section>

        <section className="dashboard-kpi-grid">
          {kpiCards.map((card) => (
            <article
              key={card.key}
              className={`dashboard-card dashboard-kpi-card ${card.tone === "primary" ? "dashboard-kpi-card-primary" : ""}`}
            >
              <div className="dashboard-kpi-topline">
                <span className="dashboard-kpi-label">{card.label}</span>
                <button
                  type="button"
                  className="dashboard-kpi-info-button"
                  aria-label={`Explicacion metodologica de ${card.label}`}
                  aria-expanded={openMethodology[card.key] ? "true" : "false"}
                  onClick={() =>
                    setOpenMethodology((current) => ({
                      ...current,
                      [card.key]: !current[card.key]
                    }))
                  }
                >
                  i
                </button>
              </div>
              <strong className="dashboard-kpi-value">{card.value}</strong>
              {openMethodology[card.key] ? (
                <div className="dashboard-kpi-methodology">
                  <p>{card.methodology}</p>
                  <p>{periodContext.note}</p>
                </div>
              ) : null}
              {card.comparisons.length > 0 ? (
                <div className="dashboard-kpi-comparisons">
                  {card.comparisons.map((comparison) => (
                    <div key={comparison.id} className="dashboard-kpi-comparison">
                      <div className="dashboard-kpi-comparison-head">
                        <span>{comparison.label}</span>
                        <strong
                          className={`dashboard-kpi-delta dashboard-kpi-delta--${comparison.sentiment}`}
                        >
                          {comparison.deltaText}
                        </strong>
                      </div>
                      <div className="dashboard-mini-bars" aria-label={`Comparacion ${comparison.label}`}>
                        <div className="dashboard-mini-bar-row">
                          <span>Actual</span>
                          <div className="dashboard-mini-bar-track">
                            <div
                              className="dashboard-mini-bar-fill dashboard-mini-bar-fill--actual"
                              style={{ width: `${comparison.currentWidth}%` }}
                            />
                          </div>
                          <strong>{comparison.currentValueLabel}</strong>
                        </div>
                        <div className="dashboard-mini-bar-row">
                          <span>Ref.</span>
                          <div className="dashboard-mini-bar-track">
                            <div
                              className="dashboard-mini-bar-fill dashboard-mini-bar-fill--reference"
                              style={{ width: `${comparison.referenceWidth}%` }}
                            />
                          </div>
                          <strong>{comparison.referenceValueLabel}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <section className="dashboard-card dashboard-sales-goal">
          {salesGoalIsConfigured && salesGoalTarget !== undefined ? (
            <>
              <div className="dashboard-sales-goal-header">
                <p className="eyebrow">Meta comercial</p>
                <h2 className="dashboard-sales-goal-title">{getSalesGoalTitle(selectedPeriod)}</h2>
              </div>
              <div className="dashboard-sales-goal-body">
                <div className="dashboard-sales-goal-main">
                  <strong>{`${formatCurrency(salesGoalCurrent, currency)} vendidos de ${formatCurrency(salesGoalTarget, currency)}`}</strong>
                  <span>{`${formatPercentage(salesGoalAchievement)} cumplido`}</span>
                </div>
                <div className="dashboard-sales-goal-progress">
                  <div className="dashboard-sales-goal-track">
                    <div
                      className={`dashboard-sales-goal-fill ${salesGoalToneClassName}`}
                      style={{ width: `${salesGoalProgressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="dashboard-sales-goal-meta">
                  {salesGoal?.status === "achieved" ? (
                    <>
                      <strong>Meta alcanzada</strong>
                      {salesGoalOverTarget > 0 ? (
                        <span>{`${formatCurrency(salesGoalOverTarget, currency)} por encima del objetivo`}</span>
                      ) : null}
                    </>
                  ) : (
                    <span>
                      {salesGoalRemaining !== undefined && salesGoalRemaining !== null
                        ? `Faltan ${formatCurrency(salesGoalRemaining, currency)} para llegar a la meta`
                        : "Meta en seguimiento"}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-sales-goal-empty">
              <p className="eyebrow">Meta comercial</p>
              <h2 className="dashboard-sales-goal-title">Objetivo de ventas no configurado</h2>
              <p>
                Configura una meta de ventas desde el panel admin para comparar el rendimiento de este período
                contra tu objetivo.
              </p>
            </div>
          )}
        </section>

        <section className="dashboard-grid">
          {selectedPeriod !== "today" ? (
            <article className="dashboard-card dashboard-panel dashboard-period-chart">
              <div className="dashboard-period-chart-header">
                <div>
                  <p className="eyebrow">
                    {selectedPeriod === "this_week" ? "Semana" : "Mes en curso"}
                  </p>
                  <h2 className="dashboard-period-chart-title">{getPeriodChartTitle(selectedPeriod)}</h2>
                </div>
                <button
                  type="button"
                  className="dashboard-period-chart-info-button"
                  aria-label="Explicacion del grafico de comportamiento"
                  aria-expanded={isPeriodChartInfoOpen ? "true" : "false"}
                  onClick={() => setIsPeriodChartInfoOpen((current) => !current)}
                >
                  i
                </button>
              </div>
              {isPeriodChartInfoOpen ? (
                <div className="dashboard-period-chart-info">
                  <p>{getPeriodChartInfo(selectedPeriod)}</p>
                </div>
              ) : null}
              {periodChartRows.length === 0 ? (
                <p className="dashboard-empty-copy">
                  Aun no hay datos de comportamiento para este periodo.
                </p>
              ) : (
                <div className="dashboard-period-bars" aria-label={getPeriodChartTitle(selectedPeriod)}>
                  {periodChartRows.map((item) => (
                    <div key={item.id} className="dashboard-period-bar-row">
                      <div className="dashboard-period-bar-label">
                        <strong>{item.label}</strong>
                        <span className="dashboard-period-bar-orders">{formatOrdersLabel(item.orders)}</span>
                      </div>
                      <div className="dashboard-period-bar-track">
                        <div
                          className="dashboard-period-bar-fill"
                          style={{ width: `${Math.max((item.sales / maxPeriodChartSales) * 100, item.sales > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                      <div className="dashboard-period-bar-meta">
                        <strong className="dashboard-period-bar-sales">{formatCurrency(item.sales, currency)}</strong>
                        <span className="dashboard-period-bar-orders">{formatOrdersLabel(item.orders)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ) : null}

          <article className="dashboard-card dashboard-panel dashboard-hourly-analysis">
            <div className="dashboard-hourly-header">
              <div>
                <p className="eyebrow">Horas</p>
                <h2 className="dashboard-hourly-title">Analisis horario</h2>
              </div>
              <button
                type="button"
                className="dashboard-hourly-info-button"
                aria-label="Explicacion del analisis horario"
                aria-expanded={isHourlyAnalysisInfoOpen ? "true" : "false"}
                onClick={() => setIsHourlyAnalysisInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isHourlyAnalysisInfoOpen ? (
              <div className="dashboard-hourly-info">
                <p>{getHourlyAnalysisInfo(selectedPeriod)}</p>
              </div>
            ) : null}
            {salesByHour.length === 0 ? (
              <p className="dashboard-empty-copy">Aun no hay ventas por hora para este periodo.</p>
            ) : (
              <div className="dashboard-hourly-scroll">
                <div className="dashboard-hourly-bars" aria-label="Analisis horario">
                  {salesByHour.map((item) => (
                    <div key={item.id} className="dashboard-hourly-column">
                      <div className="dashboard-hourly-meta">
                        <strong className="dashboard-hourly-sales">{formatCurrency(item.sales, currency)}</strong>
                        <span className="dashboard-hourly-orders">{formatOrdersLabel(item.orders)}</span>
                      </div>
                      <div className="dashboard-hourly-bar-wrap">
                        <div
                          className="dashboard-hourly-bar"
                          style={{ height: `${Math.max((item.sales / maxSalesByHour) * 100, item.sales > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="dashboard-hourly-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Top productos</p>
              <h2>Lo mas vendido</h2>
            </div>
            {topProducts.length === 0 ? (
              <p className="dashboard-empty-copy">Todavía no hay productos vendidos en este período.</p>
            ) : (
              <div className="dashboard-top-product-list">
                {topProducts.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="dashboard-top-product-item">
                    <span className="dashboard-top-product-rank" aria-hidden="true">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </span>
                    <div className="dashboard-top-product-main">
                      <strong className="dashboard-top-product-name">{item.name}</strong>
                      {item.category ? (
                        <span className="dashboard-top-product-category">{item.category}</span>
                      ) : null}
                    </div>
                    <div className="dashboard-top-product-metrics">
                      <strong className="dashboard-top-product-sales">
                        {formatCurrency(item.revenue, currency)}
                      </strong>
                      <span className="dashboard-top-product-units">{formatUnitsLabel(item.units)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Categorias</p>
              <h2>Participacion por rubro</h2>
            </div>
            {categories.length === 0 ? (
              <p className="dashboard-empty-copy">Aun no hay categorias con actividad.</p>
            ) : (
              <div className="dashboard-category-list">
                {categories.map((item) => (
                  <div key={item.id} className="dashboard-category-row">
                    <div className="dashboard-category-copy">
                      <strong>{item.name}</strong>
                      <span>{formatNumber(item.value)}</span>
                    </div>
                    <div className="dashboard-category-track">
                      <div
                        className="dashboard-category-fill"
                        style={{ width: `${Math.max((item.value / maxCategoryValue) * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Clientes</p>
              <h2>Actividad de clientes</h2>
            </div>
            <div className="dashboard-stat-stack">
              <div className="dashboard-mini-stat">
                <span>Total clientes</span>
                <strong>
                  {formatNumber(
                    toNumber(
                      data.customers_summary?.total_customers ?? data.customers_summary?.unique_customers
                    ) ?? 0
                  )}
                </strong>
              </div>
              <div className="dashboard-mini-stat">
                <span>Clientes recurrentes</span>
                <strong>
                  {formatNumber(
                    toNumber(
                      data.customers_summary?.repeat_customers ?? data.customers_summary?.returning_customers
                    ) ?? 0
                  )}
                </strong>
              </div>
            </div>
            {topCustomers.length > 0 ? (
              <div className="dashboard-ranked-list">
                {topCustomers.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="dashboard-ranked-row">
                    <span className="dashboard-rank-badge">{index + 1}</span>
                    <div className="dashboard-ranked-copy">
                      <strong>{item.name}</strong>
                    </div>
                    <strong className="dashboard-ranked-value">{formatNumber(item.total)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty-copy">Todavia no hay top customers disponibles.</p>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Encuestas</p>
              <h2>Satisfaccion reciente</h2>
            </div>
            <div className="dashboard-stat-stack">
              <div className="dashboard-mini-stat">
                <span>Promedio general</span>
                <strong>{surveyAverage.toFixed(1)}</strong>
              </div>
              <div className="dashboard-mini-stat">
                <span>Total respuestas</span>
                <strong>{formatNumber(surveyTotalAnswers)}</strong>
              </div>
              <div className="dashboard-mini-stat">
                <span>Respuestas unicas</span>
                <strong>{formatNumber(surveyUniqueResponses)}</strong>
              </div>
            </div>
            {surveyTotalAnswers > 0 && surveyHistogram.some((item) => item.value > 0) ? (
              <div className="dashboard-horizontal-list">
                {surveyHistogram.map((item) => (
                  <div key={item.label} className="dashboard-horizontal-row">
                    <span className="dashboard-horizontal-label">{item.label} estrellas</span>
                    <div className="dashboard-horizontal-track">
                      <div
                        className="dashboard-horizontal-fill"
                        style={{ width: `${Math.max((item.value / maxSurveyValue) * 100, 6)}%` }}
                      />
                    </div>
                    <strong className="dashboard-horizontal-value">{formatNumber(item.value)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty-copy">No hay respuestas de encuesta para este periodo.</p>
            )}
          </article>
        </section>

        <article className="dashboard-card dashboard-panel">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">Insights</p>
            <h2>Lecturas rapidas del negocio</h2>
          </div>
          {insights.length === 0 ? (
            <p className="dashboard-empty-copy">No hay insights disponibles para este periodo.</p>
          ) : (
            <ul className="dashboard-insight-list">
              {insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </PageShell>
  );
}
