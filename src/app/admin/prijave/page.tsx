import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { ResolveReportForm } from "./resolve-report-form";

export const metadata: Metadata = { title: "Prijave vsebin" };

const reasonLabel: Record<string, string> = {
  spam: "Neželena vsebina",
  harassment: "Nadlegovanje",
  inappropriate: "Neprimerna vsebina",
  scam: "Prevara",
  copyright: "Avtorske pravice",
  other: "Drugo",
};
const typeLabel: Record<string, string> = {
  profile: "Oseba",
  message: "Sporočilo",
  event: "Dogodek",
  space: "Prostor",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Prijave vsebin</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin", "moderator"]);
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(handle)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  const list = reports ?? [];
  if (list.length === 0) {
    return (
      <EmptyState title="Ni odprtih prijav">
        <p>Ko uporabniki prijavijo osebo, sporočilo, dogodek ali prostor, se prijava prikaže tukaj.</p>
      </EmptyState>
    );
  }

  const ids = (t: string) => list.filter((r) => r.target_type === t).map((r) => r.target_id);
  const msgIds = ids("message").map(Number).filter(Number.isFinite);
  const [{ data: msgs }, { data: people }, { data: events }, { data: spaces }] = await Promise.all([
    msgIds.length
      ? supabase.from("messages").select("id, body, removed_at, sender_id").in("id", msgIds)
      : Promise.resolve({
          data: [] as { id: number; body: string; removed_at: string | null; sender_id: string }[],
        }),
    supabase.from("profiles").select("id, handle, display_name, status").in("id", ids("profile")),
    supabase.from("events").select("id, slug, title").in("id", ids("event")),
    supabase.from("spaces").select("id, slug, name").in("id", ids("space")),
  ]);
  const senderIds = (msgs ?? []).map((m) => m.sender_id);
  const { data: senders } = senderIds.length
    ? await supabase.from("profiles").select("id, handle").in("id", senderIds)
    : { data: [] as { id: string; handle: string }[] };

  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="admin-reports"
    >
      {list.map((r) => {
        let target: React.ReactNode = <span className="text-ink-muted">Vsebine ni več</span>;
        let messageId: number | undefined;
        if (r.target_type === "message") {
          const m = (msgs ?? []).find((x) => String(x.id) === r.target_id);
          if (m) {
            messageId = m.removed_at ? undefined : m.id;
            const sender = (senders ?? []).find((s) => s.id === m.sender_id);
            target = (
              <>
                <span className="block text-sm text-ink-muted">Pošiljatelj: @{sender?.handle ?? "?"}</span>
                <span className="block rounded-xl bg-cream p-2 break-words whitespace-pre-line">
                  {m.removed_at ? "(odstranjeno)" : m.body}
                </span>
              </>
            );
          }
        } else if (r.target_type === "profile") {
          const p = (people ?? []).find((x) => x.id === r.target_id);
          if (p)
            target = (
              <Link
                href={`/admin/uporabniki?q=${encodeURIComponent(p.handle)}`}
                className="font-semibold underline"
              >
                {p.display_name} (@{p.handle})
              </Link>
            );
        } else if (r.target_type === "event") {
          const e = (events ?? []).find((x) => x.id === r.target_id);
          if (e)
            target = (
              <Link href={`/dogodki/${e.slug}`} className="font-semibold underline">
                {e.title}
              </Link>
            );
        } else {
          const s = (spaces ?? []).find((x) => x.id === r.target_id);
          if (s)
            target = (
              <Link href={`/prostori/${s.slug}`} className="font-semibold underline">
                {s.name}
              </Link>
            );
        }
        const reporter = r.reporter as { handle: string } | null;
        return (
          <li key={r.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="lilac">{typeLabel[r.target_type]}</Badge>
                <Badge tone="brand">{reasonLabel[r.reason]}</Badge>
              </div>
              <div className="break-words">{target}</div>
              {r.details && <p className="text-sm">„{r.details}“</p>}
              <p className="text-xs text-ink-muted">
                Prijavil/-a @{reporter?.handle ?? "?"} · {formatDate(r.created_at)} {formatTime(r.created_at)}
              </p>
            </div>
            <ResolveReportForm reportId={r.id} messageId={messageId} />
          </li>
        );
      })}
    </ul>
  );
}
