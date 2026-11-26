import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";
import { BackLink } from "@/components/back-link";
import { spaceKindSchema } from "@/lib/validation";
import { CreateSpaceForm } from "./create-space-form";

export const metadata: Metadata = { title: "Nov prostor" };

export default function Page({ searchParams }: PageProps<"/organizator/nov-prostor">) {
  return (
    <div className="max-w-2xl space-y-4">
      <BackLink href="/organizator">Moji prostori</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nov prostor</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/organizator/nov-prostor">["searchParams"];
}) {
  await requireUser({ next: "/organizator/nov-prostor" });
  const sp = await searchParams;
  const kind = spaceKindSchema.safeParse(sp.vrsta);
  const name = typeof sp.ime === "string" ? sp.ime.slice(0, 80) : "";
  return <CreateSpaceForm defaultKind={kind.success ? kind.data : undefined} defaultName={name} />;
}
