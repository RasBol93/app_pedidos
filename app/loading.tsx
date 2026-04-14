import { LoadingState } from "@/components/shared/loading-state";
import { PageShell } from "@/components/shared/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <LoadingState />
    </PageShell>
  );
}
