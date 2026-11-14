import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Repeat, Video } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { formatSlot, pluralSl } from "@/lib/format";
import type { EventCardData } from "@/lib/data/events";

export function LiveEventCard({ event }: { event: EventCardData }) {
  const soldOut = event.seatsLeft === 0;
  return (
    <article className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <Link href={`/dogodki/${event.slug}`} className="block focus-visible:outline-offset-[-3px]">
        <div className="relative">
          <Cover tone={event.cover} className="h-36 sm:h-44" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {event.isOnline && (
              <Badge tone="sky">
                <Video aria-hidden="true" className="size-3" /> Online
              </Badge>
            )}
            {event.schedule === "multi_session" && (
              <Badge tone="lilac">
                <Repeat aria-hidden="true" className="size-3" /> {event.sessions}{" "}
                {pluralSl(event.sessions, ["srečanje", "srečanji", "srečanja", "srečanj"])}
              </Badge>
            )}
            {event.isDemo && (
              <Badge tone="neutral" className="bg-surface/95">
                Testni dogodek
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-display text-lg leading-snug font-bold text-ink group-hover:text-brand-strong">
            {event.title}
          </h3>
          {event.summary && <p className="text-sm text-ink-muted">{event.summary}</p>}
          <ul className="space-y-1 text-sm text-ink">
            {event.next && (
              <li className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                <span>{formatSlot(event.next.startsAt, event.next.endsAt)}</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span>
                {event.isOnline ? "Online" : (event.city ?? "Slovenija")}
                {event.space ? ` · ${event.space.name}` : ""}
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="font-semibold">Brezplačno</span>
            {event.registrationMode === "external" ? (
              <Badge tone="sun">
                <ExternalLink aria-hidden="true" className="size-3" /> Zunanja prijava
              </Badge>
            ) : soldOut ? (
              <Badge tone="brand">Razprodano</Badge>
            ) : event.seatsLeft !== null ? (
              <Badge tone="sage">
                Še {event.seatsLeft}{" "}
                {pluralSl(event.seatsLeft, ["prosto mesto", "prosti mesti", "prosta mesta", "prostih mest"])}
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
