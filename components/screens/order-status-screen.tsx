"use client";

import { useSearchParams } from "next/navigation";

import { OrderStatusCard } from "@/components/order/order-status-card";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AppHeader } from "@/components/shared/app-header";
import { PageShell } from "@/components/shared/page-shell";
import { TenantLink } from "@/components/shared/tenant-link";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useTenantId } from "@/hooks/use-tenant-id";

export function OrderStatusScreen() {
  const tenantId = useTenantId();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? undefined;
  const { data, isLoading, error } = useBootstrap(tenantId);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <ErrorState message={error || "No encontramos informacion para este tenant."} />
      </PageShell>
    );
  }

  return (
    <PageShell contentClassName="page-shell-padding">
      <AppHeader tenant={data.tenant} content={data.content} tenantId={tenantId} activePath="/" />
      <OrderStatusCard orderId={orderId} />
      <TenantLink href="/" tenantId={tenantId} className="button button-secondary button-block">
        Volver al menu
      </TenantLink>
    </PageShell>
  );
}
