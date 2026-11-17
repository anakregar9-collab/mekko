import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { respondFollowAction } from "@/lib/actions/feed";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Prošnje za sledenje" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Prošnje za sledenje</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const me = await requireUser({ next: "/moj-mekko/sledilci" });
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("followee_id", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const ids = (pending ?? []).map((p) => p.follower_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, display_name, handle").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  if (ids.length === 0) {
    return (
      <EmptyState title="Ni novih prošenj">
        <p>Prošnje dobiš, kadar je tvoj profil zaseben (Moj Mekko → Profil in zasebnost).</p>
      </EmptyState>
    );
  }
  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="follow-request-list"
    >
      {ids.map((id) => {
        const p = byId.get(id);
        const name = p?.display_name ?? "Uporabnik Mekko";
        return (
          <li key={id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="min-w-0">
              <span className="block font-semibold">{name}</span>
              {p?.handle && <span className="text-sm text-ink-muted">@{p.handle}</span>}
            </span>
            <span className="flex gap-2">
              <form action={respondFollowAction}>
                <input type="hidden" name="follower_id" value={id} />
                <input type="hidden" name="accept" value="1" />
                <SubmitButton size="sm" pendingText="…">
                  Potrdi<span className="sr-only"> {name}</span>
                </SubmitButton>
              </form>
              <form action={respondFollowAction}>
                <input type="hidden" name="follower_id" value={id} />
                <input type="hidden" name="accept" value="0" />
                <SubmitButton size="sm" variant="ghost" pendingText="…">
                  Zavrni<span className="sr-only"> {name}</span>
                </SubmitButton>
              </form>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
