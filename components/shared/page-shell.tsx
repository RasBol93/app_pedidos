import { type PropsWithChildren } from "react";

type PageShellProps = PropsWithChildren<{
  contentClassName?: string;
}>;

export function PageShell({ children, contentClassName }: PageShellProps) {
  return (
    <div className="page-shell">
      <div className={`page-phone ${contentClassName ?? ""}`.trim()}>{children}</div>
    </div>
  );
}
