import { TENANT_QUERY_PARAM } from "@/lib/constants";

export function buildTenantHref(
  pathname: string,
  tenantId?: string,
  extraParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();

  if (tenantId) {
    params.set(TENANT_QUERY_PARAM, tenantId);
  }

  Object.entries(extraParams ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function resolveTenantId(value: string | null | undefined) {
  return value?.trim() ?? "";
}
