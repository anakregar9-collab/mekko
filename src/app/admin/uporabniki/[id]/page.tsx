import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { roleLabel } from "@/lib/spaces";
import { StatusForm } from "../status-form";

export const metadata: Metadata = { title: "Oseba – admin" };

export default function Page({ params }: PageProps<"/admin/uporabniki/[id]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/admin/uporabniki">Uporabniki</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

interface Overview {
  email: string | null;
  last_sign_in_at: string | null;
  bookings: number;
  bookings_cancelled: number;
  posts: number;
  ideas: number;
  comments: number;
  messages_sent: number;
  reports_against: number;
  reports_made: number;
  blocked_by: number;
  spaces: { id: string; name: string; slug: string; role: keyof typeof roleLabel; status: string }[];
  platform_roles: string[];
}

async function Content({ params }: { params: PageProps<"/admin/uporabniki/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { profile: me, roles } = await requirePlatformRole(["super_admin", "admin", "moderator", "support"]);
  const canAct = roles.includes("super_admin") || roles.includes("admin");
  const canSeeEmail = canAct || roles.includes("support");
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("id, handle, display_name, status, visibility, approx_city, created_at, terms_version")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const [{ data: ov }, { data: history }, { data: reports }] = await Promise.all([
    canSeeEmail ? supabase.rpc("admin_user_overview", { p_profile: id }) : Promise.resolve({ data: null }),
    supabase
      .from("admin_audit_log")
      .select("id, action, reason, created_at")
      .eq("target_type", "profile")
      .eq("target_id", id)
      .neq("action", "admin.view_user")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reports")
      .select("id, reason, details, status, created_at")
      .eq("target_type", "profile")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const o = ov as unknown as Overview | null;
  const statusText = p.status === "active" ? "Aktiven" : p.status === "suspended" ? "Omejen" : "Izbrisan";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={p.status === "active" ? "sage" : "brand"}>{statusText}</Badge>
          <Badge>{p.visibility === "private" ? "Zaseben profil" : "Javen profil"}</Badge>
          {(o?.platform_roles ?? []).map((r) => (
            <Badge key={r} tone="lilac">
              {r}
            </Badge>
          ))}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight break-words">{p.display_name}</h1>
        <p className="text-ink-muted break-words">
          @{p.handle} · {p.approx_city ?? "brez kraja"} · od {formatDate(p.created_at)}
          {o?.email && <> · {o.email}</>}
        </p>
        {o?.last_sign_in_at && (
          <p className="text-sm text-ink-muted">
            Zadnja prijava {formatDate(o.last_sign_in_at)} {formatTime(o.last_sign_in_at)}
          </p>
        )}
        {p.status === "active" && (
          <Link
            href={`/u/${p.handle}`}
            className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline"
          >
            Profil v feedu
          </Link>
        )}
      </div>

      {o && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="user-overview">
          <StatTile
            label="Prijave na dogodke"
            value={String(o.bookings)}
            hint={`${o.bookings_cancelled} odjavljenih`}
          />
          <StatTile label="Objave / ideje" value={`${o.posts} / ${o.ideas}`} />
          <StatTile label="Komentarji" value={String(o.comments)} />
          <StatTile label="Poslana sporočila" value={String(o.messages_sent)} />
          <StatTile label="Prijave proti osebi" value={String(o.reports_against)} />
          <StatTile
            label="Blokiran/-a pri"
            value={String(o.blocked_by)}
            hint="Koliko ljudi jo je blokiralo"
          />
          <StatTile label="Oddane prijave" value={String(o.reports_made)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {canAct && p.id !== me.id && p.status !== "deleted" && (
          <Panel title={p.status === "active" ? "Omeji račun" : "Ponovno aktiviraj"}>
            <p className="mb-3 text-sm text-ink-muted">
              {p.status === "active"
                ? "Omejena oseba se ne more prijavljati na dogodke, pisati, objavljati ali komentirati. Vidi stran z razlogom."
                : "Oseba bo spet lahko normalno uporabljala Mekko."}
            </p>
            <StatusForm profileId={p.id} current={p.status} handle={p.handle} />
          </Panel>
        )}
        {o && o.spaces.length > 0 && (
          <Panel title="Prostori">
            <ul className="divide-y divide-line text-sm">
              {o.spaces.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/prostori/${s.id}`} className="font-semibold underline">
                    {s.name}
                  </Link>
                  <Badge>{roleLabel[s.role] ?? s.role}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="Prijave proti osebi">
          {(reports ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Ni prijav.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {(reports ?? []).map((r) => (
                <li key={r.id} className="py-2">
                  <span className="font-semibold">{r.reason}</span> · {r.status} · {formatDate(r.created_at)}
                  {r.details && <span className="block text-ink-muted">„{r.details}“</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
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
