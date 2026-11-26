import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { listInterests, myInterestIds } from "@/lib/data/profile";
import { PageSkeleton } from "@/components/page-skeleton";
import { BackLink } from "@/components/back-link";
import { InterestsForm } from "./interests-form";

export const metadata: Metadata = { title: "Zanimanja" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Zanimanja</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/zanimanja" });
  const [interests, selected] = await Promise.all([listInterests(), myInterestIds(profile.id)]);
  return <InterestsForm interests={interests} selected={selected} />;
}
