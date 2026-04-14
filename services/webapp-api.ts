import type {
  CreateOrderPayload,
  CreateOrderResponse,
  UploadPaymentProofResponse,
  WebappBootstrap
} from "@/types/webapp";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "No se pudo completar la solicitud.");
  }

  return response.json() as Promise<T>;
}

export async function fetchBootstrap(tenantId: string) {
  const response = await fetch(`/api/webapp/bootstrap?tenant_id=${encodeURIComponent(tenantId)}`, {
    cache: "no-store"
  });

  return parseJson<WebappBootstrap>(response);
}

export async function uploadPaymentProof(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/webapp/uploads/payment-proof", {
    method: "POST",
    body: formData
  });

  return parseJson<UploadPaymentProofResponse>(response);
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await fetch("/api/webapp/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson<CreateOrderResponse>(response);
}
