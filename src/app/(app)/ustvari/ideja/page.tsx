import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { listInterestsForFilter } from "@/lib/data/events";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { IdeaForm } from "./idea-form";

export const metadata: Metadata = { title: "Nova ideja" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink href="/ustvari">Ustvari</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nova ideja</h1>
      <p className="text-ink-muted">
        Deli navodila, vzorec ali navdih za ustvarjanje doma. Ideja je brezplačna in vidna vsem v Odkrivanju.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requireUser({ next: "/ustvari/ideja" });
  const interests = await listInterestsForFilter();
  return <IdeaForm interests={interests} />;
}
