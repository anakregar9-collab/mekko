import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Sporočila" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Sporočila" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireUser({ next: "/sporocila" });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Sporočila</h1>
      <EmptyState title="Sporočila prihajajo v M3">
        <p>Zasebna sporočila bodo na voljo skupaj z zaščito pred neželeno pošto in možnostjo blokiranja.</p>
      </EmptyState>
    </div>
  );
}
