import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { PostForm } from "./post-form";

export const metadata: Metadata = { title: "Nova objava" };

export default function Page({ searchParams }: PageProps<"/objave/nova">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackLink href="/feed">Feed</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nova objava</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/objave/nova">["searchParams"] }) {
  await requireUser({ next: "/objave/nova" });
  const sp = await searchParams;
  const supabase = await createClient();
  const ideaSlug = typeof sp.ideja === "string" ? sp.ideja : "";
  const eventSlug = typeof sp.dogodek === "string" ? sp.dogodek : "";
  const [{ data: idea }, { data: event }] = await Promise.all([
    ideaSlug
      ? supabase.from("ideas").select("id, title").eq("slug", ideaSlug).maybeSingle()
      : Promise.resolve({ data: null }),
    eventSlug
      ? supabase.from("events").select("id, title").eq("slug", eventSlug).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return <PostForm idea={idea} event={event} />;
}
