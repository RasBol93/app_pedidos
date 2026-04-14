"use client";

import { useSearchParams } from "next/navigation";

import { TENANT_QUERY_PARAM } from "@/lib/constants";
import { resolveTenantId } from "@/lib/tenant";

export function useTenantId() {
  const searchParams = useSearchParams();
  return resolveTenantId(searchParams.get(TENANT_QUERY_PARAM));
}
