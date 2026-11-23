import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatAmount, formatDate, localDateKey } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { confirmPass, setPassTypeActive } from "@/lib/actions/passes";
import { CancelPassForm, ExtendPassForm, PassTypeForm } from "@/components/passes/pass-forms";

export const metadata: Metadata = { title: "Karte" };

export default function Page({ params }: PageProps<"/organizator/[space]/karte">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Karte</h1>
      <p className="max-w-2xl text-sm text-ink-muted">
        Karte za več obiskov (npr. 10 × joga). Kupci plačajo neposredno tebi – po tvojih navodilih ali prek
        tvoje plačilne povezave (npr. Stripe). Ko prejmeš plačilo, karto potrdiš in začne veljati. Ko odpoveš
        termin, se obisk vrne na karto; vračila denarja urejaš sam/-a.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

interface PassRow {
  id: string;
  name: string;
  visits: number;
  price_cents: number;
  status: "awaiting" | "active" | "cancelled";
  valid_until: string | null;
  created_at: string;
  holder: { display_name: string; handle: string } | null;
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/karte">["params"] }) {
  const { space: slug } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  const isAdmin = hasSpaceRole(role, "admin");
  const supabase = await createClient();
  const [{ data: types }, { data: raw }] = await Promise.all([
    supabase
      .from("pass_types")
      .select("id, name, visits, price_cents, validity_days, active, payment_link")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("passes")
      .select(
        "id, name, visits, price_cents, status, valid_until, created_at, holder:profiles!passes_holder_id_fkey(display_name, handle)",
      )
      .eq("space_id", space.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const passes = (raw ?? []) as unknown as PassRow[];
  const activeIds = passes.filter((p) => p.status === "active").map((p) => p.id);
  const { data: used } = activeIds.length
    ? await supabase
        .from("bookings")
        .select("pass_id, quantity")
        .in("pass_id", activeIds)
        .eq("status", "confirmed")
    : { data: [] as { pass_id: string | null; quantity: number }[] };
  const usedOf = (id: string) =>
    (used ?? []).filter((b) => b.pass_id === id).reduce((n, b) => n + b.quantity, 0);
  const now = nowMs();
  const awaiting = passes.filter((p) => p.status === "awaiting");
  const active = passes.filter((p) => p.status === "active");
  const who = (p: PassRow) => (p.holder ? `${p.holder.display_name} (@${p.holder.handle})` : "Uporabnik");
  const confirm = confirmPass.bind(null, slug);
  const toggle = setPassTypeActive.bind(null, slug);
  const today = localDateKey(new Date(now).toISOString());

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0 space-y-4">
        <Panel title={`Čakajo na plačilo (${awaiting.length})`}>
          {awaiting.length === 0 ? (
            <p className="text-sm text-ink-muted">Ni odprtih naročil.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="pass-requests">
              {awaiting.map((p) => (
                <li key={p.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold break-words">{who(p)}</p>
                    <span className="text-sm tabular-nums">{formatAmount(p.price_cents)}</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {p.name} · naročeno {formatDate(p.created_at)}
                  </p>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-3">
                      <form action={confirm}>
                        <input type="hidden" name="pass_id" value={p.id} />
                        <button type="submit" className={buttonClasses("primary", "sm")}>
                          Plačilo prejeto – aktiviraj<span className="sr-only">: {who(p)}</span>
                        </button>
                      </form>
                      <CancelPassForm spaceSlug={slug} passId={p.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Aktivne karte (${active.length})`}>
          {active.length === 0 ? (
            <p className="text-sm text-ink-muted">Še ni aktivnih kart.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="active-passes">
              {active.map((p) => {
                const u = usedOf(p.id);
                const expired = !!p.valid_until && Date.parse(p.valid_until) < now;
                return (
                  <li key={p.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold break-words">{who(p)}</p>
                      <span className="text-sm tabular-nums" data-testid="pass-usage">
                        {u} / {p.visits} porabljenih
                      </span>
                    </div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                      {p.name} · velja do {p.valid_until ? formatDate(p.valid_until) : "–"}
                      {expired && <Badge tone="brand">Potekla</Badge>}
                    </p>
                    {isAdmin && (
                      <div className="flex flex-wrap gap-4">
                        <ExtendPassForm spaceSlug={slug} passId={p.id} min={today} />
                        <CancelPassForm spaceSlug={slug} passId={p.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Vrste kart">
          {(types ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Še nimaš kart.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="pass-types">
              {(types ?? []).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      {t.name} {!t.active && <Badge>Skrita</Badge>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {t.visits} obiskov · {formatAmount(t.price_cents)} · {t.validity_days} dni
                      {t.payment_link ? " · spletno plačilo" : ""}
                    </p>
                  </div>
                  {isAdmin && (
                    <form action={toggle}>
                      <input type="hidden" name="type_id" value={t.id} />
                      <input type="hidden" name="active" value={t.active ? "0" : "1"} />
                      <button type="submit" className={buttonClasses("ghost", "sm")}>
                        {t.active ? "Skrij" : "Pokaži"}
                        <span className="sr-only"> karto {t.name}</span>
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {isAdmin && (
          <Panel title="Nova karta">
            {space.legal_form ? (
              <PassTypeForm spaceSlug={slug} />
            ) : (
              <p className="text-sm">
                Za prodajo kart najprej{" "}
                <Link href={`/organizator/${slug}/nastavitve`} className="font-semibold underline">
                  izpolni pravni status organizatorja
                </Link>
                .
              </p>
            )}
          </Panel>
        )}
        <Panel title="Kje se karte uporabljajo">
          <p className="text-sm">
            Pri dogodku označi »Prijava s karto«. Takrat se imetnik karte prijavi na termin brez plačila in
            porabi obisk.
          </p>
        </Panel>
      </div>
    </div>
  );
}
