import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, Megaphone, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listUpcomingEvents } from "@/lib/data/events";
import { LiveEventCard } from "@/components/events/event-card";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { getAuthUserId } from "@/lib/auth/dal";
import { ReportForm, StartConversationForm } from "@/components/messages/forms";
import { ProviderInfo } from "@/components/spaces/provider-info";
import { BuyPassForm } from "@/components/passes/pass-forms";
import { PaymentDetails } from "@/components/passes/payment-details";
import { withdrawPass } from "@/lib/actions/passes";
import { spaceKindLabel } from "@/lib/spaces";
import { joinSpace, leaveSpace } from "@/lib/actions/community";
import { buttonClasses } from "@/components/ui/button";
import { formatAmount, formatDate, formatTime, pluralSl } from "@/lib/format";

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
    .select(
      "id, slug, name, kind, city, tagline, bio, verification_status, membership_mode, is_demo, legal_form",
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!space) notFound();
  const me = await getAuthUserId();
  const [events, { data: memberCount }, { data: mine }] = await Promise.all([
    listUpcomingEvents({ spaceId: space.id, includeMembers: !!me }),
    supabase.rpc("space_member_count", { p_space: space.id }),
    me
      ? supabase
          .from("space_members")
          .select("role, status")
          .eq("space_id", space.id)
          .eq("profile_id", me)
          .neq("status", "removed")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const isActive = mine?.status === "active";
  const isTeam = isActive && mine?.role !== "member";
  const { data: announcements } = isActive
    ? await supabase
        .from("space_posts")
        .select("id, body, created_at")
        .eq("space_id", space.id)
        .is("removed_at", null)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] as { id: string; body: string; created_at: string }[] };
  const count = memberCount ?? 0;
  const [{ data: passTypes }, { data: myPasses }] = await Promise.all([
    supabase
      .from("pass_types")
      .select(
        me
          ? "id, name, description, visits, price_cents, validity_days, payment_instructions, payment_link"
          : "id, name, description, visits, price_cents, validity_days",
      )
      .eq("space_id", space.id)
      .eq("active", true)
      .order("price_cents"),
    me
      ? supabase
          .from("passes")
          .select("id, pass_type_id, status, valid_until")
          .eq("space_id", space.id)
          .eq("holder_id", me)
          .neq("status", "cancelled")
      : Promise.resolve({
          data: [] as { id: string; pass_type_id: string; status: string; valid_until: string | null }[],
        }),
  ]);
  const types = (passTypes ?? []) as unknown as {
    id: string;
    name: string;
    description: string | null;
    visits: number;
    price_cents: number;
    validity_days: number;
    payment_instructions?: string;
    payment_link?: string | null;
  }[];

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

      <ProviderInfo spaceId={space.id} legalForm={space.legal_form} signedIn={!!me} />

      {space.membership_mode !== "none" && (
        <section
          className="space-y-3 rounded-[var(--radius-card)] bg-lilac-soft p-5"
          data-testid="membership-box"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-lilac-ink">
              <Users aria-hidden="true" className="size-5" /> Članstvo
            </h2>
            <span className="text-sm text-lilac-ink">
              {count} {pluralSl(count, ["član", "člana", "člani", "članov"])}
            </span>
          </div>
          <p className="text-sm">
            {space.membership_mode === "open"
              ? "Pridruži se in prejemaj obvestila prostora ter dostop do dogodkov samo za člane."
              : "Za članstvo pošlji prošnjo. Organizator jo potrdi."}
          </p>
          {!me ? (
            <a
              href={`/prijava?naprej=${encodeURIComponent(`/prostori/${slug}`)}`}
              className={buttonClasses("primary", "md")}
            >
              Prijavi se za članstvo
            </a>
          ) : isTeam ? (
            <p className="text-sm font-semibold">Si v ekipi tega prostora.</p>
          ) : isActive ? (
            <form action={leaveSpace} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="space_id" value={space.id} />
              <input type="hidden" name="slug" value={slug} />
              <span className="font-semibold">Si član/-ica ✓</span>
              <button type="submit" className={buttonClasses("ghost", "sm")}>
                Izstopi
              </button>
            </form>
          ) : mine?.status === "pending" && mine.role === "member" ? (
            <form action={leaveSpace} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="space_id" value={space.id} />
              <input type="hidden" name="slug" value={slug} />
              <span className="font-semibold">Prošnja čaka na potrditev</span>
              <button type="submit" className={buttonClasses("ghost", "sm")}>
                Prekliči prošnjo
              </button>
            </form>
          ) : (
            <form action={joinSpace}>
              <input type="hidden" name="space_id" value={space.id} />
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className={buttonClasses("primary", "md")}>
                {space.membership_mode === "open" ? "Pridruži se" : "Pošlji prošnjo za članstvo"}
              </button>
            </form>
          )}
        </section>
      )}

      {isActive && (announcements ?? []).length > 0 && (
        <section className="space-y-3" data-testid="announcements">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Megaphone aria-hidden="true" className="size-5" /> Obvestila za člane
          </h2>
          <ul className="space-y-2">
            {(announcements ?? []).map((a) => (
              <li key={a.id} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
                <p className="break-words whitespace-pre-line">{a.body}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatDate(a.created_at)} {formatTime(a.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {types.length > 0 && (
        <section className="space-y-3" data-testid="space-passes">
          <h2 className="font-display text-xl font-bold">Karte</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {types.map((t) => {
              const mine = (myPasses ?? []).find((p) => p.pass_type_id === t.id && p.status === "awaiting");
              const owned = (myPasses ?? []).some((p) => p.pass_type_id === t.id && p.status === "active");
              return (
                <li
                  key={t.id}
                  className="space-y-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold break-words">{t.name}</h3>
                    <span className="font-semibold tabular-nums">{formatAmount(t.price_cents)}</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {t.visits} {pluralSl(t.visits, ["obisk", "obiska", "obiski", "obiskov"])} · velja{" "}
                    {t.validity_days} dni od plačila
                  </p>
                  {t.description && <p className="text-sm whitespace-pre-line">{t.description}</p>}
                  {!me ? (
                    <a
                      href={`/prijava?naprej=${encodeURIComponent(`/prostori/${slug}`)}`}
                      className={buttonClasses("secondary", "sm")}
                    >
                      Prijavi se za nakup
                    </a>
                  ) : mine ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">
                        Naročeno – čaka na tvoje plačilo in potrditev organizatorja.
                      </p>
                      <PaymentDetails
                        instructions={t.payment_instructions ?? null}
                        link={t.payment_link ?? null}
                      />
                      <form action={withdrawPass}>
                        <input type="hidden" name="pass_id" value={mine.id} />
                        <input type="hidden" name="back" value={`/prostori/${slug}`} />
                        <button type="submit" className={buttonClasses("ghost", "sm")}>
                          Prekliči naročilo
                        </button>
                      </form>
                    </div>
                  ) : (
                    <>
                      {owned && (
                        <p className="text-sm text-sage-ink">To karto že imaš (Moj Mekko → Moje karte).</p>
                      )}
                      <BuyPassForm spaceSlug={slug} typeId={t.id} name={t.name} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      {me && (
        <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl font-bold">Kontakt</h2>
          {space.is_demo ? (
            <p className="text-sm text-ink-muted">To je testni prostor, zato mu ni mogoče pisati.</p>
          ) : (
            <StartConversationForm target={{ kind: "space", spaceId: space.id }} label="Piši organizatorju" />
          )}
          <ReportForm targetType="space" targetId={space.id} label="Prijavi prostor" />
        </section>
      )}
    </div>
  );
}
