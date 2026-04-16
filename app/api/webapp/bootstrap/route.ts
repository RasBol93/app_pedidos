import { NextResponse } from "next/server";

import { fetchTenantMenuFromBackend } from "@/lib/backend-menu";
import { getBootstrapShellByTenantId } from "@/mock/tenants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id")?.trim();

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id es requerido." }, { status: 400 });
  }

  const data = await getBootstrapShellByTenantId(tenantId);

  if (!data) {
    return NextResponse.json({ error: "Tenant no encontrado." }, { status: 404 });
  }

  try {
    const menu = await fetchTenantMenuFromBackend(tenantId);

    return NextResponse.json({
      ...data,
      menu
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo obtener el menu del backend."
      },
      { status: 502 }
    );
  }
}
