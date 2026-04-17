import { NextResponse } from "next/server";

import { fetchTenantMenuFromBackend } from "@/lib/backend-menu";
import { fetchPickupStatusFromBackend } from "@/lib/backend-pickup";
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
    const [menu, pickup] = await Promise.all([
      fetchTenantMenuFromBackend(tenantId),
      fetchPickupStatusFromBackend(tenantId)
    ]);

    return NextResponse.json({
      ...data,
      menu,
      admin_settings: {
        ...data.admin_settings,
        pickup_interval_minutes:
          pickup.pickup_interval_minutes ?? data.admin_settings.pickup_interval_minutes
      },
      open_status: pickup.open_status
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron obtener menu y pickup desde el backend."
      },
      { status: 502 }
    );
  }
}
