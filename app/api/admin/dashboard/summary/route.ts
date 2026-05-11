import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_PERIODS = new Set(["today", "this_week", "month_to_date"]);
const BACKEND_TIMEOUT_MS = 35_000;

function getBackendApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/+$/, "");
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

async function readBackendJson(response: Response) {
  const rawText = await response.text().catch(() => "");

  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id")?.trim();
  const token = searchParams.get("token")?.trim();
  const period = searchParams.get("period")?.trim() || "today";

  if (!tenantId) {
    return jsonResponse({ ok: false, error: "tenant_id es requerido." }, 400);
  }

  if (!token) {
    return jsonResponse({ ok: false, error: "token es requerido." }, 400);
  }

  if (!ALLOWED_PERIODS.has(period)) {
    return jsonResponse({ ok: false, error: "Periodo de dashboard invalido." }, 400);
  }

  const backendBaseUrl = getBackendApiBaseUrl();

  if (!backendBaseUrl) {
    return jsonResponse({ ok: false, error: "Dashboard backend is not configured" }, 500);
  }

  try {
    const backendUrl = new URL("/admin/dashboard/summary", backendBaseUrl);
    backendUrl.search = new URLSearchParams({
      tenant_id: tenantId,
      period,
      token
    }).toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(backendUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const payload = await readBackendJson(response);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return jsonResponse({ ok: false, error: "Unauthorized dashboard request" }, response.status);
      }

      if (response.status === 404) {
        return jsonResponse({ ok: false, error: "Dashboard data not found" }, 404);
      }

      return jsonResponse({ ok: false, error: "Dashboard backend error" }, response.status);
    }

    if (!payload || payload.ok === false) {
      return jsonResponse({ ok: false, error: "Dashboard backend error" }, 502);
    }

    return jsonResponse(payload, 200);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonResponse({ ok: false, error: "Dashboard backend timeout" }, 504);
    }

    return jsonResponse({ ok: false, error: "Dashboard backend error" }, 502);
  }
}
