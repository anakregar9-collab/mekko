import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { legalFormLabel, spaceKindLabel, type LegalForm } from "@/lib/spaces";
import { VerifyForm } from "./verify-form";
import { inputCls } from "@/components/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Prostori" };

const verificationLabel = {
  unverified: "Nepreverjen",
  pending: "Čaka na preverjanje",
  verified: "Preverjen",
  rejected: "Zavrnjen",
} as const;

export default function Page({ searchParams }: PageProps<"/admin/prostori">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Prostori</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/prostori">["searchParams"] }) {
  const { roles } = await requirePlatformRole(["super_admin", "admin", "moderator", "support"]);
  const canVerify = roles.includes("super_admin") || roles.includes("admin");
  const sp = await searchParams;
  const q =
    typeof sp.q === "string"
      ? sp.q
          .replace(/[^\p{L}\p{N} ._-]/gu, "")
          .trim()
          .slice(0, 60)
      : "";
  const onlySuspended = sp.blokirani === "1";
  const supabase = await createClient();
  let query = supabase
    .from("spaces")
    .select("id, slug, name, kind, city, verification_status, legal_form, created_at, suspended_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,city.ilike.%${q}%`);
  if (onlySuspended) query = query.not("suspended_at", "is", null);
  const { data: spaces } = await query;
  // Verification requests first.
  const sorted = [...(spaces ?? [])].sort(
    (a, b) => Number(b.verification_status === "pending") - Number(a.verification_status === "pending"),
  );
  return (
    <div className="space-y-4">
      <form role="search" className="flex flex-wrap gap-2">
        <label htmlFor="sq" className="sr-only">
          Išči prostor po imenu, naslovu ali kraju
        </label>
        <input
          id="sq"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ime, naslov ali kraj"
          className={inputCls + " min-w-0 flex-1"}
        />
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Išči
        </button>
        <Link
          href={onlySuspended ? "/admin/prostori" : "/admin/prostori?blokirani=1"}
          className={buttonClasses("ghost", "md")}
        >
          {onlySuspended ? "Vsi prostori" : "Samo blokirani"}
        </Link>
      </form>
      <ul
        className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
        data-testid="admin-spaces"
      >
        {sorted.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/prostori/${s.id}`}
                className="font-semibold break-words underline-offset-2 hover:underline"
              >
                {s.name}
              </Link>
              <p className="text-sm text-ink-muted">
                {s.slug} · {s.city ?? "brez kraja"} · {formatDate(s.created_at)}
              </p>
            </div>
            {s.suspended_at && <Badge tone="brand">Blokiran</Badge>}
            <Badge tone="lilac">{spaceKindLabel[s.kind]}</Badge>
            <Badge>{s.legal_form ? legalFormLabel[s.legal_form as LegalForm] : "Brez statusa"}</Badge>
            <Badge
              tone={
                s.verification_status === "verified"
                  ? "sky"
                  : s.verification_status === "pending"
                    ? "sun"
                    : "neutral"
              }
            >
              {verificationLabel[s.verification_status]}
            </Badge>
            {canVerify && s.verification_status === "pending" && <VerifyForm spaceId={s.id} name={s.name} />}
          </li>
        ))}
        {spaces?.length === 0 && <li className="p-4 text-ink-muted">Ni zadetkov.</li>}
      </ul>
    </div>
  );
}
