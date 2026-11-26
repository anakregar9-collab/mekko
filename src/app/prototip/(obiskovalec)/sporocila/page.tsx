import type { Metadata } from "next";
import { Cover } from "@/components/ui/cover";
import { conversations } from "@/lib/demo/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Sporočila" };

export default function SporocilaPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Sporočila</h1>
      <p className="text-sm text-ink-muted">Zasebna sporočila med uporabniki (M3). Ločeno od obvestil.</p>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        {conversations.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-4">
            <Cover tone="lilac" className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2">
                <span className={c.unread ? "font-bold" : "font-semibold"}>{c.withName}</span>
                <span className="shrink-0 text-xs text-ink-muted">{formatDate(c.updatedAt)}</span>
              </p>
              <p className="truncate text-sm text-ink-muted">{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                <span className="sr-only">Neprebrano: </span>
                {c.unread}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
