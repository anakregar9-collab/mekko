import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { ResolveForm } from "./resolve-form";

export const metadata: Metadata = { title: "Zahteve GDPR" };

const kindLabel = { export: "Izvoz", deletion: "Izbris" } as const;
const statusLabel = {
  open: "Oddano",
  in_progress: "V obdelavi",
  done: "Zaključeno",
  rejected: "Zavrnjeno",
} as const;

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Zahteve GDPR</h1>
      <p className="text-sm text-ink-muted">
        Rok za odgovor je 30 dni od oddaje. Izvoz in izbris se v M1 izvedeta ročno po internem postopku.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin", "support"]);
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("data_requests")
    .select("id, kind, status, created_at, profile:profiles!data_requests_profile_id_fkey(handle)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="admin-requests"
    >
      {(requests ?? []).map((r) => (
        <li key={r.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {kindLabel[r.kind]} · @{r.profile?.handle ?? "?"}
            </p>
            <p className="text-sm text-ink-muted">Oddano {formatDate(r.created_at)}</p>
          </div>
          <Badge tone={r.status === "done" ? "sage" : r.status === "rejected" ? "brand" : "sun"}>
            {statusLabel[r.status]}
          </Badge>
          {(r.status === "open" || r.status === "in_progress") && (
            <ResolveForm requestId={r.id} current={r.status} />
          )}
        </li>
      ))}
      {requests?.length === 0 && <li className="p-4 text-ink-muted">Ni zahtev.</li>}
    </ul>
  );
}
