import type { MenuItem } from "@/types/webapp";

const DEFAULT_API_BASE_URL = "https://proyecto-reservas-idwl.onrender.com";

type BackendMenuItem = {
  sku?: string;
  name?: string;
  price?: number | string;
  category?: string;
  photo_url?: string;
  description?: string;
};

type BackendMenuResponse = {
  ok?: boolean;
  tenant_id?: string;
  categories?: Record<string, BackendMenuItem[] | undefined>;
};

function normalizeApiBaseUrl(rawUrl?: string) {
  const baseUrl = rawUrl?.trim() || DEFAULT_API_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

function toNumber(value: number | string | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getBackendApiBaseUrl() {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export function normalizeBackendMenu(payload: BackendMenuResponse): MenuItem[] {
  const categories = payload.categories ?? {};

  return Object.entries(categories).flatMap(([categoryName, items]) =>
    (items ?? [])
      .filter((item) => item?.sku && item?.name)
      .map((item) => ({
        sku: item.sku as string,
        name: item.name as string,
        price: toNumber(item.price),
        active: true,
        category: item.category?.trim() || categoryName,
        photo_url: item.photo_url || undefined,
        description: item.description || undefined
      }))
  );
}

export async function fetchTenantMenuFromBackend(tenantId: string) {
  const response = await fetch(
    `${getBackendApiBaseUrl()}/menu?tenant_id=${encodeURIComponent(tenantId)}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const fallbackMessage = `No se pudo obtener el menu para ${tenantId}.`;
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;

    throw new Error(payload?.detail || payload?.error || fallbackMessage);
  }

  const payload = (await response.json()) as BackendMenuResponse;

  if (!payload?.categories || typeof payload.categories !== "object") {
    throw new Error("El backend devolvio un formato de menu no valido.");
  }

  return normalizeBackendMenu(payload);
}
