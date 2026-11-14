import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Moje aktivnosti" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Moje aktivnosti" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireUser({ next: "/moje-aktivnosti" });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moje aktivnosti</h1>
      <EmptyState title="Še nimaš rezervacij">
        <p>Ko bodo dogodki na voljo, boš tukaj videl/-a svoje prijave in koledar.</p>
        <Link href="/odkrivanje" className="mt-3 inline-block font-semibold text-brand-strong underline">
          Na odkrivanje
        </Link>
      </EmptyState>
    </div>
  );
}
