import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Repeat, Video } from "lucide-react";
import type { MekkoEvent, Space } from "@/lib/domain/types";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { formatPriceRange, formatSlot, spotsLeftLabel } from "@/lib/format";
import { seatsTaken } from "@/lib/demo/data";

export function scheduleLabel(event: MekkoEvent): string | null {
  if (event.schedule === "multi_session") return `${event.occurrences.length} srečanja`;
  if (event.schedule === "recurring") return "Ponavljajoče";
  return null;
}

export function EventCard({ event, space }: { event: MekkoEvent; space?: Space }) {
  const first = event.occurrences[0];
  const taken = seatsTaken(event);
  const soldOut = event.capacity !== null && taken >= event.capacity;
  const schedule = scheduleLabel(event);

  return (
    <article className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <Link href={`/prototip/dogodki/${event.slug}`} className="block focus-visible:outline-offset-[-3px]">
        <div className="relative">
          <Cover tone={event.cover} className="h-36 sm:h-44" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral" className="bg-surface/95">
              Dogodek
            </Badge>
            {event.isOnline && (
              <Badge tone="sky">
                <Video aria-hidden="true" className="size-3" /> Online
              </Badge>
            )}
            {schedule && (
              <Badge tone="lilac">
                <Repeat aria-hidden="true" className="size-3" /> {schedule}
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-display text-lg leading-snug font-bold text-ink group-hover:text-brand-strong">
            {event.title}
          </h3>
          <p className="text-sm text-ink-muted">{event.summary}</p>
          <ul className="space-y-1 text-sm text-ink">
            <li className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span>{formatSlot(first.startsAt, first.endsAt)}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span>
                {event.city}
                {space ? ` · ${space.name}` : ""}
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="font-semibold">
              {formatPriceRange(event.ticketTypes.map((t) => t.priceCents))}
            </span>
            {event.registrationMode === "external" ? (
              <Badge tone="sun">
                <ExternalLink aria-hidden="true" className="size-3" /> Zunanja prijava
              </Badge>
            ) : soldOut ? (
              <Badge tone="brand">Razprodano · čakalna vrsta</Badge>
            ) : (
              <Badge tone="sage">{spotsLeftLabel(event.capacity, taken)}</Badge>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
