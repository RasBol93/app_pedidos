import { NextResponse } from "next/server";

import type { CreateOrderPayload } from "@/types/webapp";

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<CreateOrderPayload>;

  if (!payload.tenant_id || !payload.customer_name || !payload.customer_phone) {
    return NextResponse.json(
      { error: "tenant_id, customer_name y customer_phone son requeridos." },
      { status: 400 }
    );
  }

  if (!payload.requested_time || !Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json(
      { error: "requested_time e items son requeridos para crear el pedido." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    order_id: `ORD-${Date.now()}`,
    status: "pending_payment_review",
    message: "Tu pedido fue enviado y quedo pendiente de validacion."
  });
}
