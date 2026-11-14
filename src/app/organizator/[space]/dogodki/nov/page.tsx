import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { listInterests } from "@/lib/data/profile";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Nov dogodek" };

export default function Page({ params }: PageProps<"/organizator/[space]/dogodki/nov">) {
  return (
    <div className="max-w-3xl space-y-4">
      <Suspense fallback={<PageSkeleton title="Nov dogodek" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/dogodki/nov">["params"] }) {
  const { space: slug } = await params;
  const { space } = await requireSpaceRole(slug, "admin");
  const interests = await listInterests();
  return (
    <>
      <BackLink href={`/organizator/${slug}/dogodki`}>Dogodki</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nov dogodek</h1>
      <EventForm spaceSlug={slug} defaultCity={space.city ?? ""} interests={interests} />
    </>
  );
}
