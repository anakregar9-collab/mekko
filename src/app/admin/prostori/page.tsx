import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { spaceKindLabel } from "@/lib/spaces";

export const metadata: Metadata = { title: "Prostori" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Prostori</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin", "moderator", "support"]);
  const supabase = await createClient();
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, slug, name, kind, city, verification_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      {(spaces ?? []).map((s) => (
        <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-semibold break-words">{s.name}</p>
            <p className="text-sm text-ink-muted">
              {s.slug} · {s.city ?? "brez kraja"} · {formatDate(s.created_at)}
            </p>
          </div>
          <Badge tone="lilac">{spaceKindLabel[s.kind]}</Badge>
          <Badge tone={s.verification_status === "verified" ? "sky" : "neutral"}>
            {s.verification_status === "verified" ? "Preverjen" : "Nepreverjen"}
          </Badge>
        </li>
      ))}
      {spaces?.length === 0 && <li className="p-4 text-ink-muted">Še ni prostorov.</li>}
    </ul>
  );
}
