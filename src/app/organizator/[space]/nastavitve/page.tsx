import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";
import { SpaceSettingsForm } from "./space-settings-form";

export const metadata: Metadata = { title: "Nastavitve prostora" };

export default function Page({ params }: PageProps<"/organizator/[space]/nastavitve">) {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nastavitve prostora</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/nastavitve">["params"] }) {
  const { space: slug } = await params;
  const { space } = await requireSpaceRole(slug, "admin");
  return (
    <SpaceSettingsForm
      slug={slug}
      initial={{
        name: space.name,
        city: space.city ?? "",
        tagline: space.tagline ?? "",
        bio: space.bio ?? "",
      }}
    />
  );
}
