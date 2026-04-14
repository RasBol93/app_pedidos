import { TenantLink } from "@/components/shared/tenant-link";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  tenantId?: string;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  tenantId
}: EmptyStateProps) {
  return (
    <div className="state-card">
      <span className="badge">Vacio</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && actionHref ? (
        <TenantLink href={actionHref} tenantId={tenantId} className="button button-primary">
          {actionLabel}
        </TenantLink>
      ) : null}
    </div>
  );
}
