import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { StatTile } from "@/components/workspace/stat-tile";

export const metadata: Metadata = { title: "Administracija" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Administracija" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin", "moderator", "finance", "support"]);
  const supabase = await createClient();
  const [users, spaces, requests, suspended] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("spaces").select("id", { count: "exact", head: true }),
    supabase
      .from("data_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Administracija</h1>
        <p className="text-ink-muted">Vse spremembe se zapišejo v revizijsko sled.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Uporabniki" value={String(users.count ?? 0)} />
        <StatTile label="Prostori" value={String(spaces.count ?? 0)} />
        <StatTile label="Odprte zahteve GDPR" value={String(requests.count ?? 0)} />
        <StatTile label="Omejeni računi" value={String(suspended.count ?? 0)} />
      </div>
      <p className="text-sm text-ink-muted">
        Finančni pregledi bodo na voljo, ko bodo plačila povezana (po pravnem pregledu).
      </p>
    </div>
  );
}
