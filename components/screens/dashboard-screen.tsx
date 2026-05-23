"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageShell } from "@/components/shared/page-shell";
import { fetchDashboardOrdersDetail, fetchDashboardSummary } from "@/services/dashboard-api";
import type {
  CustomerOrderTypeDistribution,
  DashboardCategory,
  DashboardInsight,
  DashboardKpiComparison,
  DashboardKpiComparisonMap,
  DashboardKpis,
  DashboardOrdersDetailResponse,
  OrderItemCountDistribution,
  DashboardOrderDetailRow,
  DashboardPeriodSelection,
  DashboardPeriodKey,
  DashboardSeriesPoint,
  DashboardSurveyQuestionSummary,
  DashboardSurveyQuestionTrend,
  DashboardSurveyTrendPoint,
  DashboardSummaryResponse,
  DashboardTopProduct,
  TopOrderCombination,
  TopRecurrentCustomer
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
  isCurrent: boolean;
  isClosed: boolean;
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

type DashboardCategorySlice = {
  id: string;
  label: string;
  sales: number;
  orders: number;
  percent: number;
  color: string;
};

type DashboardOrderDistributionSlice = {
  id: string;
  label: string;
  orders: number;
  percent: number;
  color: string;
};

type DashboardCombinationRow = {
  id: string;
  label: string;
  orders: number;
  sales?: number;
  percent: number;
};

type DashboardCustomerOrderSlice = {
  id: string;
  label: string;
  orders: number;
  percent: number;
  color: string;
};

type DashboardRecurrentCustomerRow = {
  id: string;
  name: string;
  orders: number;
  totalSpent: number;
  lastPurchaseLabel?: string;
};

type DashboardSurveyTrendRow = {
  id: string;
  label: string;
  avg: number | null;
  count: number;
};

type DashboardSurveyQuestionCard = {
  id: string;
  title: string;
  average: number | null;
  count: number;
  trend: DashboardSurveyTrendRow[];
  hasResponses: boolean;
};

type DashboardPaidOrderRow = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  customerName: string;
  customerContact?: string;
  itemsSummary: string;
  paidAmount: number;
  currency?: string;
};

type DashboardHistoricalOption = {
  value: string;
  label: string;
};

const PERIOD_OPTIONS: Array<{ value: DashboardPeriodKey; label: string }> = [
  { value: "today", label: "Diario" },
  { value: "this_week", label: "Semanal" },
  { value: "month_to_date", label: "Mensual" }
];

const KPI_METHODOLOGY: Record<DashboardKpiCard["key"], string> = {
  sales_total:
    "Ventas del periodo suma el monto de los pedidos dentro del período seleccionado. No incluye pedidos creados que todavía no fueron pagados. Las comparaciones usan períodos equivalentes según el período seleccionado.",
  orders_paid:
    "Pedidos del periodo cuenta solo los pedidos del periodo dentro del período seleccionado. No incluye pedidos pendientes o no pagados.",
  avg_ticket:
    "Promedio por pedido se calcula dividiendo las ventas totales entre los pedidos del período. Mide cuánto gasta en promedio cada cliente por pedido.",
  unique_customers:
    "Clientes únicos cuenta la cantidad de contactos distintos que hicieron pedidos dentro del período. Si un cliente hizo varios pedidos, cuenta una sola vez."
};

const WEEK_DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"] as const;
const PIE_COLORS = ["#1d4ed8", "#f59e0b", "#60a5fa", "#94a3b8", "#cbd5e1"] as const;
const CUSTOMER_ORDER_COLORS: Record<string, string> = {
  new: "#60a5fa",
  returning: "#1d4ed8",
  unidentified: "#f59e0b",
  unknown: "#f59e0b"
};

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

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  return addDaysLocal(value, amount);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getLocalWeekStart(value: Date) {
  return startOfWeekMondayLocal(value);
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function formatYmdLocal(value: Date) {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
}

function formatMonthValueLocal(value: Date) {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}`;
}

function parseYmdLocal(value?: string) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDdMmYyyyLocal(value: Date) {
  return `${padDatePart(value.getDate())}/${padDatePart(value.getMonth() + 1)}/${value.getFullYear()}`;
}

function addDaysLocal(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount);
}

function startOfWeekMondayLocal(value: Date) {
  const day = value.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return startOfLocalDay(addDaysLocal(value, offset));
}

function formatDateInputValue(value: Date) {
  return formatYmdLocal(value);
}

function formatMonthInputValue(value: Date) {
  return formatMonthValueLocal(value);
}

function parseDateInputValue(value?: string) {
  return parseYmdLocal(value);
}

function parseMonthInputValue(value?: string) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const date = new Date(year, monthIndex, 1);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex) {
    return null;
  }

  return date;
}

function parseLocalDateLike(value?: string) {
  if (!value) {
    return null;
  }

  return parseYmdLocal(value) || parseYmdLocal(value.slice(0, 10));
}

function isSameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameLocalMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function formatLongMonthYear(value: Date) {
  const formatted = new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric"
  }).format(value);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatSimpleDate(value?: string) {
  if (!value) {
    return "";
  }

  const localDate = parseLocalDateLike(value);
  const date = localDate || new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return localDate ? formatDdMmYyyyLocal(localDate) : formatDdMmYyyyLocal(date);
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

function formatResponsesLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "respuesta" : "respuestas"}`;
}

function formatUnitsLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "unidad" : "unidades"}`;
}

function formatItemCountLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "item" : "items"}`;
}

function formatOrderCountLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "pedido" : "pedidos"}`;
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

function buildPieChartBackground(slices: Array<{ percent: number; color: string }>) {
  const totalPercent = slices.reduce((sum, slice) => sum + Math.max(slice.percent, 0), 0);

  if (totalPercent <= 0 || slices.length === 0) {
    return "conic-gradient(#e2e8f0 0% 100%)";
  }

  let currentStart = 0;
  const segments = slices.map((slice) => {
    const share = (Math.max(slice.percent, 0) / totalPercent) * 100;
    const nextEnd = currentStart + share;
    const segment = `${slice.color} ${currentStart}% ${nextEnd}%`;
    currentStart = nextEnd;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
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
      label: "Ventas del periodo",
      value: formatCurrency(totalSales, currency),
      methodology: KPI_METHODOLOGY.sales_total,
      comparisons: buildComparisonItems("sales_total", comparisons?.sales_total, currency),
      tone: "primary"
    },
    {
      key: "orders_paid",
      label: "Pedidos del periodo",
      value: formatNumber(paidOrders),
      methodology: KPI_METHODOLOGY.orders_paid,
      comparisons: buildComparisonItems("orders_paid", comparisons?.orders_paid, currency)
    },
    {
      key: "avg_ticket",
      label: "Promedio por pedido",
      value: formatCurrency(averageTicket, currency),
      methodology: KPI_METHODOLOGY.avg_ticket,
      comparisons: buildComparisonItems("avg_ticket", comparisons?.avg_ticket, currency)
    },
    {
      key: "unique_customers",
      label: "Clientes del periodo",
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
    const date = parseLocalDateLike(dateText) || new Date(dateText);
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

function getHourlyAnalysisInfo(period: DashboardPeriodKey, isCurrent: boolean) {
  if (period === "today") {
    return "Este análisis muestra las ventas y la cantidad de pedidos por hora del día. Los montos están expresados en Bs.";
  }

  if (period === "this_week") {
    return isCurrent
      ? "Este análisis muestra cómo se distribuyen las ventas y pedidos por hora durante la semana en curso. Los montos están expresados en Bs."
      : "Este análisis muestra cómo se distribuyen las ventas y pedidos por hora durante la semana seleccionada. Los montos están expresados en Bs.";
  }

  return isCurrent
    ? "Este análisis muestra cómo se distribuyen las ventas y pedidos por hora durante el mes en curso. Los montos están expresados en Bs."
    : "Este análisis muestra cómo se distribuyen las ventas y pedidos por hora durante el mes seleccionado. Los montos están expresados en Bs.";
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

function normalizeCategories(items: DashboardCategory[]): DashboardCategorySlice[] {
  const normalized = items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["name", "category", "label"]) || `category-${index + 1}`,
      name: getRecordText(record, ["name", "category", "label"]) || "Categoria",
      sales: getRecordNumber(record, ["sales", "revenue", "total", "amount"]) ?? 0,
      orders: getRecordNumber(record, ["orders", "count"]) ?? 0,
      percent: getRecordNumber(record, ["percent"])
    };
  });

  const totalSales = normalized.reduce((sum, item) => sum + item.sales, 0);

  return normalized
    .map((item, index) => ({
      id: item.id,
      label: item.name,
      sales: item.sales,
      orders: item.orders,
      percent:
        item.percent !== undefined
          ? item.percent
          : totalSales > 0
            ? (item.sales / totalSales) * 100
            : 0,
      color: PIE_COLORS[index % PIE_COLORS.length]
    }))
    .sort((left, right) => right.sales - left.sales);
}

function normalizeOrderItemCountDistribution(
  items: OrderItemCountDistribution[]
): DashboardOrderDistributionSlice[] {
  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const itemCount = getRecordNumber(record, ["item_count"]) ?? 0;

      return {
        id: `order-items-${index + 1}-${itemCount}`,
        label: formatItemCountLabel(itemCount),
        orders: getRecordNumber(record, ["orders_count", "orders", "count"]) ?? 0,
        percent: getRecordNumber(record, ["percent"]) ?? 0,
        color: PIE_COLORS[index % PIE_COLORS.length]
      };
    })
    .sort((left, right) => {
      const leftCount = toNumber(left.label.split(" ")[0]) ?? 0;
      const rightCount = toNumber(right.label.split(" ")[0]) ?? 0;
      return leftCount - rightCount;
    });
}

function normalizeTopOrderCombinations(items: TopOrderCombination[]): DashboardCombinationRow[] {
  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const products = Array.isArray(record.products)
        ? record.products.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];

        return {
        id: `${getRecordText(record, ["label"]) || products.join(" + ") || `combo-${index + 1}`}-${index + 1}`,
        label: getRecordText(record, ["label"]) || products.join(" + ") || "Combinacion",
        orders: getRecordNumber(record, ["orders_count", "orders", "count"]) ?? 0,
        sales: getRecordNumber(record, ["sales", "revenue", "total", "amount"]),
        percent: getRecordNumber(record, ["percent"]) ?? 0
      };
    })
    .sort((left, right) => right.orders - left.orders);
}

function normalizeCustomerOrderTypeDistribution(
  items: CustomerOrderTypeDistribution[]
): DashboardCustomerOrderSlice[] {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    const type = getRecordText(record, ["type"]) || "";
    const label = getRecordText(record, ["label"]) || "Clientes";
    const normalizedLabel = label.toLowerCase();
    return {
      id: `${type || label || `customer-order-${index + 1}`}-${index + 1}`,
      label,
      orders: getRecordNumber(record, ["orders_count", "orders", "count"]) ?? 0,
      percent: getRecordNumber(record, ["percent"]) ?? 0,
      color:
        CUSTOMER_ORDER_COLORS[type] ||
        (normalizedLabel.includes("sin identificar") ? "#f59e0b" : undefined) ||
        PIE_COLORS[index % PIE_COLORS.length]
    };
  });
}

function normalizeTopRecurrentCustomers(items: TopRecurrentCustomer[]): DashboardRecurrentCustomerRow[] {
  return items
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      return {
        id: `${getRecordText(record, ["contact", "name"]) || `recurrent-customer-${index + 1}`}-${index + 1}`,
        name: getRecordText(record, ["name", "contact"]) || "Cliente recurrente",
        orders: getRecordNumber(record, ["orders_count", "orders", "count"]) ?? 0,
        totalSpent: getRecordNumber(record, ["total_spent", "total", "sales", "revenue", "amount"]) ?? 0,
        lastPurchaseLabel: formatSimpleDate(getRecordText(record, ["last_purchase_at"]))
      };
    })
    .sort((left, right) => right.orders - left.orders);
}

function normalizeResumen(insights: DashboardInsight[]) {
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

function formatSurveyScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Sin calificacion";
  }

  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)} ★`;
}

function formatSurveyTrendLabel(
  point: DashboardSurveyTrendPoint | Record<string, unknown>,
  periodGrain: string | undefined
) {
  const record = point as Record<string, unknown>;
  const startText = getRecordText(record, ["start"]);
  const startDate = parseYmdLocal(startText?.slice(0, 10));

  if (periodGrain === "week" && startDate) {
    return `Sem ${padDatePart(startDate.getDate())}/${padDatePart(startDate.getMonth() + 1)}`;
  }

  if (periodGrain === "month" && startDate) {
    const shortMonth = new Intl.DateTimeFormat("es-BO", {
      month: "short"
    })
      .format(startDate)
      .replace(".", "");

    return `${shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1)}/${String(startDate.getFullYear()).slice(-2)}`;
  }

  if (periodGrain === "day" && startDate) {
    return `${padDatePart(startDate.getDate())}/${padDatePart(startDate.getMonth() + 1)}`;
  }

  return getRecordText(record, ["label"]) || "P";
}

function getSurveyChartWidth(pointCount: number, compact = false) {
  const minPointWidth = compact ? 84 : 92;
  const baseWidth = compact ? 340 : 380;
  return Math.max(baseWidth, pointCount * minPointWidth);
}

function normalizeSurveyTrendRows(
  items: DashboardSurveyTrendPoint[] | undefined | null,
  periodGrain?: string
): DashboardSurveyTrendRow[] {
  return (items ?? []).slice(-7).map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: `${getRecordText(record, ["label", "start", "end"]) || `survey-trend-${index + 1}`}-${index + 1}`,
      label: formatSurveyTrendLabel(record, periodGrain) || `P${index + 1}`,
      avg: getRecordNumber(record, ["avg"]) ?? null,
      count: getRecordNumber(record, ["count"]) ?? 0
    };
  });
}

