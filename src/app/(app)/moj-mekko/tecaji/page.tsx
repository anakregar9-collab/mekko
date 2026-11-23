import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Moji tečaji" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moji tečaji</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

interface Row {
  status: "awaiting" | "active" | "cancelled";
  cancel_reason: string | null;
  course: { id: string; slug: string; title: string } | null;
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/tecaji" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_enrollments")
    .select("status, cancel_reason, course:courses(id, slug, title)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.course);
  if (rows.length === 0) {
    return (
      <EmptyState title="Še nimaš tečajev">
        <p>Posnete tečaje najdeš na straneh prostorov (ustvarjalcev, studiev).</p>
      </EmptyState>
    );
  }
  const courseIds = rows.filter((r) => r.status === "active").map((r) => r.course!.id);
  const [{ data: lessons }, { data: progress }] = await Promise.all([
    courseIds.length
      ? supabase.from("course_lessons").select("id, course_id").in("course_id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
    supabase.from("lesson_progress").select("lesson_id").eq("profile_id", profile.id),
  ]);
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  return (
    <ul className="space-y-3" data-testid="my-courses">
      {rows.map((r) => {
        const ls = (lessons ?? []).filter((l) => l.course_id === r.course!.id);
        const d = ls.filter((l) => done.has(l.id)).length;
        return (
          <li
            key={r.course!.id + r.status}
            className="space-y-1 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-wrap gap-1.5">
              {r.status === "active" && <Badge tone="sage">Odklenjen</Badge>}
              {r.status === "awaiting" && <Badge tone="sun">Čaka na plačilo</Badge>}
              {r.status === "cancelled" && <Badge>Preklican</Badge>}
            </div>
            <Link
              href={`/tecaji/${r.course!.slug}`}
              className="font-display text-lg font-bold break-words underline-offset-2 hover:underline"
            >
              {r.course!.title}
            </Link>
            {r.status === "active" && (
              <p className="text-sm">
                Opravljenih {d} od {ls.length} lekcij
              </p>
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
