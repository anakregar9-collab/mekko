import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listUpcomingEvents } from "@/lib/data/events";
import { LiveEventCard } from "@/components/events/event-card";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { spaceKindLabel } from "@/lib/spaces";

export const metadata: Metadata = { title: "Prostor" };

export default function SpacePage({ params }: PageProps<"/prostori/[slug]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/odkrivanje">Odkrivanje</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/prostori/[slug]">["params"] }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, kind, city, tagline, bio, verification_status, membership_mode, is_demo")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!space) notFound();
  const events = await listUpcomingEvents({ spaceId: space.id });

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="lilac">{spaceKindLabel[space.kind]}</Badge>
          {space.is_demo && <Badge>Testni prostor</Badge>}
          {space.verification_status === "verified" && (
            <Badge tone="sky">
              <BadgeCheck aria-hidden="true" className="size-3" /> Preverjen
            </Badge>
          )}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight break-words">{space.name}</h1>
        {space.tagline && <p className="text-lg text-ink-muted">{space.tagline}</p>}
        {space.city && <p className="text-sm text-ink-muted">{space.city}</p>}
        {space.bio && <p className="pt-2 leading-relaxed whitespace-pre-line">{space.bio}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Prihajajoči dogodki</h2>
        {events.length === 0 ? (
          <EmptyState title="Trenutno ni napovedanih dogodkov" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {events.map((e) => (
              <li key={e.id}>
                <LiveEventCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
