import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { myConsents } from "@/lib/data/profile";
import { updateProfile } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Profil in zasebnost" };

export default function Page() {
  return (
    <div className="space-y-4">
      <BackLink href="/moj-mekko">Moj Mekko</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Profil in zasebnost</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko/profil" });
  const consents = await myConsents(profile.id);
  return (
    <ProfileForm
      mode="settings"
      action={updateProfile}
      initial={profile}
      locationConsent={consents.approx_location}
      marketingConsent={consents.marketing_email}
    />
  );
}
