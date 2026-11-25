import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatAmount, formatDate } from "@/lib/format";
import { listInterestsForFilter } from "@/lib/data/events";
import { confirmEnrollment, moveLesson } from "@/lib/actions/courses";
import {
  CancelEnrollmentForm,
  CourseForm,
  CourseStatusForm,
  LessonEditForm,
  LessonForm,
  RemoveLessonForm,
} from "@/components/courses/course-forms";

export const metadata: Metadata = { title: "Urejanje tečaja" };

export default function Page({ params }: PageProps<"/organizator/[space]/tecaji/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

interface EnrollmentRow {
  id: string;
  status: "awaiting" | "active" | "cancelled";
  price_cents: number | null;
  created_at: string;
  profile_id: string;
  person: { display_name: string; handle: string } | null;
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/tecaji/[id]">["params"] }) {
  const { space: slug, id } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const isAdmin = hasSpaceRole(role, "admin");
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, summary, description, interest_id, price_cents, payment_instructions, payment_link, status, space_id, hidden_reason",
    )
    .eq("id", id)
    .maybeSingle();
  if (!course || course.space_id !== space.id) notFound();
  const [{ data: lessons }, { data: raw }, interests] = await Promise.all([
    supabase
      .from("course_lessons")
      .select("id, position, title, youtube_id, notes, is_preview")
      .eq("course_id", id)
      .order("position"),
    supabase
      .from("course_enrollments")
      .select(
        "id, status, price_cents, created_at, profile_id, person:profiles!course_enrollments_profile_id_fkey(display_name, handle)",
      )
      .eq("course_id", id)
      .neq("status", "cancelled")
      .order("created_at"),
    listInterestsForFilter(),
  ]);
  const enrollments = (raw ?? []) as unknown as EnrollmentRow[];
  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: progress } = lessonIds.length
    ? await supabase
        .from("lesson_progress")
        .select("profile_id, lesson_id")
        .eq("done", true)
        .in("lesson_id", lessonIds)
    : { data: [] as { profile_id: string; lesson_id: string }[] };
  const doneBy = (pid: string) => (progress ?? []).filter((p) => p.profile_id === pid).length;
  const awaiting = enrollments.filter((e) => e.status === "awaiting");
  const active = enrollments.filter((e) => e.status === "active");
  const who = (e: EnrollmentRow) =>
    e.person ? `${e.person.display_name} (@${e.person.handle})` : "Uporabnik";
  const move = moveLesson.bind(null, slug, id);
  const confirm = confirmEnrollment.bind(null, slug, id);
  const status = course.status as "draft" | "published" | "hidden";

  return (
    <div className="space-y-5">
      <BackLink href={`/organizator/${slug}/tecaji`}>Tečaji</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone={status === "published" ? "sage" : "neutral"}>
            {status === "published" ? "Objavljen" : status === "hidden" ? "Skrit" : "Osnutek"}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight break-words">
            {course.title}
          </h1>
          <p className="text-ink-muted">
            {course.price_cents ? formatAmount(course.price_cents) : "Brezplačen"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {status === "published" && (
            <Link
              href={`/tecaji/${course.slug}`}
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-strong underline"
            >
              Javna stran <ExternalLink aria-hidden="true" className="size-4" />
            </Link>
          )}
          {isAdmin && !course.hidden_reason && (
            <CourseStatusForm spaceSlug={slug} courseId={id} status={status} />
          )}
        </div>
      </div>

      {course.hidden_reason && (
        <p
          role="status"
          className="rounded-2xl bg-brand-soft p-3 text-brand-strong"
          data-testid="course-hidden-notice"
        >
          Moderatorji Mekka so tečaj skrili: {course.hidden_reason}. Za ponovno objavo jim piši.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Panel title={`Lekcije (${(lessons ?? []).length})`}>
            {(lessons ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">
                Dodaj prvo lekcijo. Za objavo potrebuješ vsaj eno lekcijo z videom.
              </p>
            ) : (
              <ol className="divide-y divide-line" data-testid="lesson-list">
                {(lessons ?? []).map((l, i, all) => (
                  <li key={l.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">
                        {i + 1}. {l.title}
                      </p>
                      <p className="flex flex-wrap gap-1.5 text-sm text-ink-muted">
                        {l.youtube_id ? <span>YouTube video</span> : <Badge tone="sun">Brez videa</Badge>}
                        {l.is_preview && <Badge tone="sky">Brezplačen predogled</Badge>}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <form action={move}>
                          <input type="hidden" name="lesson_id" value={l.id} />
                          <input type="hidden" name="dir" value="up" />
                          <button
                            type="submit"
                            disabled={i === 0}
                            className={buttonClasses("ghost", "sm", "min-w-11")}
                          >
                            <ArrowUp aria-hidden="true" className="size-4" />
                            <span className="sr-only">Premakni gor: {l.title}</span>
                          </button>
                        </form>
                        <form action={move}>
                          <input type="hidden" name="lesson_id" value={l.id} />
                          <input type="hidden" name="dir" value="down" />
                          <button
                            type="submit"
                            disabled={i === all.length - 1}
                            className={buttonClasses("ghost", "sm", "min-w-11")}
                          >
                            <ArrowDown aria-hidden="true" className="size-4" />
                            <span className="sr-only">Premakni dol: {l.title}</span>
                          </button>
                        </form>
                        <RemoveLessonForm spaceSlug={slug} courseId={id} lessonId={l.id} title={l.title} />
                      </div>
                    )}
                    {isAdmin && (
                      <LessonEditForm
                        spaceSlug={slug}
                        courseId={id}
                        lesson={{
                          id: l.id,
                          title: l.title,
                          video: l.youtube_id ? `https://youtu.be/${l.youtube_id}` : "",
                          notes: l.notes ?? "",
                          is_preview: l.is_preview,
                        }}
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          {isAdmin && (
            <Panel title="Nova lekcija">
              <LessonForm spaceSlug={slug} courseId={id} />
            </Panel>
          )}
          <Panel title={`Čakajo na potrditev plačila (${awaiting.length})`}>
            {awaiting.length === 0 ? (
              <p className="text-sm text-ink-muted">Ni odprtih naročil.</p>
            ) : (
              <ul className="divide-y divide-line" data-testid="course-requests">
                {awaiting.map((e) => (
                  <li key={e.id} className="space-y-2 py-3">
                    <p className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold break-words">{who(e)}</span>
                      <span className="text-sm tabular-nums">{formatAmount(e.price_cents ?? 0)}</span>
                    </p>
                    <p className="text-sm text-ink-muted">Naročeno {formatDate(e.created_at)}</p>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-3">
                        <form action={confirm}>
                          <input type="hidden" name="enrollment_id" value={e.id} />
                          <button type="submit" className={buttonClasses("primary", "sm")}>
                            Plačilo prejeto – odkleni<span className="sr-only">: {who(e)}</span>
                          </button>
                        </form>
                        <CancelEnrollmentForm spaceSlug={slug} courseId={id} enrollmentId={e.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={`Udeleženci (${active.length})`}>
            {active.length === 0 ? (
              <p className="text-sm text-ink-muted">Še nihče.</p>
            ) : (
              <ul className="divide-y divide-line" data-testid="course-learners">
                {active.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="font-semibold break-words">{who(e)}</span>
                    <span className="text-sm text-ink-muted tabular-nums">
                      {doneBy(e.profile_id)} / {(lessons ?? []).length} lekcij
                    </span>
                    {isAdmin && <CancelEnrollmentForm spaceSlug={slug} courseId={id} enrollmentId={e.id} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        {isAdmin && (
          <Panel title="Podatki o tečaju">
            <CourseForm
              spaceSlug={slug}
              courseId={id}
              interests={interests}
              initial={{
                title: course.title,
                summary: course.summary ?? "",
                description: course.description ?? "",
                interest_id: course.interest_id ? String(course.interest_id) : "",
                paid: String(course.price_cents !== null),
                price: course.price_cents ? (course.price_cents / 100).toFixed(2).replace(".", ",") : "",
                payment_instructions: course.payment_instructions ?? "",
                payment_link: course.payment_link ?? "",
              }}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
