import type {
  BackendActionResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  ReportPaidPayload,
  ReportPaymentProofPayload,
  PresignedPaymentProofUploadResponse,
  UploadPaymentProofResponse,
  WebappBootstrap
} from "@/types/webapp";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string; detail?: string }
      | null;
    throw new Error(payload?.error || payload?.message || payload?.detail || "No se pudo completar la solicitud.");
  }

  return response.json() as Promise<T>;
}

function getPublicApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL no esta configurada.");
  }

  return baseUrl.replace(/\/+$/, "");
}

export async function fetchBootstrap(tenantId: string) {
  const response = await fetch(`/api/webapp/bootstrap?tenant_id=${encodeURIComponent(tenantId)}`, {
    cache: "no-store"
  });

  return parseJson<WebappBootstrap>(response);
}

export async function uploadPaymentProof(file: File) {
  const contentType = file.type || "application/octet-stream";
  const presignResponse = await fetch(`${getPublicApiBaseUrl()}/upload/payment-proof/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: contentType
    })
  });

  const presignedUpload = await parseJson<PresignedPaymentProofUploadResponse>(presignResponse);
  const uploadResponse = await fetch(presignedUpload.upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType
    },
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error("No pudimos subir el comprobante. Intenta nuevamente.");
  }

  return {
    success: presignedUpload.success,
    file_reference: presignedUpload.file_url,
    original_name: file.name,
    object_key: presignedUpload.object_key
  } satisfies UploadPaymentProofResponse;
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

export async function reportPaymentProof(payload: ReportPaymentProofPayload) {
  const response = await fetch(`${getPublicApiBaseUrl()}/orders/payment_proof`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson<BackendActionResponse>(response);
}

export async function reportOrderPaid(payload: ReportPaidPayload) {
  const response = await fetch(`${getPublicApiBaseUrl()}/orders/report_paid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseJson<BackendActionResponse>(response);
}
