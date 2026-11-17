import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { listInterestsForFilter } from "@/lib/data/events";
import { coverUrl } from "@/lib/media";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { IdeaForm } from "@/app/(app)/ustvari/ideja/idea-form";

export const metadata: Metadata = { title: "Uredi idejo" };

export default function Page({ params }: PageProps<"/ideje/[slug]/uredi">) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Suspense fallback={<PageSkeleton title="Uredi idejo" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/ideje/[slug]/uredi">["params"] }) {
  const { slug } = await params;
  const profile = await requireUser({ next: `/ideje/${slug}/uredi` });
  const supabase = await createClient();
  const { data: idea } = await supabase
    .from("ideas")
    .select(
      "id, author_id, title, summary, body, materials, time_needed, external_url, interest_id, cover, cover_image_path, beginner_friendly, family_friendly",
    )
    .eq("slug", slug)
    .maybeSingle();
  // Only the author may edit; everyone else gets a 404 (existence is not revealed).
  if (!idea || idea.author_id !== profile.id) notFound();
  const interests = await listInterestsForFilter();
  return (
    <>
      <BackLink href={`/ideje/${slug}`}>Nazaj na idejo</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Uredi idejo</h1>
      <IdeaForm
        interests={interests}
        edit={{
          id: idea.id,
          photoUrl: coverUrl(idea.cover_image_path),
          values: {
            title: idea.title,
            summary: idea.summary ?? "",
            body: idea.body,
            materials: idea.materials ?? "",
            time_needed: idea.time_needed ?? "",
            external_url: idea.external_url ?? "",
            interest_id: idea.interest_id ? String(idea.interest_id) : "",
            cover: idea.cover,
            beginner_friendly: String(idea.beginner_friendly),
            family_friendly: String(idea.family_friendly),
          },
        }}
      />
    </>
  );
}
