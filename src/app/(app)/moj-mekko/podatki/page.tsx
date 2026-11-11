import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { DataRequestForms } from "./data-request-forms";

export const metadata: Metadata = { title: "Moji podatki" };

const statusLabel = {
  open: "Oddano",
  in_progress: "V obdelavi",
  done: "Zaključeno",
  rejected: "Zavrnjeno",
} as const;
const kindLabel = { export: "Izvoz podatkov", deletion: "Izbris računa" } as const;

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moji podatki</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/podatki" });
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("data_requests")
    .select("id, kind, status, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });
  const open = new Set(
    (requests ?? []).filter((r) => r.status === "open" || r.status === "in_progress").map((r) => r.kind),
  );

  return (
    <div className="space-y-5">
      <p className="text-ink-muted">
        Po GDPR lahko zahtevaš kopijo svojih podatkov ali izbris računa. Zahtevo obdela ekipa Mekka v največ
        30 dneh.
      </p>
      <DataRequestForms exportOpen={open.has("export")} deletionOpen={open.has("deletion")} />
      {requests && requests.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Moje zahteve</h2>
          <ul
            className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
            data-testid="my-data-requests"
          >
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  <span className="font-semibold">{kindLabel[r.kind]}</span>
                  <span className="block text-sm text-ink-muted">{formatDate(r.created_at)}</span>
                </span>
                <Badge tone={r.status === "done" ? "sage" : r.status === "rejected" ? "brand" : "sun"}>
                  {statusLabel[r.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
