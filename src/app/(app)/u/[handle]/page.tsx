import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getFeedProfile, listAuthorPosts } from "@/lib/data/feed";
import { followAction } from "@/lib/actions/feed";
import { PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";
import { buttonClasses } from "@/components/ui/button";
import { pluralSl } from "@/lib/format";

export const metadata: Metadata = { title: "Profil" };

export default function Page({ params }: PageProps<"/u/[handle]">) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const { handle } = await params;
  await requireUser({ next: `/u/${handle}` });
  const profile = await getFeedProfile(handle);
  if (!profile) notFound();
  const posts = await listAuthorPosts(profile.id);
  const lockedPrivate =
    profile.visibility === "private" && !profile.is_me && profile.follow_status !== "active";

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold break-words">{profile.display_name}</h1>
            <p className="text-sm text-ink-muted">@{profile.handle}</p>
          </div>
          {profile.is_me ? (
            <Link href="/moj-mekko/profil" className={buttonClasses("secondary", "sm")}>
              Uredi profil
            </Link>
          ) : (
            <form action={followAction}>
              <input type="hidden" name="profile_id" value={profile.id} />
              <input type="hidden" name="handle" value={profile.handle} />
              <input type="hidden" name="follow" value={profile.follow_status ? "0" : "1"} />
              <SubmitButton
                size="sm"
                variant={profile.follow_status ? "secondary" : "primary"}
                pendingText="…"
              >
                {profile.follow_status === "active"
                  ? "Slediš ✓"
                  : profile.follow_status === "pending"
                    ? "Prošnja poslana"
                    : "Sledi"}
              </SubmitButton>
            </form>
          )}
        </div>
        {profile.bio && <p className="whitespace-pre-line">{profile.bio}</p>}
        <dl className="flex gap-6 text-sm" data-testid="profile-counts">
          <div>
            <dt className="text-ink-muted">Objave</dt>
            <dd className="font-bold">{profile.posts}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">
              {pluralSl(profile.followers, ["Sledilec", "Sledilca", "Sledilci", "Sledilcev"])}
            </dt>
            <dd className="font-bold">{profile.followers}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Sledi</dt>
            <dd className="font-bold">{profile.following}</dd>
          </div>
        </dl>
      </section>

      {lockedPrivate ? (
        <p className="flex items-center gap-2 rounded-2xl bg-surface p-4 text-ink-muted ring-1 ring-line">
          <Lock aria-hidden="true" className="size-5" /> Profil je zaseben. Objave vidijo odobreni sledilci.
        </p>
      ) : posts.length === 0 ? (
        <p className="text-ink-muted">Še ni objav.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1" data-testid="profile-grid">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/objave/${p.id}`}
                className="relative block aspect-square overflow-hidden rounded-lg bg-cream"
              >
                {p.photos[0] && (
                  <Image
                    src={p.photos[0]}
                    alt={p.caption ? `Objava: ${p.caption.slice(0, 60)}` : "Objava"}
                    fill
                    unoptimized
                    sizes="33vw"
                    className="object-cover"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
