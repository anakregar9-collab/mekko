import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/data/feed";
import { sharePost } from "@/lib/actions/feed";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Pošlji kolegu" };

export default function Page({ params }: PageProps<"/objave/[id]/deli">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Suspense fallback={<PageSkeleton title="Pošlji kolegu" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/objave/[id]/deli">["params"] }) {
  const { id } = await params;
  const me = await requireUser({ next: `/objave/${id}/deli` });
  const post = await getPost(id);
  if (!post) notFound();
  const supabase = await createClient();
  // Share with people you follow (accepted). Messaging rules still apply when sending.
  const { data: follows } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", me.id)
    .eq("status", "active")
    .limit(200);
  const ids = (follows ?? []).map((f) => f.followee_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, display_name, handle").in("id", ids).order("display_name")
    : { data: [] };

  return (
    <>
      <BackLink href={`/objave/${id}`}>Objava</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Pošlji kolegu</h1>
      {(people ?? []).length === 0 ? (
        <EmptyState title="Še nikomur ne slediš">
          <p>Objavo lahko pošlješ ljudem, ki jim slediš.</p>
        </EmptyState>
      ) : (
        <ul
          className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
          data-testid="share-list"
        >
          {(people ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.display_name}</span>
                <span className="block text-sm text-ink-muted">@{p.handle}</span>
              </span>
              <form action={sharePost.bind(null, id, p.id)}>
                <SubmitButton size="sm" pendingText="…">
                  Pošlji<span className="sr-only"> osebi {p.display_name}</span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
