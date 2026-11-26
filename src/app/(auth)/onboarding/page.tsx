import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { listInterests } from "@/lib/data/profile";
import { saveOnboarding } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Dobrodošli" };

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Dobrodošli v Mekku</h1>
        <p className="mt-1 text-ink-muted">
          Še nekaj podatkov in lahko začneš. Vse lahko kasneje spremeniš v Moj Mekko.
        </p>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Onboarding searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Onboarding({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.naprej === "string" ? sp.naprej : null);
  const profile = await requireUser({ allowUnonboarded: true, next: "/onboarding" });
  if (profile.onboarded_at) redirect(next);
  const interests = await listInterests();
  return (
    <ProfileForm
      mode="onboarding"
      action={saveOnboarding}
      initial={profile}
      interests={interests}
      next={next}
    />
  );
}
