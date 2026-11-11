import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarPlus, Settings, Users } from "lucide-react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { roleLabel, spaceKindLabel } from "@/lib/spaces";

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
  const { count: teamCount } = await supabase
    .from("space_members")
    .select("profile_id", { count: "exact", head: true })
    .eq("space_id", space.id)
    .eq("status", "active");

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
        <StatTile label="Dogodki" value="0" hint="Objava dogodkov: M2" />
        <StatTile label="Prijave" value="0" hint="M2" />
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
            <li className="flex items-center gap-3 text-ink-muted">
              <CalendarPlus aria-hidden="true" className="size-5" /> Objava prvega dogodka – na voljo v M2
            </li>
          </ul>
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
