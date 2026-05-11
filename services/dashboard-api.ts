import type { DashboardPeriod, DashboardSummaryResponse } from "@/types/dashboard";

export class DashboardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
  }
}

type FetchDashboardSummaryParams = {
  tenantId: string;
  period: DashboardPeriod;
  token: string;
};

async function parseDashboardJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; message?: string; detail?: string }
    | null;

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
  const params = new URLSearchParams({
    tenant_id: tenantId,
    period,
    token
  });

  const response = await fetch(`/api/admin/dashboard/summary?${params.toString()}`, {
    cache: "no-store"
  });

  return parseDashboardJson<DashboardSummaryResponse>(response);
}
