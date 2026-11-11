import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Račun je omejen" };

export default function RestrictedPage() {
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
