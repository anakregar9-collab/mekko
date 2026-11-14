import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { BlockButton } from "@/components/messages/block-button";

export const metadata: Metadata = { title: "Blokirane osebe" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Blokirane osebe</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/blokirani" });
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", profile.id)
    .order("created_at", { ascending: false });
  const ids = (blocks ?? []).map((b) => b.blocked_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, handle, display_name").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  if (ids.length === 0) {
    return (
      <EmptyState title="Nikogar nisi blokiral/-a">
        <p>
          Blokirana oseba ti ne more pisati, ti pa ne njej. Obstoječe prijave na dogodke ostanejo veljavne.
        </p>
      </EmptyState>
    );
  }
  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="blocked-list"
    >
      {ids.map((id) => {
        const p = byId.get(id);
        const name = p?.display_name ?? "Uporabnik Mekko";
        return (
          <li key={id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span className="min-w-0">
              <span className="block font-semibold break-words">{name}</span>
              {p?.handle && <span className="text-sm text-ink-muted">@{p.handle}</span>}
            </span>
            <BlockButton profileId={id} blocked back="/moj-mekko/blokirani" name={name} />
          </li>
        );
      })}
    </ul>
  );
}
