import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PaymentDetails } from "@/components/passes/payment-details";
import { formatAmount, formatDate, pluralSl } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { withdrawPass } from "@/lib/actions/passes";

export const metadata: Metadata = { title: "Moje karte" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moje karte</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

interface Row {
  id: string;
  name: string;
  visits: number;
  price_cents: number;
  status: "awaiting" | "active" | "cancelled";
  valid_until: string | null;
  cancel_reason: string | null;
  created_at: string;
  space: { name: string; slug: string } | null;
  type: { payment_instructions: string; payment_link: string | null } | null;
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/karte" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("passes")
    .select(
      "id, name, visits, price_cents, status, valid_until, cancel_reason, created_at, space:spaces(name, slug), type:pass_types(payment_instructions, payment_link)",
    )
    .eq("holder_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) {
    return (
      <EmptyState title="Še nimaš kart">
        <p>Karte za več obiskov kupiš na strani prostora (studia, skupnosti), če jih ta ponuja.</p>
      </EmptyState>
    );
  }
  const ids = rows.filter((r) => r.status === "active").map((r) => r.id);
  const { data: used } = ids.length
    ? await supabase.from("bookings").select("pass_id, quantity").in("pass_id", ids).eq("status", "confirmed")
    : { data: [] as { pass_id: string | null; quantity: number }[] };
  const now = nowMs();

  return (
    <ul className="space-y-3" data-testid="my-passes">
      {rows.map((r) => {
        const u = (used ?? []).filter((b) => b.pass_id === r.id).reduce((n, b) => n + b.quantity, 0);
        const left = r.visits - u;
        const expired = r.status === "active" && !!r.valid_until && Date.parse(r.valid_until) < now;
        return (
          <li
            key={r.id}
            className="space-y-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              {r.status === "awaiting" && <Badge tone="sun">Čaka na plačilo</Badge>}
              {r.status === "active" && !expired && <Badge tone="sage">Aktivna</Badge>}
              {expired && <Badge tone="brand">Potekla</Badge>}
              {r.status === "cancelled" && <Badge>Preklicana</Badge>}
            </div>
            <h2 className="font-display text-lg font-bold break-words">{r.name}</h2>
            {r.space && (
              <Link
                href={`/prostori/${r.space.slug}`}
                className="text-sm font-semibold text-brand-strong underline"
              >
                {r.space.name}
              </Link>
            )}
            {r.status === "active" && (
              <p data-testid="pass-left">
                <strong className="tabular-nums">
                  Ostane {left} {pluralSl(left, ["obisk", "obiska", "obiski", "obiskov"])}
                </strong>{" "}
                od {r.visits} · velja do {r.valid_until ? formatDate(r.valid_until) : "–"}
              </p>
            )}
            {r.status === "awaiting" && (
              <>
                <p className="text-sm">
                  {formatAmount(r.price_cents)} · naročeno {formatDate(r.created_at)}. Karta začne veljati, ko
                  organizator potrdi plačilo.
                </p>
                <PaymentDetails
                  instructions={r.type?.payment_instructions ?? null}
                  link={r.type?.payment_link ?? null}
                />
                <form action={withdrawPass}>
                  <input type="hidden" name="pass_id" value={r.id} />
                  <button type="submit" className={buttonClasses("ghost", "sm")}>
                    Prekliči naročilo
                  </button>
                </form>
              </>
            )}
            {r.status === "cancelled" && r.cancel_reason && (
              <p className="text-sm text-ink-muted">Razlog: {r.cancel_reason}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
