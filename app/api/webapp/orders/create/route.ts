import { NextResponse } from "next/server";

function getOrdersCreateUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL no esta configurada.");
  }

  return `${baseUrl.replace(/\/+$/, "")}/orders/create`;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { customer_phone, ...rest } = payload as Record<string, unknown>;
    const backendPayload = {
      ...rest,
      customer_contact: customer_phone
    };

    console.log("Creating order → forwarding to backend");

    const response = await fetch(getOrdersCreateUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(backendPayload),
      cache: "no-store"
    });

    const data = await response.json();

    console.log("Backend response:", data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo conectar con el backend de pedidos.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
