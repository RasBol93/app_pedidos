import type {
  BackendActionResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  CreateOrderItemInput,
  OrderStatusOrderSnapshot,
  OrderStatusResponse,
  OrderUiStatus,
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

function normalizeOrderUiStatus(value: unknown): OrderUiStatus {
  if (value === "paid" || value === "pending_payment" || value === "pending_payment_review") {
    return value;
  }

  return "pending_payment_review";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeOrderItems(items: unknown): CreateOrderItemInput[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      const sku = typeof record.sku === "string" ? record.sku : "";
      const name = typeof record.name === "string" ? record.name : "";
      const price = toNumber(record.price) ?? 0;
      const quantity = toNumber(record.quantity ?? record.qty) ?? 0;

      if (!sku) {
        return null;
      }

      return {
        sku,
        name,
        price,
        quantity
      } satisfies CreateOrderItemInput;
    })
    .filter((item): item is CreateOrderItemInput => Boolean(item));
}

function normalizeOrderSnapshot(
  source: Record<string, unknown>,
  tenantId: string,
  orderId: string,
  uiStatus: OrderUiStatus
): OrderStatusOrderSnapshot {
  return {
    order_id:
      (typeof source.order_id === "string" && source.order_id) ||
      (typeof source.id === "string" && source.id) ||
      orderId,
    tenant_id: (typeof source.tenant_id === "string" && source.tenant_id) || tenantId,
    customer_name: typeof source.customer_name === "string" ? source.customer_name : undefined,
    customer_phone:
      (typeof source.customer_phone === "string" && source.customer_phone) ||
      (typeof source.customer_contact === "string" && source.customer_contact) ||
      undefined,
    requested_time: typeof source.requested_time === "string" ? source.requested_time : undefined,
    notes: typeof source.notes === "string" ? source.notes : undefined,
    items: normalizeOrderItems(source.items ?? source.items_snapshot),
    total_amount: toNumber(source.total_amount),
    status: uiStatus,
    payment_proof_file:
      typeof source.payment_proof_file === "string" ? source.payment_proof_file : undefined,
    payment_proof_name:
      typeof source.payment_proof_name === "string" ? source.payment_proof_name : undefined,
    created_at: typeof source.created_at === "string" ? source.created_at : undefined
  };
}

function normalizeOrderStatusPayload(
  payload: Record<string, unknown>,
  tenantId: string,
  orderId: string
): OrderStatusResponse {
  const nestedOrder =
    payload.order && typeof payload.order === "object"
      ? (payload.order as Record<string, unknown>)
      : null;
  const source = nestedOrder ?? payload;
  const uiStatus = normalizeOrderUiStatus(payload.ui_status ?? source.ui_status ?? source.status);

  return {
    ui_status: uiStatus,
    status:
      typeof payload.status === "string"
        ? payload.status
        : typeof source.status === "string"
          ? source.status
          : undefined,
    order: normalizeOrderSnapshot(source, tenantId, orderId, uiStatus)
  };
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

export async function fetchOrderStatus(tenantId: string, orderId: string) {
  const response = await fetch(
    `${getPublicApiBaseUrl()}/orders/status?tenant_id=${encodeURIComponent(tenantId)}&order_id=${encodeURIComponent(orderId)}`,
    {
      cache: "no-store"
    }
  );

  const payload = await parseJson<Record<string, unknown>>(response);
  return normalizeOrderStatusPayload(payload, tenantId, orderId);
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
