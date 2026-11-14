import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { listConversations } from "@/lib/data/messages";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Sporočila" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Sporočila" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/sporocila" });
  const list = await listConversations(profile.id);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Sporočila</h1>
      {list.length === 0 ? (
        <EmptyState title="Še ni pogovorov">
          <p>
            Organizatorju lahko pišeš z gumbom »Piši organizatorju« na strani dogodka ali prostora. Ko se
            nekdo odzove, se pogovor prikaže tukaj.
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2" data-testid="conversations">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/sporocila/${c.id}`}
                className={cn(
                  "block rounded-2xl p-4 ring-1 ring-line hover:ring-brand",
                  c.unread ? "border-l-4 border-brand bg-surface" : "bg-surface/60",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("min-w-0 truncate", c.unread ? "font-bold" : "font-semibold")}>
                    {c.unread && <span className="sr-only">Novo: </span>}
                    {c.other.display_name}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {formatDate(c.lastMessageAt)} · {formatTime(c.lastMessageAt)}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-ink-muted">
                  {c.lastFromMe && "Ti: "}
                  {c.preview}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-muted">
        Zaradi zaščite pred neželeno pošto lahko novi računi najprej pišejo organizatorjem in ljudem, s
        katerimi si delijo prostor ali dogodek. Blokirane osebe urejaš v{" "}
        <Link href="/moj-mekko/blokirani" className="font-semibold text-brand-strong underline">
          Moj Mekko
        </Link>
        .
      </p>
    </div>
  );
}
