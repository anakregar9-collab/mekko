import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { legalFormLabel, spaceKindLabel, type LegalForm } from "@/lib/spaces";
import { SuspendSpaceForm } from "../suspend-form";
import { VerifyForm } from "../verify-form";

export const metadata: Metadata = { title: "Prostor – admin" };

export default function Page({ params }: PageProps<"/admin/prostori/[id]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/admin/prostori">Prostori</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

interface Overview {
  events_published: number;
  events_total: number;
  courses: number;
  pass_types: number;
  team: number;
  members: number;
  bookings: number;
  reports_against: number;
  owner: { id: string; handle: string; name: string } | null;
}

async function Content({ params }: { params: PageProps<"/admin/prostori/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { roles } = await requirePlatformRole(["super_admin", "admin", "moderator", "support"]);
  const canAct = roles.includes("super_admin") || roles.includes("admin");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("spaces")
    .select(
      "id, slug, name, kind, city, tagline, verification_status, legal_form, created_at, deleted_at, suspended_at, suspended_reason",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const [{ data: ov }, { data: history }] = await Promise.all([
    supabase.rpc("admin_space_overview", { p_space: id }),
    supabase
      .from("admin_audit_log")
      .select("id, action, reason, created_at")
      .eq("target_type", "space")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const o = (ov ?? {}) as unknown as Overview;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="lilac">{spaceKindLabel[s.kind]}</Badge>
          <Badge>{s.legal_form ? legalFormLabel[s.legal_form as LegalForm] : "Brez pravnega statusa"}</Badge>
          {s.verification_status === "verified" && <Badge tone="sky">Preverjen</Badge>}
          {s.suspended_at && <Badge tone="brand">Blokiran</Badge>}
          {s.deleted_at && <Badge>Izbrisan</Badge>}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight break-words">{s.name}</h1>
        <p className="text-ink-muted">
          {s.city ?? "Brez kraja"} · ustvarjen {formatDate(s.created_at)}
          {o.owner && (
            <>
              {" "}
              · lastnik{" "}
              <Link href={`/admin/uporabniki/${o.owner.id}`} className="font-semibold underline">
                {o.owner.name} (@{o.owner.handle})
              </Link>
            </>
          )}
        </p>
        {!s.suspended_at && !s.deleted_at && (
          <Link
            href={`/prostori/${s.slug}`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-strong underline"
          >
            Javna stran <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        )}
        {s.suspended_at && (
          <p className="rounded-2xl bg-brand-soft p-3 text-brand-strong" data-testid="space-suspended">
            Blokiran {formatDate(s.suspended_at)}: {s.suspended_reason}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="space-overview">
        <StatTile
          label="Objavljeni dogodki"
          value={String(o.events_published ?? 0)}
          hint={`${o.events_total ?? 0} skupaj`}
        />
        <StatTile label="Prijave" value={String(o.bookings ?? 0)} hint="Potrjene" />
        <StatTile label="Ekipa / člani" value={`${o.team ?? 0} / ${o.members ?? 0}`} />
        <StatTile
          label="Prijave vsebin"
          value={String(o.reports_against ?? 0)}
          hint="Proti prostoru in dogodkom"
        />
        <StatTile label="Tečaji" value={String(o.courses ?? 0)} />
        <StatTile label="Vrste kart" value={String(o.pass_types ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {canAct && (
          <Panel title={s.suspended_at ? "Odblokiraj" : "Blokiraj prostor"}>
            <p className="mb-3 text-sm text-ink-muted">
              {s.suspended_at
                ? "Prostor in vsa njegova vsebina bodo spet vidni."
                : "Prostor, dogodki, tečaji in karte izginejo za javnost, nove prijave in nakupi niso mogoči. Obstoječi udeleženci obdržijo prijave. Lastnik dobi obvestilo z razlogom."}
            </p>
            <SuspendSpaceForm spaceId={s.id} name={s.name} suspended={!!s.suspended_at} />
          </Panel>
        )}
        {canAct && s.verification_status === "pending" && (
          <Panel title="Zahteva za preverjanje">
            <VerifyForm spaceId={s.id} name={s.name} />
          </Panel>
        )}
        <Panel title="Zgodovina ukrepov">
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Ni zapisov.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="py-2">
                  <span className="font-semibold">{h.action}</span> · {formatDate(h.created_at)}{" "}
                  {formatTime(h.created_at)}
                  {h.reason && <span className="block text-ink-muted">{h.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
