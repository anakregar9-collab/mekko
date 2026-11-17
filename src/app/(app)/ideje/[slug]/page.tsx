import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Bookmark, Clock, ExternalLink, Lightbulb, ListChecks, Lock, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/dal";
import { IDEA_PREVIEW_COLUMNS, ideaAuthors } from "@/lib/data/ideas";
import type { CoverTone } from "@/lib/data/events";
import { deleteIdea, toggleSaveIdea } from "@/lib/actions/ideas";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReportForm } from "@/components/messages/forms";
import { SubmitButton } from "@/components/forms";
import { formatDate } from "@/lib/format";
import { coverUrl } from "@/lib/media";

export const metadata: Metadata = { title: "Ideja" };

export default function Page({ params }: PageProps<"/ideje/[slug]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/odkrivanje?pogled=ideje">Ideje</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

interface IdeaRow {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  summary: string | null;
  time_needed: string | null;
  interest_id: number | null;
  cover: string;
  beginner_friendly: boolean;
  family_friendly: boolean;
  status: "published" | "hidden";
  is_demo: boolean;
  published_at: string;
  cover_image_path: string | null;
  body?: string;
  materials?: string | null;
  external_url?: string | null;
  hidden_reason?: string | null;
}

async function Content({ params }: { params: PageProps<"/ideje/[slug]">["params"] }) {
  const { slug } = await params;
  const profile = await getMyProfile();
  const supabase = await createClient();
  const columns = profile
    ? `${IDEA_PREVIEW_COLUMNS}, body, materials, external_url, hidden_reason`
    : IDEA_PREVIEW_COLUMNS;
  const { data } = await supabase.from("ideas").select(columns).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const idea = data as unknown as IdeaRow;
  const mine = profile?.id === idea.author_id;

  const [authors, { data: interest }, { data: saved }] = await Promise.all([
    ideaAuthors([idea.id]),
    idea.interest_id
      ? supabase.from("interests").select("label_sl").eq("id", idea.interest_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile
      ? supabase.from("saved_ideas").select("idea_id").eq("idea_id", idea.id).eq("profile_id", profile.id)
      : Promise.resolve({ data: [] }),
  ]);
  const author = authors.get(idea.id);
  const isSaved = (saved ?? []).length > 0;
  const steps = (idea.body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl space-y-5" data-testid="idea">
      <Cover
        tone={idea.cover as CoverTone}
        imageUrl={coverUrl(idea.cover_image_path)}
        alt={`Fotografija ideje ${idea.title}`}
        priority
        className="h-40 rounded-[var(--radius-card)] sm:h-56"
      />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="sun">
            <Lightbulb aria-hidden="true" className="size-3" /> Ideja
          </Badge>
          {interest && <Badge tone="clay">{interest.label_sl}</Badge>}
          {idea.beginner_friendly && <Badge tone="sage">Za začetnike</Badge>}
          {idea.family_friendly && <Badge tone="sun">Za otroke in družine</Badge>}
          {idea.is_demo && <Badge>Testna ideja</Badge>}
          {idea.status === "hidden" && <Badge tone="brand">Skrita</Badge>}
        </div>
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight break-words">
          {idea.title}
        </h1>
        {idea.summary && <p className="text-lg text-ink-muted">{idea.summary}</p>}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {author && <span>{author.display_name}</span>}
          <span>{formatDate(idea.published_at)}</span>
          {idea.time_needed && (
            <span className="flex items-center gap-1">
              <Clock aria-hidden="true" className="size-4" /> {idea.time_needed}
            </span>
          )}
        </p>
        {mine && idea.status === "hidden" && (
          <p role="status" className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
            Moderatorji so idejo skrili: {idea.hidden_reason}
          </p>
        )}
      </div>

      {profile ? (
        <>
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ListChecks aria-hidden="true" className="size-5 text-ink-muted" /> Navodila
            </h2>
            <ol className="space-y-2" data-testid="idea-steps">
              {steps.map((s, i) => (
                <li key={i} className="rounded-2xl bg-surface p-3 leading-relaxed ring-1 ring-line">
                  {s}
                </li>
              ))}
            </ol>
          </section>
          {idea.materials && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Package aria-hidden="true" className="size-5 text-ink-muted" /> Potrebščine
              </h2>
              <p className="whitespace-pre-line">{idea.materials}</p>
            </section>
          )}
          {idea.external_url && (
            <a
              href={idea.external_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-strong underline"
            >
              Odpri povezavo <ExternalLink aria-hidden="true" className="size-4" />
              <span className="sr-only">(zunanja stran, odpre se nova stran)</span>
            </a>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <form action={toggleSaveIdea}>
              <input type="hidden" name="idea_id" value={idea.id} />
              <input type="hidden" name="slug" value={idea.slug} />
              <input type="hidden" name="saved" value={isSaved ? "1" : "0"} />
              <button type="submit" className={buttonClasses("secondary", "md")} aria-pressed={isSaved}>
                <Bookmark aria-hidden="true" className="size-5" fill={isSaved ? "currentColor" : "none"} />
                {isSaved ? "Shranjeno" : "Shrani"}
              </button>
            </form>
            {mine && (
              <Link href={`/ideje/${idea.slug}/uredi`} className={buttonClasses("secondary", "md")}>
                Uredi idejo
              </Link>
            )}
            {mine && (
              <form action={deleteIdea}>
                <input type="hidden" name="idea_id" value={idea.id} />
                <SubmitButton variant="ghost" pendingText="Brišem …">
                  Izbriši idejo
                </SubmitButton>
              </form>
            )}
          </div>
          {!mine && idea.status === "published" && (
            <ReportForm targetType="idea" targetId={idea.id} label="Prijavi idejo" />
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-2xl bg-lilac-soft p-5 text-lilac-ink" data-testid="login-gate">
          <p className="flex items-center gap-2 font-semibold">
            <Lock aria-hidden="true" className="size-5" /> Navodila in potrebščine vidijo prijavljeni
          </p>
          <p className="text-sm">Račun je brezplačen in narejen v minuti.</p>
          <Link
            href={`/prijava?naprej=${encodeURIComponent(`/ideje/${idea.slug}`)}`}
            className={buttonClasses("primary", "md")}
          >
            Prijavi se za ogled
          </Link>
        </div>
      )}
    </article>
  );
}
