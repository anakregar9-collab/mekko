import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { inputCls } from "@/components/forms";
import { buttonClasses } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Uporabniki" };

export default function Page({ searchParams }: PageProps<"/admin/uporabniki">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Uporabniki</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Strip characters that have meaning in PostgREST filter syntax. */
function cleanQuery(q: unknown): string {
  return typeof q === "string"
    ? q
        .replace(/[^\p{L}\p{N} ._-]/gu, "")
        .trim()
        .slice(0, 60)
    : "";
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/uporabniki">["searchParams"] }) {
  const { profile: me, roles } = await requirePlatformRole(["super_admin", "admin", "moderator", "support"]);
  const canChange = roles.includes("super_admin") || roles.includes("admin");
  const q = cleanQuery((await searchParams).q);
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, handle, display_name, status, visibility, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`);
  const { data: users } = await query;

  return (
    <div className="space-y-4">
      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Išči po imenu ali uporabniškem imenu
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ime ali @uporabnik"
          className={inputCls}
        />
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Išči
        </button>
      </form>
      <ul
        className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
        data-testid="admin-users"
      >
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">{u.display_name}</p>
              <p className="text-sm text-ink-muted">
                @{u.handle} · od {formatDate(u.created_at)}
              </p>
            </div>
            <Badge tone={u.status === "active" ? "sage" : "brand"}>
              {u.status === "active" ? "Aktiven" : u.status === "suspended" ? "Omejen" : "Izbrisan"}
            </Badge>
            {canChange && u.id !== me.id && u.status !== "deleted" && (
              <StatusForm profileId={u.id} current={u.status} handle={u.handle} />
            )}
          </li>
        ))}
        {users?.length === 0 && <li className="p-4 text-ink-muted">Ni zadetkov.</li>}
      </ul>
    </div>
  );
}
