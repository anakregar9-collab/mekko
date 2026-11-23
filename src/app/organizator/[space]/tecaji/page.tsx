import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import { listInterestsForFilter } from "@/lib/data/events";
import { CourseForm } from "@/components/courses/course-forms";

export const metadata: Metadata = { title: "Tečaji" };

const statusLabel = { draft: "Osnutek", published: "Objavljen", hidden: "Skrit" } as const;

export default function Page({ params }: PageProps<"/organizator/[space]/tecaji">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Posneti tečaji</h1>
      <p className="max-w-2xl text-sm text-ink-muted">
        Video tečaji iz lekcij na YouTubu. Brezplačni so takoj na voljo; pri plačljivih kupec plača tebi
        (navodila ali tvoja plačilna povezava), ti pa potrdiš prejem in tečaj se mu odklene.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/tecaji">["params"] }) {
  const { space: slug } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const [{ data: courses }, interests] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, status, price_cents")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false }),
    listInterestsForFilter(),
  ]);
  const ids = (courses ?? []).map((c) => c.id);
  const { data: enr } = ids.length
    ? await supabase
        .from("course_enrollments")
        .select("course_id, status")
        .in("course_id", ids)
        .neq("status", "cancelled")
    : { data: [] as { course_id: string; status: string }[] };
  const count = (id: string, s: string) =>
    (enr ?? []).filter((e) => e.course_id === id && e.status === s).length;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Tvoji tečaji">
        {(courses ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Še nimaš tečajev.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="course-list">
            {(courses ?? []).map((c) => (
              <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/organizator/${slug}/tecaji/${c.id}`}
                    className="font-semibold break-words underline-offset-2 hover:underline"
                  >
                    {c.title}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    {c.price_cents ? formatAmount(c.price_cents) : "Brezplačen"} · {count(c.id, "active")}{" "}
                    udeležencev
                    {count(c.id, "awaiting") ? ` · ${count(c.id, "awaiting")} čaka na potrditev` : ""}
                  </p>
                </div>
                <Badge tone={c.status === "published" ? "sage" : "neutral"}>
                  {statusLabel[c.status as keyof typeof statusLabel]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {hasSpaceRole(role, "admin") && (
        <Panel title="Nov tečaj">
          <CourseForm spaceSlug={slug} interests={interests} />
        </Panel>
      )}
    </div>
  );
}
