import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bookmark, ChevronRight, Download, Eye, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { getMyPlatformRoles, getMySpaces, requireUser } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { pluralSl } from "@/lib/format";

export const metadata: Metadata = { title: "Moj Mekko" };

const visibilityLabel = {
  public: "Javen profil",
  members: "Viden prijavljenim",
  private: "Zaseben profil",
} as const;

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Moj Mekko" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/moj-mekko" });
  const [spaces, roles] = await Promise.all([getMySpaces(), getMyPlatformRoles()]);
  const active = spaces.filter((s) => s.status === "active");
  const pending = spaces.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moj Mekko</h1>

      <section
        className="rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
        data-testid="my-profile"
      >
        <p className="font-display text-xl font-bold break-words">{profile.display_name}</p>
        <p className="text-sm text-ink-muted">
          @{profile.handle}
          {profile.approx_city ? ` · ${profile.approx_city}` : ""}
        </p>
        <Badge tone="sage" className="mt-2">
          {visibilityLabel[profile.visibility]}
        </Badge>
      </section>

      <Link
        href="/organizator"
        className="flex items-center gap-4 rounded-[var(--radius-card)] bg-ink p-4 text-cream"
        data-testid="switch-organizer"
      >
        <LayoutDashboard aria-hidden="true" className="size-6 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {active.length > 0 ? "Preklopi v način organizatorja" : "Postani organizator"}
          </span>
          <span className="block text-sm opacity-80">
            {active.length > 0
              ? `${active.length} ${pluralSl(active.length, ["prostor", "prostora", "prostori", "prostorov"])}${pending ? ` · ${pending} ${pluralSl(pending, ["povabilo", "povabili", "povabila", "povabil"])}` : ""}`
              : pending
                ? `${pending} ${pluralSl(pending, ["povabilo", "povabili", "povabila", "povabil"])} v ekipo`
                : "Ustvari prostor za svoje dogodke – brezplačno"}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>

      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <Row
          href="/moj-mekko/shranjeno"
          icon={<Bookmark aria-hidden="true" className="size-6" />}
          title="Shranjeno"
          desc="Dogodki, ki si jih shranil/-a"
        />
        <Row
          href="/moj-mekko/profil"
          icon={<Eye aria-hidden="true" className="size-6" />}
          title="Profil in zasebnost"
          desc="Ime, opis, kraj, kdo vidi tvoj profil, e-poštne novice"
        />
        <Row
          href="/moj-mekko/zanimanja"
          icon={<Sparkles aria-hidden="true" className="size-6" />}
          title="Zanimanja"
          desc="Kaj ti prikazujemo v odkrivanju"
        />
        <Row
          href="/moj-mekko/podatki"
          icon={<Download aria-hidden="true" className="size-6" />}
          title="Moji podatki"
          desc="Izvoz podatkov in izbris računa"
        />
        {roles.length > 0 && (
          <Row
            href="/admin"
            icon={<ShieldCheck aria-hidden="true" className="size-6" />}
            title="Administracija"
            desc="Samo za ekipo Mekka"
          />
        )}
      </ul>

      <SignOutButton />
    </div>
  );
}

function Row({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 p-4 hover:bg-cream">
        <span className="shrink-0 text-ink-muted">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-ink-muted">{desc}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
      </Link>
    </li>
  );
}
