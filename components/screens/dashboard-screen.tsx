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
  DashboardPeriod,
  DashboardSeriesPoint,
  DashboardSummaryResponse,
  DashboardTopCustomer,
  DashboardTopProduct
} from "@/types/dashboard";

type DashboardKpiCard = {
  key: "sales_total" | "orders_paid" | "avg_ticket" | "unique_customers";
  label: string;
  value: string;
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

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "this_week", label: "Esta semana" },
  { value: "month_to_date", label: "Mes en curso" }
];

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

function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("es-BO", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }

  return formatNumber(value);
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
      comparisons: buildComparisonItems("sales_total", comparisons?.sales_total, currency),
      tone: "primary"
    },
    {
      key: "orders_paid",
      label: "Pedidos pagados",
      value: formatNumber(paidOrders),
      comparisons: buildComparisonItems("orders_paid", comparisons?.orders_paid, currency)
    },
    {
      key: "avg_ticket",
      label: "Ticket promedio",
      value: formatCurrency(averageTicket, currency),
      comparisons: buildComparisonItems("avg_ticket", comparisons?.avg_ticket, currency)
    },
    {
      key: "unique_customers",
      label: "Clientes unicos",
      value: formatNumber(uniqueCustomers),
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

function normalizeTopProducts(items: DashboardTopProduct[]) {
  return items.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: getRecordText(record, ["sku", "name", "product_name", "title"]) || `product-${index + 1}`,
      name: getRecordText(record, ["name", "product_name", "title", "sku"]) || "Producto",
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

  const raw = survey.rating_counts ?? survey.histogram;
  if (!raw) {
    return [];
  }

  return [1, 2, 3, 4, 5].map((rating) => ({
    label: `${rating}`,
    value: toNumber(raw[String(rating)]) ?? 0
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

export function DashboardScreen() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenant_id")?.trim() || "";
  const token = searchParams.get("token")?.trim() || "";
  const periodFromUrl = (searchParams.get("period")?.trim() as DashboardPeriod | null) || null;
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(periodFromUrl || "month_to_date");
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
  const salesByDay = useMemo(() => normalizeSeries(data?.sales_by_day ?? [], "Dia"), [data?.sales_by_day]);
  const salesByHour = useMemo(() => normalizeSeries(data?.sales_by_hour ?? [], "Hora"), [data?.sales_by_hour]);
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

  const maxSalesByDay = Math.max(...salesByDay.map((item) => item.value), 1);
  const maxSalesByHour = Math.max(...salesByHour.map((item) => item.value), 1);
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
              {PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.label || data.period}
            </span>
            <span className="dashboard-updated-at">
              Actualizado: {formatGeneratedAt(data.metadata?.generated_at || data.metadata?.generated_at_iso)}
            </span>
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

        <section className="dashboard-kpi-grid">
          {kpiCards.map((card) => (
            <article
              key={card.key}
              className={`dashboard-card dashboard-kpi-card ${card.tone === "primary" ? "dashboard-kpi-card-primary" : ""}`}
            >
              <span className="dashboard-kpi-label">{card.label}</span>
              <strong className="dashboard-kpi-value">{card.value}</strong>
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

        <section className="dashboard-grid">
          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Ventas por dia</p>
              <h2>Comportamiento diario</h2>
            </div>
            {salesByDay.length === 0 ? (
              <p className="dashboard-empty-copy">Aun no hay ventas por dia para este periodo.</p>
            ) : (
              <div className="dashboard-day-chart" aria-label="Grafico de ventas por dia">
                {salesByDay.map((item) => (
                  <div key={item.label} className="dashboard-day-bar-group">
                    <span className="dashboard-day-bar-value">{formatNumber(item.value)}</span>
                    <div className="dashboard-day-bar-track">
                      <div
                        className="dashboard-day-bar-fill"
                        style={{ height: `${Math.max((item.value / maxSalesByDay) * 100, 8)}%` }}
                      />
                    </div>
                    <span className="dashboard-day-bar-label">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Ventas por hora</p>
              <h2>Picos del dia</h2>
            </div>
            {salesByHour.length === 0 ? (
              <p className="dashboard-empty-copy">Aun no hay ventas por hora para este periodo.</p>
            ) : (
              <div className="dashboard-horizontal-list">
                {salesByHour.map((item) => (
                  <div key={item.label} className="dashboard-horizontal-row">
                    <span className="dashboard-horizontal-label">{item.label}</span>
                    <div className="dashboard-horizontal-track">
                      <div
                        className="dashboard-horizontal-fill"
                        style={{ width: `${Math.max((item.value / maxSalesByHour) * 100, 6)}%` }}
                      />
                    </div>
                    <strong className="dashboard-horizontal-value">{formatNumber(item.value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-card dashboard-panel">
            <div className="dashboard-panel-heading">
              <p className="eyebrow">Top productos</p>
              <h2>Lo mas vendido</h2>
            </div>
            {topProducts.length === 0 ? (
              <p className="dashboard-empty-copy">Todavia no hay productos destacados para este periodo.</p>
            ) : (
              <div className="dashboard-ranked-list">
                {topProducts.map((item, index) => (
                  <div key={item.id} className="dashboard-ranked-row">
                    <span className="dashboard-rank-badge">{index + 1}</span>
                    <div className="dashboard-ranked-copy">
                      <strong>{item.name}</strong>
                      <span>{formatNumber(item.units)} unidades</span>
                    </div>
                    <strong className="dashboard-ranked-value">
                      {formatCurrency(item.revenue, currency)}
                    </strong>
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
                <strong>
                  {toNumber(data.survey_summary?.average_rating ?? data.survey_summary?.avg_rating)?.toFixed(1) ??
                    "0.0"}
                </strong>
              </div>
              <div className="dashboard-mini-stat">
                <span>Total respuestas</span>
                <strong>
                  {formatNumber(
                    toNumber(data.survey_summary?.total_responses ?? data.survey_summary?.responses) ?? 0
                  )}
                </strong>
              </div>
            </div>
            {surveyHistogram.length > 0 ? (
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
