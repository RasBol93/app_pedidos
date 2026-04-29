import { NextResponse } from "next/server";

type BackendBootstrapPayload = {
  ok?: boolean;
  tenant_id?: string;
  bootstrap?: unknown;
  error?: string;
  detail?: string;
  message?: string;
};

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

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id es requerido." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${getBackendApiBaseUrl()}/webapp/bootstrap?tenant_id=${encodeURIComponent(tenantId)}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const payload = (await response.json().catch(() => null)) as BackendBootstrapPayload | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            payload?.error ||
            payload?.detail ||
            payload?.message ||
            `No se pudo obtener bootstrap para ${tenantId}.`
        },
        { status: 502 }
      );
    }

    if (!payload?.ok) {
      return NextResponse.json(
        {
          error:
            payload?.error ||
            payload?.detail ||
            payload?.message ||
            "El backend devolvio ok=false para webapp/bootstrap."
        },
        { status: 502 }
      );
    }

    if (!payload.bootstrap || typeof payload.bootstrap !== "object") {
      return NextResponse.json(
        { error: "El backend devolvio un bootstrap invalido o vacio." },
        { status: 502 }
      );
    }

    return NextResponse.json(payload.bootstrap);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el backend de bootstrap."
      },
      { status: 502 }
    );
  }
}
