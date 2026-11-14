import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Obvestila" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Obvestila" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireUser({ next: "/obvestila" });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Obvestila</h1>
      <EmptyState title="Ni novih obvestil">
        <p>Tukaj se bodo prikazale potrditve rezervacij, opomniki in spremembe dogodkov.</p>
      </EmptyState>
    </div>
  );
}
