import type { Metadata } from "next";
import { Bell, CalendarCheck, MapPinned, MessageCircle, Megaphone } from "lucide-react";
import type { Notification } from "@/lib/domain/types";
import { notifications } from "@/lib/demo/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Obvestila" };

const icons: Record<Notification["kind"], typeof Bell> = {
  booking_confirmed: CalendarCheck,
  event_reminder: Bell,
  event_changed: MapPinned,
  message: MessageCircle,
  announcement: Megaphone,
};

export default function ObvestilaPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Obvestila</h1>
      <p className="text-sm text-ink-muted">
        Samo storitvena obvestila. Marketinška sporočila prejmeš le, če jih izrecno vklopiš.
      </p>
      <ul className="space-y-2">
        {notifications.map((n) => {
          const Icon = icons[n.kind];
          return (
            <li
              key={n.id}
              className={cn(
                "flex gap-3 rounded-2xl p-4 ring-1 ring-line",
                n.read ? "bg-surface/60" : "bg-surface",
              )}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-strong" />
              <div className="min-w-0 flex-1">
                <p className={n.read ? "font-semibold" : "font-bold"}>
                  {!n.read && <span className="sr-only">Novo: </span>}
                  {n.title}
                </p>
                <p className="text-sm text-ink-muted">{n.body}</p>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">{formatDate(n.createdAt)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
