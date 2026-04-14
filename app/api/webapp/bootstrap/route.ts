import { NextResponse } from "next/server";

import { getBootstrapByTenantId } from "@/mock/tenants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id")?.trim();

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id es requerido." }, { status: 400 });
  }

  const data = await getBootstrapByTenantId(tenantId);

  if (!data) {
    return NextResponse.json({ error: "Tenant no encontrado." }, { status: 404 });
  }

  return NextResponse.json(data);
}
