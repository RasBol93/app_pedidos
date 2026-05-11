import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBackendApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL no esta configurada.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id")?.trim();
  const token = searchParams.get("token")?.trim();
  const period = searchParams.get("period")?.trim() || "today";

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id es requerido." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "token es requerido." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      period,
      token
    });

    const response = await fetch(
      `${getBackendApiBaseUrl()}/admin/dashboard/summary?${params.toString()}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      return NextResponse.json(
        payload ?? { error: "No se pudo obtener el dashboard desde el backend." },
        { status: response.status }
      );
    }

    if (!payload || payload.ok === false) {
      return NextResponse.json(
        payload ?? { error: "El backend devolvio una respuesta invalida para dashboard." },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el backend del dashboard."
      },
      { status: 502 }
    );
  }
}
