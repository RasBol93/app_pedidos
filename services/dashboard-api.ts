import type {
  DashboardOrdersDetailResponse,
  DashboardPeriodKey,
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
  token: string;
};

type FetchDashboardOrdersDetailParams = {
  tenantId: string;
  period?: DashboardPeriodKey;
  token: string;
};

function normalizePeriod(period?: DashboardPeriodKey) {
  const value = period?.trim() || "today";

  if (!ALLOWED_PERIODS.has(value)) {
    throw new DashboardApiError("Periodo de dashboard invalido.", 400);
  }

  return value as DashboardPeriodKey;
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
    throw new DashboardApiError(
      payload?.error || payload?.message || payload?.detail || "No se pudo cargar el dashboard.",
      response.status
    );
  }

  if (payload && "ok" in payload && payload.ok === false) {
    throw new DashboardApiError(
      payload.error || payload.message || payload.detail || "El backend rechazo la solicitud del dashboard.",
      response.status
    );
  }

  return payload as T;
}

export async function fetchDashboardSummary({
  tenantId,
  period,
  token
}: FetchDashboardSummaryParams) {
  const normalizedTenantId = tenantId.trim();
  const normalizedToken = token.trim();
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedTenantId) {
    throw new DashboardApiError("Falta tenant_id para cargar el dashboard.", 400);
  }

  if (!normalizedToken) {
    throw new DashboardApiError("Falta token para cargar el dashboard.", 400);
  }

  const params = new URLSearchParams({
    tenant_id: normalizedTenantId,
    period: normalizedPeriod,
    token: normalizedToken
  });

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
      throw new DashboardApiError("El dashboard tardó demasiado en responder.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchDashboardOrdersDetail({
  tenantId,
  period,
  token
}: FetchDashboardOrdersDetailParams) {
  const normalizedTenantId = tenantId.trim();
  const normalizedToken = token.trim();
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedTenantId) {
    throw new DashboardApiError("Falta tenant_id para cargar los pedidos del dashboard.", 400);
  }

  if (!normalizedToken) {
    throw new DashboardApiError("Falta token para cargar los pedidos del dashboard.", 400);
  }

  const params = new URLSearchParams({
    tenant_id: normalizedTenantId,
    period: normalizedPeriod,
    token: normalizedToken
  });

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
      throw new DashboardApiError("El detalle de pedidos tardó demasiado en responder.", 504);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
