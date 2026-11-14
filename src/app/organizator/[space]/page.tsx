import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarPlus, Settings, Users } from "lucide-react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { roleLabel, spaceKindLabel } from "@/lib/spaces";
import { RequestVerificationForm } from "./verification-form";

export const metadata: Metadata = { title: "Pregled prostora" };

export default function Page({ params }: PageProps<"/organizator/[space]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]">["params"] }) {
  const { space: slug } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const [{ count: teamCount }, { data: events }] = await Promise.all([
    supabase
      .from("space_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("space_id", space.id)
      .eq("status", "active"),
    supabase.from("events").select("id, status").eq("space_id", space.id),
  ]);
  const published = (events ?? []).filter((e) => e.status === "published");
  const { data: bookings } = published.length
    ? await supabase
        .from("bookings")
        .select("quantity")
        .in(
          "event_id",
          published.map((e) => e.id),
        )
        .eq("status", "confirmed")
    : { data: [] as { quantity: number }[] };
  const people = (bookings ?? []).reduce((n, b) => n + b.quantity, 0);

  const missing = [
    !space.tagline && "kratek opis",
    !space.bio && "predstavitev",
    !space.city && "kraj",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="lilac">{spaceKindLabel[space.kind]}</Badge>
          <Badge>Tvoja vloga: {roleLabel[role]}</Badge>
          {space.verification_status === "verified" && <Badge tone="sky">Preverjen</Badge>}
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight break-words">{space.name}</h1>
        {space.tagline && <p className="text-ink-muted">{space.tagline}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Ekipa" value={String(teamCount ?? 1)} />
        <StatTile
          label="Objavljeni dogodki"
          value={String(published.length)}
          hint={`${(events ?? []).length - published.length} drugih (osnutki, odpovedani)`}
        />
        <StatTile label="Prijavljene osebe" value={String(people)} hint="Na objavljenih dogodkih" />
        <StatTile label="Prihodki" value="—" hint="Plačila: po pravnem pregledu" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Naslednji koraki">
          <ul className="space-y-3">
            {missing.length > 0 && hasSpaceRole(role, "admin") && (
              <li>
                <Link
                  href={`/organizator/${slug}/nastavitve`}
                  className="flex items-center gap-3 font-semibold hover:underline"
                >
                  <Settings aria-hidden="true" className="size-5 text-ink-muted" /> Dopolni:{" "}
                  {missing.join(", ")}
                </Link>
              </li>
            )}
            {hasSpaceRole(role, "admin") && (
              <li>
                <Link
                  href={`/organizator/${slug}/ekipa`}
                  className="flex items-center gap-3 font-semibold hover:underline"
                >
                  <Users aria-hidden="true" className="size-5 text-ink-muted" /> Povabi sodelavce v ekipo
                </Link>
              </li>
            )}
            {hasSpaceRole(role, "admin") && (
              <li>
                <Link
                  href={`/organizator/${slug}/dogodki/nov`}
                  className="flex items-center gap-3 font-semibold hover:underline"
                >
                  <CalendarPlus aria-hidden="true" className="size-5 text-ink-muted" />
                  {published.length === 0 ? "Objavi prvi dogodek" : "Objavi nov dogodek"}
                </Link>
              </li>
            )}
          </ul>
        </Panel>
        <Panel title="Preverjen organizator">
          <div className="space-y-2 text-sm" data-testid="verification">
            {space.verification_status === "verified" ? (
              <p className="flex items-center gap-2 font-semibold text-sky-ink">
                <BadgeCheck aria-hidden="true" className="size-5" /> Prostor je preverjen.
              </p>
            ) : space.verification_status === "pending" ? (
              <p>Zahteva za preverjanje je oddana. Ekipa Mekko te bo kontaktirala.</p>
            ) : (
              <>
                <p>
                  Preverjeni organizatorji dobijo znak ob imenu, kar obiskovalcem pove, da je Mekko preveril
                  njihovo identiteto.
                  {space.verification_status === "rejected" && " Prejšnja zahteva ni bila odobrena."}
                </p>
                {role === "owner" ? (
                  <RequestVerificationForm spaceId={space.id} slug={slug} />
                ) : (
                  <p className="text-ink-muted">Za preverjanje lahko zaprosi lastnik prostora.</p>
                )}
              </>
            )}
          </div>
        </Panel>
        <Panel title="O prostoru">
          <dl className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
            <dt className="text-ink-muted">Naslov</dt>
            <dd className="break-all">mekko.eu/prostori/{space.slug}</dd>
            <dt className="text-ink-muted">Kraj</dt>
            <dd>{space.city ?? "—"}</dd>
            <dt className="text-ink-muted">Članstvo</dt>
            <dd>
              {space.membership_mode === "open"
                ? "Odprto"
                : space.membership_mode === "approval"
                  ? "Na prošnjo"
                  : "Brez članstva"}
            </dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
