import type {
  BackendActionResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  ReportPaidPayload,
  ReportPaymentProofPayload,
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

type PaymentProofPresignResponse = {
  success: boolean;
  upload_url: string;
  file_url: string;
  object_key?: string;
};

function inferContentType(file: File) {
  return file.type?.trim() || "application/octet-stream";
}

async function presignPaymentProofUpload(file: File): Promise<PaymentProofPresignResponse> {
  const response = await fetch(`${getPublicApiBaseUrl()}/upload/payment-proof/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: inferContentType(file)
    })
  });

  return parseJson<PaymentProofPresignResponse>(response);
}

async function uploadFileDirectToR2(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "No se pudo subir el comprobante al storage.");
  }
}

export async function fetchBootstrap(tenantId: string) {
  const response = await fetch(`/api/webapp/bootstrap?tenant_id=${encodeURIComponent(tenantId)}`, {
    cache: "no-store"
  });

  return parseJson<WebappBootstrap>(response);
}

export async function uploadPaymentProof(file: File) {
  const presigned = await presignPaymentProofUpload(file);

  if (!presigned.success || !presigned.upload_url || !presigned.file_url) {
    throw new Error("No se pudo preparar la subida del comprobante.");
  }

  await uploadFileDirectToR2(presigned.upload_url, file);

  return {
    success: true,
    file_reference: presigned.file_url,
    original_name: file.name,
    object_key: presigned.object_key
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
