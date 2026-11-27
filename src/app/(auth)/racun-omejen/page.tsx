import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { getMyProfile } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { CancelDeletionButton } from "./cancel-deletion-button";

export const metadata: Metadata = { title: "Račun" };

export default function RestrictedPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const profile = await getMyProfile();
  if (profile?.status === "deleted" && profile.deletion_requested_at) {
    const until = new Date(Date.parse(profile.deletion_requested_at) + 30 * 86_400_000).toISOString();
    return (
      <div className="space-y-4" data-testid="deletion-pending">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Račun je v izbrisu</h1>
        <p className="text-ink-muted">
          Tvoj račun bo dokončno izbrisan {formatDate(until)}. Do takrat ga lahko obnoviš – profil in vsebine
          bodo spet vidni (odjavljene prijave na dogodke ostanejo odjavljene).
        </p>
        <CancelDeletionButton />
        <SignOutButton />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Račun je začasno omejen</h1>
      <p className="text-ink-muted">
        Tvoj račun je trenutno omejen, zato ne moreš ustvarjati vsebin ali novih rezervacij. Če misliš, da gre
        za napako, nam piši na{" "}
        <a className="font-semibold text-brand-strong underline" href="mailto:podpora@mekko.eu">
          podpora@mekko.eu
        </a>
        .
      </p>
      <SignOutButton />
    </div>
  );
}
