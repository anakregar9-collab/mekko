import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";
import { getMyProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Cover } from "@/components/ui/cover";
import { buttonClasses } from "@/components/ui/button";
import { PaymentDetails } from "@/components/passes/payment-details";
import { EnrollForm } from "@/components/courses/course-forms";
import { ReportForm } from "@/components/messages/forms";
import { formatAmount, pluralSl } from "@/lib/format";
import { youTubeEmbedUrl } from "@/lib/youtube";
import { setLessonDone, withdrawEnrollment } from "@/lib/actions/courses";
import type { CoverTone } from "@/lib/data/events";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Tečaj" };

export default function Page(props: PageProps<"/tecaji/[slug]">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<PageSkeleton />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  cover: string;
  price_cents: number | null;
  status: string;
  space_id: string;
  payment_instructions?: string | null;
  payment_link?: string | null;
}

async function Content({ params, searchParams }: PageProps<"/tecaji/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const profile = await getMyProfile();
  const supabase = await createClient();
  const cols = "id, slug, title, summary, description, cover, price_cents, status, space_id";
  const { data: raw } = await supabase
    .from("courses")
    .select(profile ? `${cols}, payment_instructions, payment_link` : cols)
    .eq("slug", slug)
    .maybeSingle();
  if (!raw) notFound();
  const course = raw as unknown as CourseRow;

  const [{ data: space }, { data: outline }, { data: open }, { data: mine }] = await Promise.all([
    supabase.from("spaces").select("name, slug").eq("id", course.space_id).maybeSingle(),
    supabase.rpc("course_outline", { p_course: course.id }),
    supabase
      .from("course_lessons")
      .select("id, title, youtube_id, notes, is_preview")
      .eq("course_id", course.id),
    profile
      ? supabase
          .from("course_enrollments")
          .select("status")
          .eq("course_id", course.id)
          .eq("profile_id", profile.id)
          .neq("status", "cancelled")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const lessons = outline ?? [];
  const playable = new Map((open ?? []).map((l) => [l.id, l]));
  const enrolled = mine?.status === "active";
  const { data: progress } =
    enrolled && profile
      ? await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("profile_id", profile.id)
          .eq("done", true)
          .in(
            "lesson_id",
            lessons.map((l) => l.id),
          )
      : { data: [] as { lesson_id: string }[] };
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const requested = typeof sp.lekcija === "string" ? sp.lekcija : undefined;
  const currentId =
    (requested && playable.has(requested) ? requested : undefined) ??
    lessons.find((l) => playable.get(l.id)?.youtube_id)?.id;
  const current = currentId ? playable.get(currentId) : undefined;
  const currentIndex = lessons.findIndex((l) => l.id === currentId);
  const next = lessons.slice(currentIndex + 1).find((l) => playable.has(l.id));
  const paid = course.price_cents !== null;
  // The team can always open its own course; they do not report it.
  const isTeam =
    !!profile && !enrolled && !!(await supabase.rpc("has_course_access", { p_course: course.id })).data;
  const markDone = setLessonDone.bind(null, course.slug);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem] md:grid-rows-[auto_1fr]">
      {/* Phone order: title + player, then access + lessons, then the description. */}
      <div className="min-w-0 space-y-4 md:col-start-1 md:row-start-1">
        {space && <BackLink href={`/prostori/${space.slug}`}>{space.name}</BackLink>}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="lilac">Posnet tečaj</Badge>
          <Badge>
            {lessons.length} {pluralSl(lessons.length, ["lekcija", "lekciji", "lekcije", "lekcij"])}
          </Badge>
          {course.status !== "published" && <Badge tone="sun">Ni objavljen (vidi ga samo ekipa)</Badge>}
        </div>
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight break-words">
          {course.title}
        </h1>
        {current?.youtube_id ? (
          <div className="space-y-3" data-testid="lesson-player">
            <div className="aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
              <iframe
                src={youTubeEmbedUrl(current.youtube_id)}
                title={`Video: ${current.title}`}
                className="size-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <h2 className="font-display text-xl font-bold break-words">
              {currentIndex + 1}. {current.title}
            </h2>
            {current.notes && <p className="leading-relaxed whitespace-pre-line">{current.notes}</p>}
            <div className="flex flex-wrap items-center gap-3">
              {enrolled && (
                <form action={markDone}>
                  <input type="hidden" name="lesson_id" value={current.id} />
                  <input type="hidden" name="done" value={done.has(current.id) ? "0" : "1"} />
                  <button
                    type="submit"
                    aria-pressed={done.has(current.id)}
                    className={buttonClasses(done.has(current.id) ? "secondary" : "primary", "sm")}
                  >
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    {done.has(current.id) ? "Opravljeno" : "Označi kot opravljeno"}
                  </button>
                </form>
              )}
              {next && (
                <Link
                  href={`/tecaji/${course.slug}?lekcija=${next.id}`}
                  className={buttonClasses("ghost", "sm")}
                >
                  Naslednja lekcija
                </Link>
              )}
            </div>
          </div>
        ) : (
          <Cover tone={course.cover as CoverTone} className="h-48 rounded-[var(--radius-card)]" />
        )}
      </div>

      <aside className="space-y-4 md:col-start-2 md:row-span-2 md:row-start-1">
        <div
          className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
          data-testid="course-access"
        >
          <p className="font-display text-2xl font-extrabold">
            {paid ? formatAmount(course.price_cents!) : "Brezplačno"}
          </p>
          {enrolled ? (
            <p className="font-semibold text-sage-ink">
              Tečaj je tvoj · opravljenih {done.size} od {lessons.length}
            </p>
          ) : mine?.status === "awaiting" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Naročeno – organizator odklene tečaj, ko prejme plačilo.
              </p>
              <PaymentDetails
                instructions={course.payment_instructions ?? null}
                link={course.payment_link ?? null}
              />
              <form action={withdrawEnrollment}>
                <input type="hidden" name="course_id" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <button type="submit" className={buttonClasses("ghost", "sm")}>
                  Prekliči naročilo
                </button>
              </form>
            </div>
          ) : isTeam && space ? (
            <p className="text-sm">
              Si v ekipi tega tečaja.{" "}
              <Link
                href={`/organizator/${space.slug}/tecaji/${course.id}`}
                className="font-semibold underline"
              >
                Uredi tečaj
              </Link>
            </p>
          ) : profile ? (
            course.status === "published" && (
              <EnrollForm slug={course.slug} courseId={course.id} paid={paid} />
            )
          ) : (
            <Link
              href={`/prijava?naprej=${encodeURIComponent(`/tecaji/${course.slug}`)}`}
              className={buttonClasses("primary", "md", "w-full")}
            >
              Prijavi se za dostop
            </Link>
          )}
          {paid && !enrolled && !isTeam && (
            <p className="text-xs text-ink-muted">Plačilo gre neposredno organizatorju, ne prek Mekka.</p>
          )}
        </div>

        <nav
          aria-label="Lekcije"
          className="rounded-[var(--radius-card)] bg-surface p-3 shadow-[var(--shadow-card)]"
        >
          <h2 className="px-2 pb-2 font-display text-lg font-bold">Lekcije</h2>
          <ol className="space-y-1" data-testid="course-outline">
            {lessons.map((l, i) => {
              const canPlay = playable.has(l.id);
              const isCurrent = l.id === currentId;
              const Icon = done.has(l.id) ? CheckCircle2 : canPlay ? (isCurrent ? PlayCircle : Circle) : Lock;
              const label = (
                <>
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    {i + 1}. {l.title}
                    {l.is_preview && !enrolled && (
                      <span className="block text-xs text-sky-ink">Brezplačen predogled</span>
                    )}
                  </span>
                  {!canPlay && <span className="sr-only"> (zaklenjeno)</span>}
                  {done.has(l.id) && <span className="sr-only"> (opravljeno)</span>}
                </>
              );
              return (
                <li key={l.id}>
                  {canPlay ? (
                    <Link
                      href={`/tecaji/${course.slug}?lekcija=${l.id}`}
                      aria-current={isCurrent ? "true" : undefined}
                      className={cn(
                        "flex min-h-11 items-start gap-2 rounded-xl px-2 py-2 text-sm",
                        isCurrent ? "bg-brand-soft font-semibold" : "hover:bg-cream",
                      )}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="flex min-h-11 items-start gap-2 px-2 py-2 text-sm text-ink-muted">
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {profile && course.status === "published" && !isTeam && (
          <ReportForm targetType="course" targetId={course.id} label="Prijavi tečaj" />
        )}
      </aside>

      <div className="min-w-0 space-y-4 md:col-start-1 md:row-start-2">
        {course.summary && <p className="text-lg text-ink-muted">{course.summary}</p>}
        {course.description && (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold">O tečaju</h2>
            <p className="leading-relaxed whitespace-pre-line">{course.description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
