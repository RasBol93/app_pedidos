import type {
  DashboardOrdersDetailResponse,
  DashboardPeriodKey,
  DashboardPeriodSelection,
  DashboardSummaryResponse
} from "@/types/dashboard";

export class DashboardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
  }
}

const ALLOWED_PERIODS = new Set(["today", "this_week", "month_to_date"]);
const DASHBOARD_TIMEOUT_MS = 45_000;
const DASHBOARD_ORDERS_DETAIL_TIMEOUT_MS = 105_000;

type FetchDashboardSummaryParams = {
  tenantId: string;
  period?: DashboardPeriodKey;
  date?: string;
  week_start?: string;
  month?: string;
  token: string;
};

type FetchDashboardOrdersDetailParams = {
  tenantId: string;
  period?: DashboardPeriodKey;
  date?: string;
  week_start?: string;
  month?: string;
  token: string;
};

function normalizePeriod(period?: DashboardPeriodKey) {
  const value = period?.trim() || "today";

  if (!ALLOWED_PERIODS.has(value)) {
    throw new DashboardApiError("No pudimos cargar esta informacion. Intenta actualizar.", 400);
  }

  return value as DashboardPeriodKey;
}

function buildDashboardSelectionParams({
  period,
  date,
  week_start,
  month
}: DashboardPeriodSelection) {
  const params = new URLSearchParams({
    period
  });

  if (period === "today" && date?.trim()) {
    params.set("date", date.trim());
  }

  if (period === "this_week" && week_start?.trim()) {
    params.set("week_start", week_start.trim());
  }

  if (period === "month_to_date" && month?.trim()) {
    params.set("month", month.trim());
  }

  return params;
}

function getFriendlyDashboardMessage(status: number) {
  if (status === 401 || status === 403) {
    return "No fue posible abrir el panel con este enlace.";
  }

  if (status === 404) {
    return "No encontramos informacion para este periodo. Selecciona otro periodo para revisar sus resultados.";
  }

  if (status >= 500 || status === 429) {
    return "El panel tardó más de lo esperado en cargar. Intenta actualizar en unos segundos.";
  }

  return "No pudimos cargar esta informacion. Intenta actualizar.";
}

async function parseDashboardJson<T>(response: Response): Promise<T> {
  const rawText = await response.text().catch(() => "");
  let payload:
    | { ok?: boolean; error?: string; message?: string; detail?: string }
    | null = null;

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as unknown;
      payload = parsed && typeof parsed === "object"
        ? (parsed as { ok?: boolean; error?: string; message?: string; detail?: string })
        : null;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new DashboardApiError(getFriendlyDashboardMessage(response.status), response.status);
  }

  if (payload && "ok" in payload && payload.ok === false) {
    throw new DashboardApiError(
      getFriendlyDashboardMessage(response.status || 500),
      response.status || 500
    );
  }

  return payload as T;
}

export async function fetchDashboardSummary({
  tenantId,
  period,
  date,
  week_start,
  month,
  token
}: FetchDashboardSummaryParams) {
  const normalizedTenantId = tenantId.trim();
  const normalizedToken = token.trim();
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedTenantId || !normalizedToken) {
    throw new DashboardApiError(
      "No se pudo abrir el panel. Verifica el enlace e intenta nuevamente.",
      400
    );
  }

  const params = buildDashboardSelectionParams({
    period: normalizedPeriod,
    date,
    week_start,
    month
  });
  params.set("tenant_id", normalizedTenantId);
  params.set("token", normalizedToken);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/admin/dashboard/summary?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    });

    return parseDashboardJson<DashboardSummaryResponse>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DashboardApiError(
        "El panel tardó más de lo esperado en cargar. Intenta actualizar en unos segundos.",
        504
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchDashboardOrdersDetail({
  tenantId,
  period,
  date,
  week_start,
  month,
  token
}: FetchDashboardOrdersDetailParams) {
  const normalizedTenantId = tenantId.trim();
  const normalizedToken = token.trim();
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedTenantId || !normalizedToken) {
    throw new DashboardApiError(
      "No se pudo abrir el panel. Verifica el enlace e intenta nuevamente.",
      400
    );
  }

  const params = buildDashboardSelectionParams({
    period: normalizedPeriod,
    date,
    week_start,
    month
  });
  params.set("tenant_id", normalizedTenantId);
  params.set("token", normalizedToken);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_ORDERS_DETAIL_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/admin/dashboard/orders-detail?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    });

    return parseDashboardJson<DashboardOrdersDetailResponse>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DashboardApiError(
        "El panel tardó más de lo esperado en cargar. Intenta actualizar en unos segundos.",
        504
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
