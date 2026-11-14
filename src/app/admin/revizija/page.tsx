import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Revizijska sled" };

const actionLabel: Record<string, string> = {
  "profile.set_status": "Status računa",
  "data_request.set_status": "Zahteva GDPR",
  "platform_role.grant": "Dodeljena vloga",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Revizijska sled</h1>
      <p className="text-sm text-ink-muted">Zapisov ni mogoče spreminjati ali brisati.</p>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin"]);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("admin_audit_log")
    .select(
      "id, action, target_type, target_id, reason, before, after, created_at, actor:profiles!admin_audit_log_actor_id_fkey(handle)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="audit-log"
    >
      {(rows ?? []).map((r) => (
        <li key={r.id} className="grid gap-1 p-4 sm:grid-cols-[9rem_1fr]">
          <span className="text-sm text-ink-muted tabular-nums">
            {formatDate(r.created_at)} {formatTime(r.created_at)}
          </span>
          <span className="min-w-0 break-words">
            <span className="font-semibold">{actionLabel[r.action] ?? r.action}</span> · @
            {r.actor?.handle ?? "sistem"} ·{" "}
            <span className="text-ink-muted">
              {JSON.stringify(r.before)} → {JSON.stringify(r.after)}
            </span>
            {r.reason && <span className="block text-sm">Razlog: {r.reason}</span>}
          </span>
        </li>
      ))}
      {rows?.length === 0 && <li className="p-4 text-ink-muted">Ni zapisov.</li>}
    </ul>
  );
}
