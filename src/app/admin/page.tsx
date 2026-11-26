import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, BadgeCheck, Ban, Flag, Search, ShieldAlert, Store, UserX, Users } from "lucide-react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { inputCls } from "@/components/forms";
import { cn } from "@/lib/cn";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Administracija" };

export default function Page({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<PageSkeleton title="Administracija" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function clean(q: unknown): string {
  return typeof q === "string"
    ? q
        .replace(/[^\p{L}\p{N} ._-]/gu, "")
        .trim()
        .slice(0, 60)
    : "";
}

function Tile({
  href,
  label,
  value,
  icon,
  urgent,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-28 flex-col justify-between rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand",
        urgent && value > 0 ? "bg-brand-soft text-brand-strong" : "bg-surface",
      )}
    >
      <span className="flex items-center gap-2 text-base font-semibold">
        {icon} {label}
      </span>
      <span className="font-display text-4xl font-extrabold tabular-nums">{value}</span>
    </Link>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requirePlatformRole(["super_admin", "admin", "moderator", "finance", "support"]);
  const q = clean((await searchParams).q);
  const supabase = await createClient();
  const weekAgo = new Date(nowMs() - 7 * 86_400_000).toISOString();
  const [users, newUsers, spaces, reports, pending, requests, suspendedUsers, suspendedSpaces] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("spaces").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase
        .from("spaces")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),
      supabase
        .from("data_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
      supabase.from("spaces").select("id", { count: "exact", head: true }).not("suspended_at", "is", null),
    ]);
  const [{ data: people }, { data: places }] = q
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("id, handle, display_name, status")
          .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(10),
        supabase
          .from("spaces")
          .select("id, name, slug, suspended_at")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .limit(10),
      ])
    : [{ data: null }, { data: null }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Administracija</h1>
        <p className="text-lg text-ink-muted">Vse spremembe se zapišejo v revizijsko sled.</p>
      </div>

      <form role="search" className="flex flex-wrap gap-2" data-testid="admin-search">
        <label htmlFor="aq" className="sr-only">
          Išči osebo ali prostor
        </label>
        <input
          id="aq"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Išči osebo ali prostor (ime, @uporabnik, naslov)"
          className={cn(inputCls, "min-h-12 min-w-0 flex-1 text-lg")}
        />
        <button type="submit" className={buttonClasses("primary", "md")}>
          <Search aria-hidden="true" className="size-5" /> Išči
        </button>
      </form>

      {q && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="admin-search-results">
          <section className="space-y-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl font-bold">Osebe</h2>
            {(people ?? []).length === 0 ? (
              <p className="text-ink-muted">Ni zadetkov.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(people ?? []).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/uporabniki/${p.id}`}
                      className="flex min-h-12 items-center justify-between gap-2 py-2 text-lg hover:underline"
                    >
                      <span className="min-w-0 break-words">
                        {p.display_name} <span className="text-base text-ink-muted">@{p.handle}</span>
                      </span>
                      {p.status !== "active" && <span className="text-sm text-brand-strong">omejen</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl font-bold">Prostori</h2>
            {(places ?? []).length === 0 ? (
              <p className="text-ink-muted">Ni zadetkov.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(places ?? []).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/prostori/${s.id}`}
                      className="flex min-h-12 items-center justify-between gap-2 py-2 text-lg hover:underline"
                    >
                      <span className="min-w-0 break-words">{s.name}</span>
                      {s.suspended_at && <span className="text-sm text-brand-strong">blokiran</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Čaka na ukrep</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="admin-todo">
          <Tile
            href="/admin/prijave"
            label="Odprte prijave vsebin"
            value={reports.count ?? 0}
            icon={<Flag aria-hidden="true" className="size-5" />}
            urgent
          />
          <Tile
            href="/admin/prostori"
            label="Zahteve za preverjanje"
            value={pending.count ?? 0}
            icon={<BadgeCheck aria-hidden="true" className="size-5" />}
            urgent
          />
          <Tile
            href="/admin/zahteve"
            label="Zahteve GDPR"
            value={requests.count ?? 0}
            icon={<ShieldAlert aria-hidden="true" className="size-5" />}
            urgent
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Skupnost</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile
            href="/admin/uporabniki"
            label="Uporabniki"
            value={users.count ?? 0}
            icon={<Users aria-hidden="true" className="size-5" />}
          />
          <Tile
            href="/admin/uporabniki"
            label="Novi (7 dni)"
            value={newUsers.count ?? 0}
            icon={<AlertTriangle aria-hidden="true" className="size-5" />}
          />
          <Tile
            href="/admin/prostori"
            label="Prostori"
            value={spaces.count ?? 0}
            icon={<Store aria-hidden="true" className="size-5" />}
          />
          <Tile
            href="/admin/uporabniki"
            label="Omejeni računi"
            value={suspendedUsers.count ?? 0}
            icon={<UserX aria-hidden="true" className="size-5" />}
          />
          <Tile
            href="/admin/prostori?blokirani=1"
            label="Blokirani prostori"
            value={suspendedSpaces.count ?? 0}
            icon={<Ban aria-hidden="true" className="size-5" />}
          />
        </div>
      </section>

      <p className="text-sm text-ink-muted">
        Mekko plačil ne obdeluje (plačila gredo neposredno organizatorjem), zato finančnih pregledov tukaj ni.
      </p>
    </div>
  );
}