function normalizeSurveyQuestionCards(
  summaryItems: DashboardSurveyQuestionSummary[] | undefined | null,
  trendItems: DashboardSurveyQuestionTrend[] | undefined | null,
  periodGrain?: string
): DashboardSurveyQuestionCard[] {
  const summaryList = Array.isArray(summaryItems) ? summaryItems : [];
  const trendList = Array.isArray(trendItems) ? trendItems : [];
  const summaryMap = new Map<
    string,
    { item: DashboardSurveyQuestionSummary; index: number; orderHint: number }
  >();
  const trendMap = new Map<string, { item: DashboardSurveyQuestionTrend; index: number }>();
  const orderedKeys: string[] = [];

  summaryList.forEach((item, index) => {
    const record = item as Record<string, unknown>;
    const key =
      getRecordText(record, ["question_id", "question_text"]) || `summary-question-${index + 1}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        item,
        index,
        orderHint: getRecordNumber(record, ["order_hint"]) ?? index
      });
      orderedKeys.push(key);
    }
  });

  trendList.forEach((item, index) => {
    const record = item as Record<string, unknown>;
    const key =
      getRecordText(record, ["question_id", "question_text"]) || `trend-question-${index + 1}`;

    trendMap.set(key, { item, index });

    if (!orderedKeys.includes(key)) {
      orderedKeys.push(key);
    }
  });

  return orderedKeys.map((key, index) => {
      const summaryEntry = summaryMap.get(key);
      const trendEntry = trendMap.get(key);
      const summaryRecord = (summaryEntry?.item ?? {}) as Record<string, unknown>;
      const trendRecord = (trendEntry?.item ?? {}) as Record<string, unknown>;
      const count =
        getRecordNumber(trendRecord, ["current_count"]) ??
        getRecordNumber(summaryRecord, ["count", "total_answers"]) ??
        0;

      return {
        id: `${key}-${index + 1}`,
        title:
          getRecordText(trendRecord, ["question_text", "question_id"]) ||
          getRecordText(summaryRecord, ["question_text", "question_id"]) ||
          `Pregunta ${index + 1}`,
        average:
          getRecordNumber(trendRecord, ["current_avg"]) ??
          getRecordNumber(summaryRecord, ["stars_avg", "average"]) ??
          null,
        count,
        trend: normalizeSurveyTrendRows(
          Array.isArray(trendRecord.trend) ? (trendRecord.trend as DashboardSurveyTrendPoint[]) : [],
          periodGrain
        ),
        hasResponses: count > 0
      };
    });
}

function normalizeOrdersDetailRows(items: DashboardOrderDetailRow[] | undefined | null): DashboardPaidOrderRow[] {
  return (items ?? []).map((item, index) => {
    const record = item as Record<string, unknown>;

    return {
      id: getRecordText(record, ["order_id"]) || `paid-order-${index + 1}`,
      dateLabel: getRecordText(record, ["date_label"]) || "Sin fecha",
      timeLabel: getRecordText(record, ["time_label"]) || "",
      customerName: getRecordText(record, ["customer_name"]) || "Cliente sin nombre",
      customerContact: getRecordText(record, ["customer_contact"]),
      itemsSummary: getRecordText(record, ["items_summary"]) || "Pedido sin detalle",
      paidAmount: getRecordNumber(record, ["paid_amount", "amount", "total", "sales"]) ?? 0,
      currency: getRecordText(record, ["currency"])
    };
  });
}

function buildSurveyPolylinePoints(items: DashboardSurveyTrendRow[], width: number, height: number) {
  const validItems = items.filter((item) => item.avg !== null && item.avg !== undefined && Number.isFinite(item.avg));
  if (items.length === 0 || validItems.length === 0) {
    return { segments: [] as string[], points: [] as Array<{ x: number; y: number; label: string; avg: number; count: number }> };
  }

  const paddingX = 12;
  const paddingY = 14;
  const usableWidth = Math.max(width - paddingX * 2, 1);
  const usableHeight = Math.max(height - paddingY * 2, 1);
  const stepX = items.length > 1 ? usableWidth / (items.length - 1) : 0;
  const segments: string[] = [];
  const points: Array<{ x: number; y: number; label: string; avg: number; count: number }> = [];
  let currentSegment = "";

  items.forEach((item, index) => {
    if (item.avg === null || item.avg === undefined || !Number.isFinite(item.avg)) {
      if (currentSegment) {
        segments.push(currentSegment.trim());
        currentSegment = "";
      }
      return;
    }

    const clampedValue = Math.min(Math.max(item.avg, 0), 5);
    const x = paddingX + stepX * index;
    const y = paddingY + (1 - clampedValue / 5) * usableHeight;
    points.push({ x, y, label: item.label, avg: clampedValue, count: item.count });

    currentSegment += currentSegment ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return { segments, points };
}

function hasValidSurveyTrend(items: DashboardSurveyTrendRow[]) {
  return items.some((item) => item.avg !== null && item.avg !== undefined && Number.isFinite(item.avg));
}

function getSalesGoalTitle(period: DashboardPeriodKey) {
  if (period === "today") {
    return "Objetivo de ventas del día";
  }

  if (period === "this_week") {
    return "Objetivo de ventas de la semana";
  }

  return "Objetivo de ventas del mes";
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

function getPeriodChartInfo(period: DashboardPeriodKey, isCurrent: boolean) {
  if (period === "this_week") {
    return isCurrent
      ? "Este gráfico muestra las ventas y la cantidad de pedidos por día de la semana en curso. Los montos están expresados en Bs. Los días sin actividad se muestran con Bs 0 y 0 pedidos."
      : "Este gráfico muestra las ventas y la cantidad de pedidos por día de la semana seleccionada. Los montos están expresados en Bs. Los días sin actividad se muestran con Bs 0 y 0 pedidos.";
  }

  return isCurrent
    ? "Este gráfico muestra las ventas y la cantidad de pedidos durante el mes en curso según los datos disponibles. Los montos están expresados en Bs. Solo se consideran pedidos del periodo."
    : "Este gráfico muestra las ventas y la cantidad de pedidos durante el mes seleccionado según los datos disponibles. Los montos están expresados en Bs. Solo se consideran pedidos del periodo.";
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

function getDailyOptions(referenceDate: Date): DashboardHistoricalOption[] {
  return Array.from({ length: 30 }, (_, index) => {
    const optionDate = addDays(referenceDate, -index);
    const previousDate = addDays(referenceDate, -1);

    return {
      value: formatDateInputValue(optionDate),
      label:
        index === 0
          ? "Hoy"
          : isSameLocalDate(optionDate, previousDate)
            ? "Ayer"
            : formatSimpleDate(formatDateInputValue(optionDate))
    };
  });
}

function getWeeklyOptions(referenceDate: Date): DashboardHistoricalOption[] {
  const currentWeekStart = getLocalWeekStart(referenceDate);

  return Array.from({ length: 12 }, (_, index) => {
    const weekStart = addDays(currentWeekStart, -index * 7);
    const weekEnd = addDays(weekStart, 6);

    return {
      value: formatDateInputValue(weekStart),
      label:
        index === 0
          ? "Semana actual"
          : index === 1
            ? "Semana pasada"
            : `${formatSimpleDate(formatDateInputValue(weekStart))} – ${formatSimpleDate(formatDateInputValue(weekEnd))}`
    };
  });
}

function getMonthlyOptions(referenceDate: Date): DashboardHistoricalOption[] {
  const currentMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = addMonths(currentMonth, -index);

    return {
      value: formatMonthInputValue(monthDate),
      label:
        index === 0
          ? "Mes actual"
          : index === 1
            ? "Mes anterior"
            : formatLongMonthYear(monthDate)
    };
  });
}

function buildActivePeriodSelection(
  period: DashboardPeriodKey,
  selectedDate: string,
  selectedWeekStart: string,
  selectedMonth: string
): DashboardPeriodSelection {
  if (period === "this_week") {
    return {
      period,
      week_start: selectedWeekStart
    };
  }

  if (period === "month_to_date") {
    return {
      period,
      month: selectedMonth
    };
  }

  return {
    period: "today",
    date: selectedDate
  };
}

function buildPeriodSelectionCacheKey(selection: DashboardPeriodSelection) {
  return [selection.period, selection.date || "", selection.week_start || "", selection.month || ""].join("|");
}

function buildPeriodContext(
  selection: DashboardPeriodSelection,
  metadata: DashboardSummaryResponse["metadata"],
  displayPeriodLabel: string,
  periodRangeText: string,
  periodContextResponse: DashboardSummaryResponse["period_context"]
): DashboardPeriodContext {
  const contextDate = resolveContextDate(metadata);
  const today = startOfLocalDay(contextDate);
  const granularity =
    periodContextResponse?.granularity ||
    (selection.period === "this_week" ? "week" : selection.period === "month_to_date" ? "month" : "day");
  const derivedIsCurrent =
    selection.period === "today"
      ? isSameLocalDate(parseDateInputValue(selection.date) || today, today)
      : selection.period === "this_week"
        ? isSameLocalDate(
            parseDateInputValue(selection.week_start) || getLocalWeekStart(today),
            getLocalWeekStart(today)
          )
        : isSameLocalMonth(
            parseMonthInputValue(selection.month) || new Date(today.getFullYear(), today.getMonth(), 1),
            today
          );
  const isCurrent = periodContextResponse?.is_current ?? derivedIsCurrent;
  const isClosed = periodContextResponse?.is_closed ?? !isCurrent;
  const completionLabel =
    periodContextResponse?.completion_label?.trim() || (isClosed ? "Período completo" : "Datos hasta ahora");

  if (granularity === "day") {
    const selectedDate = parseDateInputValue(selection.date) || today;
    const minutesElapsed = isCurrent ? contextDate.getHours() * 60 + contextDate.getMinutes() : 24 * 60;

    return {
      title: isCurrent ? "Reporte diario de hoy" : `Reporte diario del ${displayPeriodLabel}`,
      description: isCurrent
        ? "Este reporte muestra el desempeño acumulado del día actual."
        : "Este reporte resume un día ya cerrado.",
      note: periodRangeText
        ? `Período analizado: ${periodRangeText}.`
        : "Las comparaciones muestran períodos diarios equivalentes.",
      isCurrent,
      isClosed,
      progressPercent: (minutesElapsed / (24 * 60)) * 100,
      progressStartLabel: "00:00",
      progressCurrentLabel: isCurrent ? formatTime(contextDate) : "",
      progressEndLabel: "23:59",
      progressCaption: isCurrent ? `${completionLabel} · ${formatTime(contextDate)}` : completionLabel
    };
  }

  if (granularity === "week") {
    const selectedWeekStart = parseDateInputValue(selection.week_start) || getLocalWeekStart(today);
    const weekStart = selectedWeekStart;
    const weekEnd = addDays(weekStart, 6);
    const weekEndBoundary = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999);
    const referenceDay = isCurrent ? contextDate : weekEndBoundary;
    const totalMs = Math.max(weekEndBoundary.getTime() - weekStart.getTime(), 1);
    const elapsedMs = Math.max(0, Math.min(referenceDay.getTime() - weekStart.getTime(), totalMs));

    return {
      title: isCurrent ? "Reporte semanal en curso" : "Reporte semanal",
      description: isCurrent
        ? "Este reporte muestra el desempeño acumulado de la semana en curso."
        : "Este reporte resume una semana ya cerrada.",
      note: periodRangeText
        ? `Período analizado: ${periodRangeText}.`
        : "Las comparaciones muestran semanas equivalentes.",
      isCurrent,
      isClosed,
      progressPercent: (elapsedMs / totalMs) * 100,
      progressStartLabel: formatWeekdayDate(weekStart),
      progressCurrentLabel: isCurrent ? formatWeekdayDate(contextDate) : "",
      progressEndLabel: formatWeekdayDate(weekEnd),
      progressCaption: completionLabel
    };
  }

  const selectedMonth = parseMonthInputValue(selection.month) || new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  const referenceDate = isCurrent ? contextDate : monthEnd;
  const totalMs = Math.max(monthEnd.getTime() - monthStart.getTime(), 1);
  const elapsedMs = Math.max(0, Math.min(referenceDate.getTime() - monthStart.getTime(), totalMs));

  return {
    title: isCurrent ? "Reporte mensual en curso" : `Reporte mensual de ${displayPeriodLabel}`,
    description: isCurrent
      ? "Este reporte muestra el desempeño acumulado del mes en curso."
      : "Este reporte resume un mes ya cerrado.",
    note: periodRangeText
      ? `Período analizado: ${periodRangeText}.`
      : "Las comparaciones muestran meses equivalentes.",
    isCurrent,
    isClosed,
    progressPercent: (elapsedMs / totalMs) * 100,
    progressStartLabel: formatShortDate(monthStart),
    progressCurrentLabel: isCurrent ? formatShortDate(contextDate) : "",
    progressEndLabel: formatShortDate(monthEnd),
    progressCaption: completionLabel
  };
}

export function DashboardScreen() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenant_id")?.trim() || "";
  const token = searchParams.get("token")?.trim() || "";
  const periodFromUrl = (searchParams.get("period")?.trim() as DashboardPeriodKey | null) || null;
  const dateFromUrl = searchParams.get("date")?.trim() || "";
  const weekStartFromUrl = searchParams.get("week_start")?.trim() || "";
  const monthFromUrl = searchParams.get("month")?.trim() || "";
  const baseReferenceDate = useMemo(() => startOfLocalDay(new Date()), []);
  const currentDateValue = useMemo(() => formatDateInputValue(baseReferenceDate), [baseReferenceDate]);
  const currentWeekStartValue = useMemo(
    () => formatDateInputValue(getLocalWeekStart(baseReferenceDate)),
    [baseReferenceDate]
  );
  const currentMonthValue = useMemo(() => formatMonthInputValue(baseReferenceDate), [baseReferenceDate]);
  const normalizeSelectedDateValue = (value?: string) => {
    const normalized = value?.trim() || "";
    return parseDateInputValue(normalized) ? normalized : currentDateValue;
  };
  const normalizeSelectedWeekStartValue = (value?: string) => {
    const normalized = value?.trim() || "";
    const parsed = parseDateInputValue(normalized);
    if (!parsed) {
      return currentWeekStartValue;
    }
    return isSameLocalDate(parsed, getLocalWeekStart(parsed)) ? formatDateInputValue(parsed) : currentWeekStartValue;
  };
  const normalizeSelectedMonthValue = (value?: string) => {
    const normalized = value?.trim() || "";
    return parseMonthInputValue(normalized) ? normalized : currentMonthValue;
  };
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodKey>(periodFromUrl || "today");
  const [selectedDate, setSelectedDate] = useState(normalizeSelectedDateValue(dateFromUrl));
  const [selectedWeekStart, setSelectedWeekStart] = useState(normalizeSelectedWeekStartValue(weekStartFromUrl));
  const [selectedMonth, setSelectedMonth] = useState(normalizeSelectedMonthValue(monthFromUrl));
  const [openMethodology, setOpenMethodology] = useState<Record<string, boolean>>({});
  const [isPeriodChartInfoOpen, setIsPeriodChartInfoOpen] = useState(false);
  const [isHourlyAnalysisInfoOpen, setIsHourlyAnalysisInfoOpen] = useState(false);
  const [isCategoryInfoOpen, setIsCategoryInfoOpen] = useState(false);
  const [isOrderBehaviorInfoOpen, setIsOrderBehaviorInfoOpen] = useState(false);
  const [isCombinationsInfoOpen, setIsCombinationsInfoOpen] = useState(false);
  const [isCustomersInfoOpen, setIsCustomersInfoOpen] = useState(false);
  const [isSurveyInfoOpen, setIsSurveyInfoOpen] = useState(false);
  const [isOrdersDetailInfoOpen, setIsOrdersDetailInfoOpen] = useState(false);
  const [isOrdersDetailOpen, setIsOrdersDetailOpen] = useState(false);
  const [isOrdersDetailLoading, setIsOrdersDetailLoading] = useState(false);
  const [ordersDetailError, setOrdersDetailError] = useState<string | null>(null);
  const [ordersDetailByPeriod, setOrdersDetailByPeriod] = useState<Record<string, DashboardOrdersDetailResponse>>({});
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dailyOptions = useMemo(() => getDailyOptions(baseReferenceDate), [baseReferenceDate]);
  const weeklyOptions = useMemo(() => getWeeklyOptions(baseReferenceDate), [baseReferenceDate]);
  const monthlyOptions = useMemo(() => getMonthlyOptions(baseReferenceDate), [baseReferenceDate]);

  useEffect(() => {
    if (periodFromUrl) {
      setSelectedPeriod(periodFromUrl);
    }
  }, [periodFromUrl]);

  useEffect(() => {
    setSelectedDate(normalizeSelectedDateValue(dateFromUrl));
  }, [currentDateValue, dateFromUrl]);

  useEffect(() => {
    setSelectedWeekStart(normalizeSelectedWeekStartValue(weekStartFromUrl));
  }, [currentWeekStartValue, weekStartFromUrl]);

  useEffect(() => {
    setSelectedMonth(normalizeSelectedMonthValue(monthFromUrl));
  }, [currentMonthValue, monthFromUrl]);

  const activePeriodSelection = useMemo(
    () => buildActivePeriodSelection(selectedPeriod, selectedDate, selectedWeekStart, selectedMonth),
    [selectedDate, selectedMonth, selectedPeriod, selectedWeekStart]
  );
  const activePeriodSelectionKey = useMemo(
    () => buildPeriodSelectionCacheKey(activePeriodSelection),
    [activePeriodSelection]
  );

  useEffect(() => {
    setIsOrdersDetailOpen(false);
    setIsOrdersDetailLoading(false);
    setOrdersDetailError(null);
  }, [activePeriodSelectionKey]);

  useEffect(() => {
    if (!tenantId || !token) {
      setIsLoading(false);
      setError("No se pudo abrir el panel. Verifica el enlace e intenta nuevamente.");
      setData(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    fetchDashboardSummary({
      tenantId,
      period: activePeriodSelection.period,
      date: activePeriodSelection.date,
      week_start: activePeriodSelection.week_start,
      month: activePeriodSelection.month,
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
  }, [activePeriodSelection, tenantId, token]);

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
  const orderItemDistribution = useMemo(
    () => normalizeOrderItemCountDistribution(data?.order_item_count_distribution ?? []),
    [data?.order_item_count_distribution]
  );
  const topOrderCombinations = useMemo(
    () => normalizeTopOrderCombinations(data?.top_order_combinations ?? []),
    [data?.top_order_combinations]
  );
  const customerOrderDistribution = useMemo(
    () => normalizeCustomerOrderTypeDistribution(data?.customer_order_type_distribution ?? []),
    [data?.customer_order_type_distribution]
  );
  const topRecurrentCustomers = useMemo(
    () => normalizeTopRecurrentCustomers(data?.top_recurrent_customers ?? []),
    [data?.top_recurrent_customers]
  );
  const surveyOverallTrend = useMemo(
    () => normalizeSurveyTrendRows(data?.survey_trends?.overall ?? [], data?.survey_trends?.period_grain),
    [data?.survey_trends?.overall, data?.survey_trends?.period_grain]
  );
  const surveyQuestionCards = useMemo(
    () =>
      normalizeSurveyQuestionCards(
        data?.survey_summary?.by_question ?? [],
        data?.survey_trends?.by_question ?? [],
        data?.survey_trends?.period_grain
      ),
    [data?.survey_summary?.by_question, data?.survey_trends?.by_question, data?.survey_trends?.period_grain]
  );
  const insights = useMemo(() => normalizeResumen(data?.insights ?? []), [data?.insights]);
  const salesGoal = data?.sales_goal ?? null;
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
  const activeSelectorOptions =
    selectedPeriod === "this_week"
      ? weeklyOptions
      : selectedPeriod === "month_to_date"
        ? monthlyOptions
        : dailyOptions;
  const activeSelectorValue =
    selectedPeriod === "this_week"
      ? selectedWeekStart
      : selectedPeriod === "month_to_date"
        ? selectedMonth
        : selectedDate;
  const activeSelectorLabel =
    activeSelectorOptions.find((option) => option.value === activeSelectorValue)?.label || activeSelectorValue;
  const responsePeriodContext = data?.period_context ?? null;
  const periodContext = useMemo(
    () =>
      buildPeriodContext(
        activePeriodSelection,
        data?.metadata ?? null,
        displayPeriodLabel,
        periodRangeText,
        responsePeriodContext
      ),
    [activePeriodSelection, data?.metadata, displayPeriodLabel, periodRangeText, responsePeriodContext]
  );
  const surveyAverage = toNumber(data?.survey_summary?.general_stars_avg) ?? null;
  const surveyTotalAnswers = toNumber(data?.survey_summary?.total_answers) ?? 0;
  const clampedProgressPercent = Math.min(Math.max(periodContext.progressPercent, 0), 100);
  const currentProgressLabelClassName = [
    "dashboard-period-progress-label-current",
    clampedProgressPercent <= 10 ? "dashboard-period-progress-label-current--start" : "",
    clampedProgressPercent >= 90 ? "dashboard-period-progress-label-current--end" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const maxPeriodChartSales = Math.max(...periodChartRows.map((item) => item.sales), 1);
  const maxSalesByHour = Math.max(...salesByHour.map((item) => item.sales), 1);
  const categoryPieBackground = buildPieChartBackground(categories);
  const orderBehaviorPieBackground = buildPieChartBackground(orderItemDistribution);
  const customerOrderPieBackground = buildPieChartBackground(customerOrderDistribution);
  const surveyOverallChartWidth = getSurveyChartWidth(surveyOverallTrend.length);
  const surveyOverallChart = buildSurveyPolylinePoints(surveyOverallTrend, surveyOverallChartWidth, 132);
  const hasSurveyOverallTrend = hasValidSurveyTrend(surveyOverallTrend);
  const isCurrentPeriod = responsePeriodContext?.is_current ?? periodContext.isCurrent;
  const surveyTrendWindowLabel =
    data?.survey_trends?.period_grain === "week"
      ? isCurrentPeriod
        ? "Últimas 7 semanas"
        : "Evolución hasta la semana seleccionada"
      : data?.survey_trends?.period_grain === "month"
        ? isCurrentPeriod
          ? "Últimos 7 meses"
          : "Evolución hasta el mes seleccionado"
        : isCurrentPeriod
          ? "Últimos 7 días"
          : "Evolución hasta el día seleccionado";
  const ordersDetailCompletionLabel = responsePeriodContext?.completion_label?.trim() || "Período seleccionado";
  const salesGoalDisplayTitle =
    typeof salesGoal?.goal_label === "string" && salesGoal.goal_label.trim()
      ? salesGoal.goal_label.trim()
      : getSalesGoalTitle(selectedPeriod);
  const salesGoalRemainingText =
    typeof salesGoal?.remaining_label === "string" && salesGoal.remaining_label.trim()
      ? salesGoal.remaining_label.trim()
      : salesGoalRemaining !== undefined && salesGoalRemaining !== null
        ? `${salesGoal?.is_goal_period_closed ? "Faltaron" : "Faltan"} ${formatCurrency(salesGoalRemaining, currency)} para llegar a la meta`
        : "Meta en seguimiento";
  const surveyTrendWindowCopy =
    data?.survey_trends?.period_grain === "week"
      ? isCurrentPeriod
        ? "Últimas 7 semanas"
        : "Evolución hasta la semana seleccionada"
      : data?.survey_trends?.period_grain === "month"
        ? isCurrentPeriod
          ? "Últimos 7 meses"
          : "Evolución hasta el mes seleccionado"
        : isCurrentPeriod
          ? "Últimos 7 días"
          : "Evolución hasta el día seleccionado";
  const ordersDetailCompletionCopy =
    responsePeriodContext?.completion_label?.trim() || "Período seleccionado";
  const currentOrdersDetail = ordersDetailByPeriod[activePeriodSelectionKey] ?? null;
  const ordersDetailRows = useMemo(
    () => normalizeOrdersDetailRows(currentOrdersDetail?.orders ?? []),
    [currentOrdersDetail?.orders]
  );

  async function handleToggleOrdersDetail() {
    if (isOrdersDetailOpen) {
      setIsOrdersDetailOpen(false);
      return;
    }

    setIsOrdersDetailOpen(true);
    setOrdersDetailError(null);

    if (currentOrdersDetail) {
      return;
    }

    setIsOrdersDetailLoading(true);

    try {
      const payload = await fetchDashboardOrdersDetail({
        tenantId,
        period: activePeriodSelection.period,
        date: activePeriodSelection.date,
        week_start: activePeriodSelection.week_start,
        month: activePeriodSelection.month,
        token
      });

      setOrdersDetailByPeriod((current) => ({
        ...current,
        [activePeriodSelectionKey]: payload
      }));
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "No se pudieron cargar los pedidos del periodo.";
      setOrdersDetailError(message);
    } finally {
      setIsOrdersDetailLoading(false);
    }
  }

  function handleHistoricalSelectionChange(nextValue: string) {
    if (selectedPeriod === "this_week") {
      setSelectedWeekStart(nextValue);
      return;
    }

    if (selectedPeriod === "month_to_date") {
      setSelectedMonth(nextValue);
      return;
    }

    setSelectedDate(nextValue);
  }

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
          title="No encontramos informacion para este periodo"
          message="No encontramos informacion para este periodo. Selecciona otro periodo para revisar sus resultados."
        />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <div className="dashboard-shell">
        <section className="dashboard-header">
          <div className="dashboard-header-copy">
            <p className="eyebrow">Panel de resultados</p>
            <h1>{getTenantName(data.tenant)}</h1>
            <p className="dashboard-subtitle">Resumen del periodo para seguir las ventas, pedidos, clientes y encuestas.</p>
          </div>
          <div className="dashboard-header-meta">
            <span className="dashboard-period-chip">
              {displayPeriodLabel}
            </span>
            <span className="dashboard-updated-at">
              Informacion actualizada: {formatGeneratedAt(data.metadata?.generated_at)}
            </span>
            {periodRangeText ? <span className="dashboard-updated-at">Periodo seleccionado: {periodRangeText}</span> : null}
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

        <section className="dashboard-period-selector" aria-label="Selector historico del periodo">
          <span className="dashboard-period-selector-label">Período</span>
          <select
            className="dashboard-period-select"
            value={activeSelectorValue}
            onChange={(event) => handleHistoricalSelectionChange(event.target.value)}
          >
            {activeSelectorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="dashboard-period-helper">{activeSelectorLabel}</span>
        </section>

        <section className="dashboard-card dashboard-period-context">
          <div className="dashboard-period-context-header">
            <div>
              <p className="eyebrow">Informacion del periodo seleccionado</p>
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
                  aria-label={`Como se calcula ${card.label}`}
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
                          <span>Periodo actual</span>
                          <div className="dashboard-mini-bar-track">
                            <div
                              className="dashboard-mini-bar-fill dashboard-mini-bar-fill--actual"
                              style={{ width: `${comparison.currentWidth}%` }}
                            />
                          </div>
                          <strong>{comparison.currentValueLabel}</strong>
                        </div>
                        <div className="dashboard-mini-bar-row">
                          <span>Comparacion</span>
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
                <h2 className="dashboard-sales-goal-title">{salesGoalDisplayTitle}</h2>
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
                    <span>{salesGoalRemainingText}</span>
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
                  <p>{getPeriodChartInfo(selectedPeriod, isCurrentPeriod)}</p>
                </div>
              ) : null}
              {periodChartRows.length === 0 ? (
                <p className="dashboard-empty-copy">
                  No encontramos informacion para este periodo.
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
                <h2 className="dashboard-hourly-title">Ventas por hora</h2>
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
                <p>{getHourlyAnalysisInfo(selectedPeriod, isCurrentPeriod)}</p>
              </div>
            ) : null}
            {salesByHour.length === 0 ? (
              <p className="dashboard-empty-copy">No encontramos informacion para este periodo.</p>
            ) : (
              <div className="dashboard-hourly-scroll">
                <div className="dashboard-hourly-bars" aria-label="Ventas por hora">
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

          <article className="dashboard-card dashboard-panel dashboard-pie-card">
            <div className="dashboard-pie-header">
              <div>
                <p className="eyebrow">Categorias</p>
                <h2 className="dashboard-pie-title">Participacion por rubro</h2>
              </div>
              <button
                type="button"
                className="dashboard-pie-info-button"
                aria-label="Explicacion de participacion por rubro"
                aria-expanded={isCategoryInfoOpen ? "true" : "false"}
                onClick={() => setIsCategoryInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isCategoryInfoOpen ? (
              <div className="dashboard-pie-info">
                <p>
                  Este grafico muestra que porcentaje de las ventas corresponde a cada rubro o
                  categoria. El calculo usa el monto vendido en Bs por categoria sobre el total vendido
                  del periodo. Tambien se muestra la cantidad de pedidos asociados a cada rubro.
                </p>
              </div>
            ) : null}
            {categories.length === 0 ? (
              <p className="dashboard-empty-copy">No encontramos categorias con movimiento en este periodo.</p>
            ) : (
              <div className="dashboard-pie-layout">
                <div
                  className="dashboard-pie-chart"
                  style={{ backgroundImage: categoryPieBackground }}
                  aria-label="Participacion por rubro"
                />
                <div className="dashboard-pie-legend">
                  {categories.map((item) => (
                    <div key={item.id} className="dashboard-pie-legend-item">
                      <span
                        className="dashboard-pie-swatch"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <div className="dashboard-pie-label">
                        <strong>{item.label}</strong>
                        <span className="dashboard-pie-meta">
                          {`${formatPercentage(item.percent)} - ${formatCurrency(item.sales, currency)} - ${formatOrdersLabel(item.orders)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel dashboard-pie-card">
            <div className="dashboard-pie-header">
              <div>
                <p className="eyebrow">Pedidos</p>
                <h2 className="dashboard-pie-title">Comportamiento de pedidos</h2>
              </div>
              <button
                type="button"
                className="dashboard-pie-info-button"
                aria-label="Explicacion de comportamiento de pedidos"
                aria-expanded={isOrderBehaviorInfoOpen ? "true" : "false"}
                onClick={() => setIsOrderBehaviorInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isOrderBehaviorInfoOpen ? (
              <div className="dashboard-pie-info">
                <p>
                  Este grafico muestra como se distribuyen los pedidos segun la cantidad de
                  items incluidos en cada pedido. Por ejemplo, un pedido con una hamburguesa y unas
                  papas cuenta como 2 items. El porcentaje se calcula sobre el total de pedidos
                  del periodo.
                </p>
              </div>
            ) : null}
            {orderItemDistribution.length === 0 ? (
              <p className="dashboard-empty-copy">No encontramos suficientes pedidos para este periodo.</p>
            ) : (
              <div className="dashboard-pie-layout">
                <div
                  className="dashboard-pie-chart"
                  style={{ backgroundImage: orderBehaviorPieBackground }}
                  aria-label="Comportamiento de pedidos"
                />
                <div className="dashboard-pie-legend">
                  {orderItemDistribution.map((item) => (
                    <div key={item.id} className="dashboard-pie-legend-item">
                      <span
                        className="dashboard-pie-swatch"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <div className="dashboard-pie-label">
                        <strong>{item.label}</strong>
                        <span className="dashboard-pie-meta">
                          {`${formatPercentage(item.percent)} - ${formatOrdersLabel(item.orders)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel dashboard-combinations">
            <div className="dashboard-pie-header">
              <div>
                <p className="eyebrow">Combinaciones</p>
                <h2 className="dashboard-pie-title">Combinaciones mas pedidas</h2>
              </div>
              <button
                type="button"
                className="dashboard-pie-info-button"
                aria-label="Explicacion de combinaciones mas pedidas"
                aria-expanded={isCombinationsInfoOpen ? "true" : "false"}
                onClick={() => setIsCombinationsInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isCombinationsInfoOpen ? (
              <div className="dashboard-pie-info">
                <p>
                  Esta lista muestra las combinaciones reales de productos que se repiten en pedidos
                  pagados. Solo se consideran pedidos con mas de un producto distinto. El monto en Bs
                  representa el valor generado por los pedidos que contienen esa combinacion.
                </p>
              </div>
            ) : null}
            {topOrderCombinations.length === 0 ? (
              <p className="dashboard-empty-copy">Aun no hay combinaciones repetidas en este periodo.</p>
            ) : (
              <div className="dashboard-combination-list">
                {topOrderCombinations.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="dashboard-combination-item">
                    <span className="dashboard-combination-rank">{index + 1}.</span>
                    <div className="dashboard-combination-main">
                      <strong className="dashboard-combination-label">{item.label}</strong>
                      <span className="dashboard-combination-meta">
                        {`${formatOrdersLabel(item.orders)}${item.sales !== undefined ? ` - ${formatCurrency(item.sales, currency)} generados` : ""}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel dashboard-customers-card">
            <div className="dashboard-customers-header">
              <div>
                <p className="eyebrow">Clientes</p>
                <h2 className="dashboard-customers-title">Clientes</h2>
              </div>
              <button
                type="button"
                className="dashboard-customers-info-button"
                aria-label="Explicacion del bloque de clientes"
                aria-expanded={isCustomersInfoOpen ? "true" : "false"}
                onClick={() => setIsCustomersInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isCustomersInfoOpen ? (
              <div className="dashboard-customers-info">
                <p>
                  Este bloque clasifica los pedidos del periodo segun el historial del cliente.
                  Un cliente nuevo es un contacto que hace su primer pedido conocido dentro de
                  este periodo. <strong>Un cliente recurrente es un cliente que ya habia hecho al menos
                  un pedido en cualquier momento anterior, no solo dentro de este periodo.</strong>{" "}
                  Los pedidos sin telefono o contacto confiable se muestran como sin identificar. El
                  calculo usa solo pedidos del periodo.
                </p>
              </div>
            ) : null}
            <div className="dashboard-customers-layout">
              <div className="dashboard-customers-pie-block">
                <h3 className="dashboard-customers-section-title">Origen de los pedidos</h3>
                {customerOrderDistribution.length === 0 ? (
                  <p className="dashboard-empty-copy">
                    No encontramos informacion suficiente de clientes para este periodo.
                  </p>
                ) : (
                  <>
                    <div
                      className="dashboard-customers-pie"
                      style={{ backgroundImage: customerOrderPieBackground }}
                      aria-label="Origen de los pedidos del periodo"
                    />
                    <div className="dashboard-customers-legend">
                      {customerOrderDistribution.map((item) => (
                        <div key={item.id} className="dashboard-pie-legend-item">
                          <span
                            className="dashboard-pie-swatch"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <div className="dashboard-pie-label">
                            <strong>{item.label}</strong>
                            <span className="dashboard-pie-meta">
                              {`${formatPercentage(item.percent)} - ${formatOrdersLabel(item.orders)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="dashboard-customer-repeat-block">
                <h3 className="dashboard-customers-section-title">Top 3 clientes del periodo</h3>
                {topRecurrentCustomers.length === 0 ? (
                  <p className="dashboard-empty-copy">No encontramos clientes destacados en este periodo.</p>
                ) : (
                  <div className="dashboard-customer-repeat-list">
                    {topRecurrentCustomers.slice(0, 3).map((item) => (
                      <div key={item.id} className="dashboard-customer-repeat-item">
                        <strong className="dashboard-customer-repeat-name">{item.name}</strong>
                        <span className="dashboard-customer-repeat-meta">
                          {`${formatOrdersLabel(item.orders)} - ${formatCurrency(item.totalSpent, currency)}${item.lastPurchaseLabel ? ` - Ultima compra: ${item.lastPurchaseLabel}` : ""}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          <article className="dashboard-card dashboard-panel dashboard-survey-card">
            <div className="dashboard-survey-header">
              <div>
                <p className="eyebrow">Encuestas</p>
                <h2 className="dashboard-survey-title">Encuestas</h2>
              </div>
              <button
                type="button"
                className="dashboard-survey-info-button"
                aria-label="Explicacion del bloque de encuestas"
                aria-expanded={isSurveyInfoOpen ? "true" : "false"}
                onClick={() => setIsSurveyInfoOpen((current) => !current)}
              >
                i
              </button>
            </div>
            {isSurveyInfoOpen ? (
              <div className="dashboard-survey-info">
                <p>
                  Este bloque muestra el promedio de estrellas de las encuestas del período
                  seleccionado y su evolución en {surveyTrendWindowCopy}. Los períodos sin
                  respuestas no se cuentan como 0; simplemente aparecen sin dato.
                </p>
              </div>
            ) : null}
            {surveyTotalAnswers <= 0 ? (
              <p className="dashboard-survey-empty">Todavía no hay respuestas de encuesta en este período.</p>
            ) : (
              <>
                <div className="dashboard-survey-metrics">
                  <div className="dashboard-survey-metric dashboard-survey-score">
                    <span>Promedio general</span>
                    <strong>{formatSurveyScore(surveyAverage)}</strong>
                  </div>
                  <div className="dashboard-survey-metric dashboard-survey-total">
                    <span>Total respuestas</span>
                    <strong>{formatResponsesLabel(surveyTotalAnswers)}</strong>
                  </div>
                </div>

                <div className="dashboard-survey-trend">
                  <h3 className="dashboard-customers-section-title">Evolución general</h3>
                  {!hasSurveyOverallTrend ? (
                    <p className="dashboard-survey-empty">Todavía no hay evolución suficiente para mostrar.</p>
                  ) : (
                    <div className="dashboard-survey-line-chart">
                      <div className="dashboard-survey-line-chart-scroll">
                        <div
                          className="dashboard-survey-line-chart-inner"
                          style={{ minWidth: `${surveyOverallChartWidth}px` }}
                        >
                          <svg
                            viewBox={`0 0 ${surveyOverallChartWidth} 132`}
                            role="img"
                            aria-label="Evolución general de encuestas"
                          >
                            {surveyOverallChart.segments.map((segment, index) => (
                              <path
                                key={`survey-segment-${index + 1}`}
                                d={segment}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ))}
                            {surveyOverallChart.points.map((point) => (
                              <circle
                                key={`survey-point-${point.label}-${point.count}`}
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="#f59e0b"
                                stroke="#ffffff"
                                strokeWidth="2"
                              />
                            ))}
                          </svg>
                          <div
                            className="dashboard-survey-axis-labels"
                            style={{ gridTemplateColumns: `repeat(${Math.max(surveyOverallTrend.length, 1)}, minmax(84px, 1fr))` }}
                          >
                            {surveyOverallTrend.map((point) => (
                              <div key={point.id} className="dashboard-survey-line-label">
                                <span>{point.label}</span>
                                <span>{point.count > 0 ? formatNumber(point.count) : "-"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="dashboard-survey-question-list">
                  {surveyQuestionCards.length === 0 ? (
                    <p className="dashboard-survey-empty">No hay preguntas con historial suficiente para mostrar evolución.</p>
                  ) : surveyQuestionCards.map((question) => {
                    const questionChartWidth = getSurveyChartWidth(question.trend.length, true);
                    const questionChart = buildSurveyPolylinePoints(question.trend, questionChartWidth, 100);
                    const hasQuestionTrend = hasValidSurveyTrend(question.trend);

                    return (
                      <div key={question.id} className="dashboard-survey-question-card">
                        <strong className="dashboard-survey-question-title">{question.title}</strong>
                        <div className="dashboard-survey-question-meta">
                          <span>{`Promedio: ${formatSurveyScore(question.average)}`}</span>
                          <span>{formatResponsesLabel(question.count)}</span>
                        </div>
                        {!question.hasResponses ? (
                          <p className="dashboard-survey-empty">Sin respuestas en este período.</p>
                        ) : null}
                        {!hasQuestionTrend ? (
                          <p className="dashboard-survey-empty">Todavia no hay suficiente informacion para esta pregunta.</p>
                        ) : (
                          <div className="dashboard-survey-line-chart dashboard-survey-line-chart--compact">
                            <div className="dashboard-survey-line-chart-scroll">
                              <div
                                className="dashboard-survey-line-chart-inner"
                                style={{ minWidth: `${questionChartWidth}px` }}
                              >
                                <svg
                                  viewBox={`0 0 ${questionChartWidth} 100`}
                                  role="img"
                                  aria-label={`Evolución de ${question.title}`}
                                >
                                  {questionChart.segments.map((segment, index) => (
                                    <path
                                      key={`${question.id}-segment-${index + 1}`}
                                      d={segment}
                                      fill="none"
                                      stroke="#f59e0b"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  ))}
                                  {questionChart.points.map((point) => (
                                    <circle
                                      key={`${question.id}-point-${point.label}-${point.count}`}
                                      cx={point.x}
                                      cy={point.y}
                                      r="3.5"
                                      fill="#f59e0b"
                                      stroke="#ffffff"
                                      strokeWidth="1.5"
                                    />
                                  ))}
                                </svg>
                                <div
                                  className="dashboard-survey-axis-labels"
                                  style={{ gridTemplateColumns: `repeat(${Math.max(question.trend.length, 1)}, minmax(76px, 1fr))` }}
                                >
                                  {question.trend.map((point) => (
                                    <div key={point.id} className="dashboard-survey-line-label">
                                      <span>{point.label}</span>
                                      <span>{point.count > 0 ? formatNumber(point.count) : "-"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </article>
        </section>

        <article className="dashboard-card dashboard-panel">
          <div className="dashboard-panel-heading">
            <p className="eyebrow">Resumen</p>
            <h2>Resumen del periodo</h2>
          </div>
          {insights.length === 0 ? (
            <p className="dashboard-empty-copy">No hay novedades para este periodo.</p>
          ) : (
            <ul className="dashboard-insight-list">
              {insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          )}
        </article>

        <section className="dashboard-card dashboard-panel dashboard-orders-detail-card">
          <div className="dashboard-orders-detail-header">
            <div>
              <p className="eyebrow">Pedidos</p>
              <h2 className="dashboard-orders-detail-title">Detalle de pedidos del periodo</h2>
            </div>
            <button
              type="button"
              className="dashboard-orders-detail-info-button"
              aria-label="Explicacion del detalle de pedidos"
              aria-expanded={isOrdersDetailInfoOpen ? "true" : "false"}
              onClick={() => setIsOrdersDetailInfoOpen((current) => !current)}
            >
              i
            </button>
          </div>
          {isOrdersDetailInfoOpen ? (
            <div className="dashboard-orders-detail-info">
              <p>
                {`Esta tabla muestra los pedidos del período seleccionado (${ordersDetailCompletionCopy}). `}
                La fecha y hora visibles corresponden a la confirmación de pago cuando existe; si
                no existe, se muestra la fecha de creación del pedido.
              </p>
            </div>
          ) : null}
          <div className="dashboard-orders-detail-actions">
            <button
              type="button"
              className="dashboard-orders-detail-toggle"
              onClick={handleToggleOrdersDetail}
            >
              {isOrdersDetailOpen ? "Ocultar detalle" : "Ver detalle de pedidos"}
            </button>
            {currentOrdersDetail ? (
              <div className="dashboard-orders-detail-summary">
                <span><strong>{formatOrderCountLabel(currentOrdersDetail.total_orders)}</strong></span>
                <strong>{formatCurrency(currentOrdersDetail.total_paid_amount, currency)}</strong>
              </div>
            ) : null}
          </div>
          {isOrdersDetailOpen ? (
            isOrdersDetailLoading ? (
              <p className="dashboard-orders-detail-state">Cargando detalle de pedidos...</p>
            ) : ordersDetailError ? (
              <p className="dashboard-orders-detail-state dashboard-orders-detail-state--error">{ordersDetailError}</p>
            ) : !currentOrdersDetail || ordersDetailRows.length === 0 ? (
              <p className="dashboard-orders-detail-state">No encontramos pedidos para este periodo.</p>
            ) : (
              <div className="dashboard-orders-detail-list" aria-label="Detalle de pedidos del periodo">
                {ordersDetailRows.map((order) => (
                  <div key={order.id} className="dashboard-orders-detail-row">
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Fecha:</span>
                      <strong className="dashboard-orders-detail-date">{order.dateLabel}</strong>
                    </div>
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Hora:</span>
                      <span className="dashboard-orders-detail-field-value">{order.timeLabel || "Sin hora"}</span>
                    </div>
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Nombre:</span>
                      <span className="dashboard-orders-detail-field-value">{order.customerName}</span>
                    </div>
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Telefono:</span>
                      <span className="dashboard-orders-detail-field-value">{order.customerContact || "No registrado"}</span>
                    </div>
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Pedido:</span>
                      <span className="dashboard-orders-detail-field-value">{order.itemsSummary}</span>
                    </div>
                    <div className="dashboard-orders-detail-field">
                      <span className="dashboard-orders-detail-field-label">Pagado:</span>
                      <span className="dashboard-orders-detail-field-value">
                        {formatCurrency(order.paidAmount, order.currency || currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
