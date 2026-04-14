"use client";

import Link, { type LinkProps } from "next/link";
import { type AnchorHTMLAttributes, type PropsWithChildren } from "react";

import { buildTenantHref } from "@/lib/tenant";

type TenantLinkProps = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
    Pick<LinkProps, "prefetch" | "replace" | "scroll"> & {
      href: string;
      tenantId?: string;
      extraParams?: Record<string, string | undefined>;
    }
>;

export function TenantLink({
  children,
  href,
  tenantId,
  extraParams,
  ...props
}: TenantLinkProps) {
  return (
    <Link href={buildTenantHref(href, tenantId, extraParams)} {...props}>
      {children}
    </Link>
  );
}
