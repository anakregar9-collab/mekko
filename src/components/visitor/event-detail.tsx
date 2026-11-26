"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Ticket,
  Video,
} from "lucide-react";
import type { CancellationPolicy, MekkoEvent, Space } from "@/lib/domain/types";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PrototypeAction } from "@/components/prototype-action";
import { formatPrice, formatSlot, spotsLeftLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

const spaceKindLabel: Record<Space["kind"], string> = {
  solo_creator: "Ustvarjalec",
  community: "Skupnost",
  studio: "Studio",
  association: "Društvo",
};

export function EventDetail({
  event,
  space,
  policy,
  categoryLabel,
  seatsTaken,
}: {
  event: MekkoEvent;
  space: Space;
  policy: CancellationPolicy;
  categoryLabel: string;
  seatsTaken: number;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const soldOut = event.capacity !== null && seatsTaken >= event.capacity;

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/prototip/odkrivanje"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-5" /> Odkrivanje
        </Link>
        <div
          role="group"
          aria-label="Prototip: prikaz kot"
          className="flex rounded-full bg-surface p-1 text-sm ring-1 ring-line"
        >
          <span className="hidden self-center px-2 text-xs text-ink-muted sm:inline">Prikaz kot:</span>
          {[
            { v: false, l: "Gost" },
            { v: true, l: "Prijavljen" },
          ].map((o) => (
            <button
              key={o.l}
              type="button"
              aria-pressed={signedIn === o.v}
              onClick={() => setSignedIn(o.v)}
              className={cn(
                "min-h-9 rounded-full px-3 font-semibold",
                signedIn === o.v ? "bg-ink text-cream" : "text-ink-muted",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Cover tone={event.cover} className="h-48 rounded-[var(--radius-card)] sm:h-64" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="clay">{categoryLabel}</Badge>
              {event.isOnline && (
                <Badge tone="sky">
                  <Video aria-hidden="true" className="size-3" /> Online
                </Badge>
              )}
              {event.schedule === "multi_session" && <Badge tone="lilac">Večkratni tečaj</Badge>}
              {event.schedule === "recurring" && <Badge tone="lilac">Ponavljajoč dogodek</Badge>}
            </div>
            <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight">
              {event.title}
            </h1>
            <p className="text-lg text-ink-muted">{event.summary}</p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <Cover tone={space.cover} className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold">
                <span className="truncate">{space.name}</span>
                {space.verified && (
                  <BadgeCheck aria-label="Preverjen organizator" className="size-4 shrink-0 text-sky-ink" />
                )}
              </p>
              <p className="text-sm text-ink-muted">
                {spaceKindLabel[space.kind]} · {space.city}
              </p>
            </div>
            {signedIn && (
              <PrototypeAction
                variant="secondary"
                size="sm"
                className="w-auto!"
                explanation="sporočila organizatorju pridejo v M3."
              >
                <MessageCircle aria-hidden="true" className="size-4" /> Piši
              </PrototypeAction>
            )}
          </div>

          <Section title="Termini" icon={CalendarDays}>
            {event.schedule === "multi_session" && (
              <p className="mb-2 text-sm text-ink-muted">
                Ena prijava velja za vseh {event.occurrences.length} srečanj.
              </p>
            )}
            {event.schedule === "recurring" && (
              <p className="mb-2 text-sm text-ink-muted">Prijaviš se na posamezen termin.</p>
            )}
            <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
              {event.occurrences.map((o, i) => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <span>
                    {event.schedule === "multi_session" && (
                      <span className="mr-2 text-sm text-ink-muted">{i + 1}.</span>
                    )}
                    {formatSlot(o.startsAt, o.endsAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Lokacija" icon={event.isOnline ? Video : MapPin}>
            {event.isOnline ? (
              <p>
                {signedIn
                  ? "Povezava do spletne sobe se prikaže po potrjeni rezervaciji."
                  : "Spletni dogodek. Povezavo prejmejo prijavljeni udeleženci."}
              </p>
            ) : signedIn ? (
              <div className="space-y-2">
                <p>{event.address}</p>
                <div className="flex h-32 items-center justify-center rounded-2xl bg-sage-soft text-center text-sm text-sage-ink">
                  Zemljevid · ponudnik zemljevidov še ni izbran (odprta odločitev)
                </div>
              </div>
            ) : (
              <p>
                {event.city} · <span className="text-ink-muted">natančen naslov vidijo prijavljeni</span>
              </p>
            )}
          </Section>

          {signedIn ? (
            <>
              <Section title="O dogodku">
                <p className="leading-relaxed">{event.description}</p>
              </Section>
              {event.materials.length > 0 && (
                <Section title="Kaj potrebuješ" icon={Package}>
                  <ul className="list-disc space-y-1 pl-5">
                    {event.materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-lilac-soft p-5 text-lilac-ink" data-testid="login-gate">
              <p className="flex items-center gap-2 font-semibold">
                <Lock aria-hidden="true" className="size-5" /> Celoten opis, naslov in rezervacija za
                prijavljene
              </p>
              <p className="mt-1 text-sm">Registracija je brezplačna – z e-pošto ali Google računom.</p>
            </div>
          )}

          <Section title="Pogoji odpovedi" icon={ShieldCheck}>
            <p>
              <strong>{policy.title}:</strong> {policy.summary}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Pogoji ob nakupu se kasneje ne spreminjajo za že kupljene vstopnice.
            </p>
          </Section>
        </div>

        <aside
          aria-label="Rezervacija"
          className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface p-3 md:static md:self-start md:rounded-[var(--radius-card)] md:border-0 md:p-5 md:shadow-[var(--shadow-card)]"
        >
          <div className="hidden md:block">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <Ticket aria-hidden="true" className="size-5" /> Vstopnice
            </h2>
            <ul className="mb-4 space-y-2">
              {event.ticketTypes.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <span>{t.name}</span>
                  <span className="font-semibold">{formatPrice(t.priceCents)}</span>
                </li>
              ))}
            </ul>
            {event.registrationMode !== "external" && (
              <p className="mb-3 text-sm text-ink-muted">{spotsLeftLabel(event.capacity, seatsTaken)}</p>
            )}
          </div>
          <div className="flex items-center gap-3 md:block">
            <div className="min-w-0 flex-1 md:hidden">
              <p className="font-semibold">
                {formatPrice(Math.min(...event.ticketTypes.map((t) => t.priceCents)))}
              </p>
              <p className="truncate text-xs text-ink-muted">
                {event.registrationMode === "external"
                  ? "Zunanja prijava"
                  : spotsLeftLabel(event.capacity, seatsTaken)}
              </p>
            </div>
            <div className="shrink-0 md:w-full">
              <BookingCta event={event} signedIn={signedIn} soldOut={soldOut} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BookingCta({
  event,
  signedIn,
  soldOut,
}: {
  event: MekkoEvent;
  signedIn: boolean;
  soldOut: boolean;
}) {
  if (event.registrationMode === "external") {
    return (
      <div className="space-y-1">
        <a
          href={event.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "md", "w-full")}
        >
          Prijava pri organizatorju <ExternalLink aria-hidden="true" className="size-4" />
          <span className="sr-only">(odpre zunanjo stran)</span>
        </a>
        <p className="hidden text-xs text-ink-muted md:block">
          Zapustiš Mekko. Rezervacija ne bo vidna v Mojih aktivnostih.
        </p>
      </div>
    );
  }
  if (!signedIn) {
    return (
      <PrototypeAction explanation="prijava z e-pošto in Google pride v M1.">
        Prijavi se za rezervacijo
      </PrototypeAction>
    );
  }
  if (soldOut) {
    return (
      <PrototypeAction variant="secondary" explanation="čakalna vrsta je del M2.">
        Na čakalno vrsto
      </PrototypeAction>
    );
  }
  return (
    <PrototypeAction
      explanation={
        event.registrationMode === "manual_payment"
          ? "rezervacija s plačilom pri organizatorju pride v M2."
          : "brezplačne rezervacije pridejo v M2, plačljive v M3."
      }
    >
      {event.registrationMode === "manual_payment" ? "Rezerviraj (plačilo na kraju)" : "Rezerviraj"}
    </PrototypeAction>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        {Icon && <Icon aria-hidden="true" className="size-5 text-ink-muted" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
