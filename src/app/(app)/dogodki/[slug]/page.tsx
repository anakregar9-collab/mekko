import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  ExternalLink,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/dal";
import { PREVIEW_COLUMNS, type CoverTone } from "@/lib/data/events";
import { toggleSave } from "@/lib/actions/bookings";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatSlot, pluralSl } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { spaceKindLabel } from "@/lib/spaces";
import { BookingForm, CancelBookingForm } from "./booking-forms";
import { ReportForm, StartConversationForm } from "@/components/messages/forms";

export const metadata: Metadata = { title: "Dogodek" };

const policyText = {
  flexible: "Prilagodljiva: odjava je mogoča do 24 ur pred začetkom.",
  moderate: "Zmerna: odjava je mogoča do 5 dni pred začetkom.",
  strict: "Stroga: odjava je mogoča do 14 dni pred začetkom.",
} as const;

export default function EventPage({ params }: PageProps<"/dogodki/[slug]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/odkrivanje">Odkrivanje</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <EventContent params={params} />
      </Suspense>
    </div>
  );
}

function gcalLink(title: string, start: string, end: string, where: string) {
  const f = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${f(start)}/${f(end)}`,
    location: where,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

async function EventContent({ params }: { params: PageProps<"/dogodki/[slug]">["params"] }) {
  const { slug } = await params;
  const profile = await getMyProfile();
  const supabase = await createClient();
  const columns = profile ? `${PREVIEW_COLUMNS}, description, address, materials` : PREVIEW_COLUMNS;
  const { data: raw } = await supabase.from("events").select(columns).eq("slug", slug).maybeSingle();
  if (!raw) notFound();
  const event = raw as unknown as Record<string, unknown> & {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    description?: string | null;
    address?: string | null;
    materials?: string | null;
    city: string | null;
    cover: string;
    is_online: boolean;
    schedule: "one_off" | "multi_session" | "recurring";
    booking_scope: "series" | "occurrence";
    registration_mode: "native" | "external";
    external_url: string | null;
    capacity: number | null;
    max_per_booking: number;
    cancellation_policy: keyof typeof policyText;
    status: "draft" | "published" | "cancelled";
    cancel_reason: string | null;
    is_demo: boolean;
    space_id: string;
    interest_id: number | null;
  };

  const [{ data: space }, { data: occ }, { data: interest }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, name, slug, kind, city, verification_status, is_demo")
      .eq("id", event.space_id)
      .maybeSingle(),
    supabase
      .from("event_occurrences")
      .select("id, starts_at, ends_at, status")
      .eq("event_id", event.id)
      .order("starts_at"),
    event.interest_id
      ? supabase.from("interests").select("label_sl").eq("id", event.interest_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const occurrences = occ ?? [];
  const now = nowMs();
  const upcoming = occurrences.filter((o) => o.status === "scheduled" && Date.parse(o.starts_at) > now);
  const series = event.booking_scope === "series";

  const seats = async (occurrenceId: string | null) => {
    if (event.capacity === null) return null;
    const { data } = await supabase.rpc("seats_taken", {
      p_event: event.id,
      p_occurrence: occurrenceId as string,
    });
    return Math.max(event.capacity - (data ?? 0), 0);
  };
  const seatsByOcc = new Map<string, number | null>();
  if (!series) for (const o of upcoming) seatsByOcc.set(o.id, await seats(o.id));
  const seriesSeats = series ? await seats(null) : null;

  const [{ data: myBookings }, { data: saved }, onlineUrl] = profile
    ? await Promise.all([
        supabase
          .from("bookings")
          .select("id, occurrence_id, quantity")
          .eq("event_id", event.id)
          .eq("booker_id", profile.id)
          .eq("status", "confirmed"),
        supabase
          .from("saved_events")
          .select("event_id")
          .eq("event_id", event.id)
          .eq("profile_id", profile.id),
        event.is_online
          ? supabase.rpc("event_online_url", { p_event: event.id }).then((r) => r.data)
          : Promise.resolve(null),
      ])
    : [{ data: [] }, { data: [] }, null];
  const isSaved = (saved ?? []).length > 0;
  const booked = myBookings ?? [];
  const bookedOcc = new Set(booked.map((b) => b.occurrence_id));
  const cancelled = event.status === "cancelled";
  const bookable = !cancelled && event.registration_mode === "native" && upcoming.length > 0;
  const where = event.is_online ? "Online" : (event.address ?? event.city ?? "");

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <Cover tone={event.cover as CoverTone} className="h-48 rounded-[var(--radius-card)] sm:h-64" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {interest && <Badge tone="clay">{interest.label_sl}</Badge>}
            {event.is_online && (
              <Badge tone="sky">
                <Video aria-hidden="true" className="size-3" /> Online
              </Badge>
            )}
            {series && <Badge tone="lilac">Večkratni tečaj</Badge>}
            {event.is_demo && <Badge>Testni dogodek</Badge>}
            {cancelled && <Badge tone="brand">Odpovedano</Badge>}
          </div>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight break-words">
            {event.title}
          </h1>
          {event.summary && <p className="text-lg text-ink-muted">{event.summary}</p>}
          {cancelled && event.cancel_reason && (
            <p role="status" className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
              Dogodek je odpovedan: {event.cancel_reason}
            </p>
          )}
        </div>

        {space && (
          <Link
            href={`/prostori/${space.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line hover:ring-brand"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-semibold">
                <span className="truncate">{space.name}</span>
                {space.verification_status === "verified" && (
                  <BadgeCheck aria-label="Preverjen organizator" className="size-4 shrink-0 text-sky-ink" />
                )}
              </span>
              <span className="block text-sm text-ink-muted">
                {spaceKindLabel[space.kind]}
                {space.city ? ` · ${space.city}` : ""}
              </span>
            </span>
          </Link>
        )}

        <Section title="Termini" icon={<CalendarDays aria-hidden="true" className="size-5 text-ink-muted" />}>
          {series && (
            <p className="mb-2 text-sm text-ink-muted">
              Ena prijava velja za vseh {occurrences.length}{" "}
              {pluralSl(occurrences.length, ["srečanje", "srečanji", "srečanja", "srečanj"])}.
            </p>
          )}
          <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
            {occurrences.map((o, i) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className={o.status === "cancelled" ? "text-ink-muted line-through" : ""}>
                  {series && <span className="mr-2 text-sm text-ink-muted">{i + 1}.</span>}
                  {formatSlot(o.starts_at, o.ends_at)}
                </span>
                {profile && (bookedOcc.has(o.id) || (series && booked.length > 0)) ? (
                  <a
                    href={gcalLink(event.title, o.starts_at, o.ends_at, where)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-strong"
                  >
                    <CalendarPlus aria-hidden="true" className="size-4" /> V koledar
                    <span className="sr-only">(Google Koledar, odpre se nova stran)</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Lokacija"
          icon={
            event.is_online ? (
              <Video aria-hidden="true" className="size-5 text-ink-muted" />
            ) : (
              <MapPin aria-hidden="true" className="size-5 text-ink-muted" />
            )
          }
        >
          {event.is_online ? (
            onlineUrl ? (
              <a
                href={onlineUrl}
                className="font-semibold break-all text-brand-strong underline"
                rel="noopener noreferrer"
              >
                {onlineUrl}
              </a>
            ) : (
              <p>Spletni dogodek. Povezavo vidijo prijavljeni udeleženci.</p>
            )
          ) : profile && event.address ? (
            <p>
              {event.address}{" "}
              <a
                className="font-semibold whitespace-nowrap text-brand-strong underline"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Odpri zemljevid<span className="sr-only"> (nova stran)</span>
              </a>
            </p>
          ) : (
            <p>
              {event.city ?? "Slovenija"}
              {!profile && <span className="text-ink-muted"> · natančen naslov vidijo prijavljeni</span>}
            </p>
          )}
        </Section>

        {profile ? (
          <>
            {event.description && (
              <Section title="O dogodku">
                <p className="leading-relaxed whitespace-pre-line">{event.description}</p>
              </Section>
            )}
            {event.materials && (
              <Section
                title="Kaj potrebuješ"
                icon={<Package aria-hidden="true" className="size-5 text-ink-muted" />}
              >
                <p className="whitespace-pre-line">{event.materials}</p>
              </Section>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-lilac-soft p-5 text-lilac-ink" data-testid="login-gate">
            <p className="flex items-center gap-2 font-semibold">
              <Lock aria-hidden="true" className="size-5" /> Celoten opis, naslov in prijava za prijavljene
            </p>
            <p className="mt-1 text-sm">Račun je brezplačen in narejen v minuti.</p>
          </div>
        )}

        <Section
          title="Pogoji odjave"
          icon={<ShieldCheck aria-hidden="true" className="size-5 text-ink-muted" />}
        >
          <p>{policyText[event.cancellation_policy]}</p>
        </Section>
      </div>

      <aside aria-label="Prijava" className="space-y-4 md:self-start">
        <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="font-display text-xl font-bold">Brezplačno</p>
          {event.registration_mode === "native" && event.capacity !== null && (
            <p className="text-sm text-ink-muted">
              {series
                ? `Še ${seriesSeats} ${pluralSl(seriesSeats ?? 0, ["prosto mesto", "prosti mesti", "prosta mesta", "prostih mest"])}`
                : `Do ${event.capacity} oseb na termin`}
            </p>
          )}

          {booked.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-sage-soft p-3 text-sage-ink" data-testid="my-booking">
              <p className="font-semibold">Prijavljen/-a si</p>
              {booked.map((b) => {
                const o = occurrences.find((x) => x.id === b.occurrence_id);
                return (
                  <div key={b.id} className="space-y-1 text-sm">
                    <p>
                      {o ? formatSlot(o.starts_at, o.ends_at) : "Cel tečaj"} · {b.quantity}{" "}
                      {pluralSl(b.quantity, ["oseba", "osebi", "osebe", "oseb"])}
                    </p>
                    {!cancelled && <CancelBookingForm slug={event.slug} bookingId={b.id} label="Odjavi se" />}
                  </div>
                );
              })}
            </div>
          )}

          {event.registration_mode === "external" && event.external_url && !cancelled && (
            <div className="space-y-1">
              <a
                href={event.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "md", "w-full")}
              >
                Prijava pri organizatorju <ExternalLink aria-hidden="true" className="size-4" />
                <span className="sr-only">(odpre zunanjo stran)</span>
              </a>
              <p className="text-xs text-ink-muted">
                Zapustiš Mekko. Prijava ne bo vidna v Mojih aktivnostih.
              </p>
            </div>
          )}

          {bookable &&
            (profile ? (
              (series ? booked.length === 0 : upcoming.some((o) => !bookedOcc.has(o.id))) &&
              (series && seriesSeats === 0 ? (
                <p className="font-semibold text-brand-strong">Razprodano</p>
              ) : (
                <BookingForm
                  slug={event.slug}
                  eventId={event.id}
                  series={series}
                  maxPerBooking={event.max_per_booking}
                  occurrences={upcoming
                    .filter((o) => !bookedOcc.has(o.id))
                    .map((o) => {
                      const left = seatsByOcc.get(o.id);
                      return {
                        id: o.id,
                        disabled: left === 0,
                        label: `${formatSlot(o.starts_at, o.ends_at)}${left === 0 ? " · razprodano" : left !== null && left !== undefined ? ` · še ${left}` : ""}`,
                      };
                    })}
                />
              ))
            ) : (
              <Link
                href={`/prijava?naprej=${encodeURIComponent(`/dogodki/${event.slug}`)}`}
                className={buttonClasses("primary", "md", "w-full")}
              >
                Prijavi se za udeležbo
              </Link>
            ))}

          {!bookable && event.registration_mode === "native" && !cancelled && (
            <p className="text-sm text-ink-muted">Ni več prihajajočih terminov.</p>
          )}
        </div>

        {profile && (
          <form action={toggleSave}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="slug" value={event.slug} />
            <input type="hidden" name="saved" value={isSaved ? "1" : "0"} />
            <button type="submit" className={buttonClasses("ghost", "md", "w-full")} aria-pressed={isSaved}>
              <Bookmark aria-hidden="true" className="size-5" fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? "Shranjeno" : "Shrani"}
            </button>
          </form>
        )}

        {profile && space && (
          <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-bold">Vprašanje za organizatorja</h2>
            {space.is_demo ? (
              <p className="text-sm text-ink-muted">To je testni organizator, zato mu ni mogoče pisati.</p>
            ) : (
              <StartConversationForm
                target={{ kind: "space", spaceId: space.id }}
                label="Piši organizatorju"
                placeholder="Npr. ali je dogodek primeren za začetnike?"
              />
            )}
          </div>
        )}
        {profile && <ReportForm targetType="event" targetId={event.id} label="Prijavi dogodek" />}
      </aside>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
