import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireSpaceRole, hasSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSlot } from "@/lib/format";

export const metadata: Metadata = { title: "Dogodki" };

export default function Page({ params }: PageProps<"/organizator/[space]/dogodki">) {
  return (
    <Suspense fallback={<PageSkeleton title="Dogodki" />}>
      <Content params={params} />
    </Suspense>
  );
}

const statusBadge = {
  draft: { label: "Osnutek", tone: "neutral" },
  published: { label: "Objavljeno", tone: "sage" },
  cancelled: { label: "Odpovedano", tone: "brand" },
} as const;

async function Content({ params }: { params: PageProps<"/organizator/[space]/dogodki">["params"] }) {
  const { space: slug } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, title, status, capacity, occurrences:event_occurrences(starts_at, ends_at), bookings(quantity, status)",
    )
    .eq("space_id", space.id)
    .order("created_at", { ascending: false });
  const events = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Dogodki</h1>
        {hasSpaceRole(role, "admin") && (
          <ButtonLink href={`/organizator/${slug}/dogodki/nov`}>
            <Plus aria-hidden="true" className="size-5" /> Nov dogodek
          </ButtonLink>
        )}
      </div>
      {events.length === 0 ? (
        <EmptyState title="Še ni dogodkov">
          <p>Ustvari prvo delavnico. Objaviš jo lahko takoj ali jo shraniš kot osnutek.</p>
        </EmptyState>
      ) : (
        <ul
          className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
          data-testid="org-events"
        >
          {events.map((e) => {
            const first = [...e.occurrences].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
            const booked = e.bookings
              .filter((b) => b.status === "confirmed")
              .reduce((n, b) => n + b.quantity, 0);
            return (
              <li key={e.id}>
                <Link
                  href={`/organizator/${slug}/dogodki/${e.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-cream sm:flex-row sm:items-center"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-words">{e.title}</span>
                    <span className="block text-sm text-ink-muted">
                      {first ? formatSlot(first.starts_at, first.ends_at) : "Brez termina"}
                      {e.occurrences.length > 1 ? ` · ${e.occurrences.length} termini` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted tabular-nums">
                      {booked}
                      {e.capacity ? `/${e.capacity}` : ""} prijav
                    </span>
                    <Badge tone={statusBadge[e.status].tone}>{statusBadge[e.status].label}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
