import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsRead } from "@/lib/actions/bookings";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Obvestila" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Obvestila" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/obvestila" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const list = data ?? [];
  const unread = list.some((n) => !n.read_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Obvestila</h1>
        {unread && (
          <form action={markNotificationsRead}>
            <SubmitButton variant="ghost" size="sm" pendingText="…">
              Označi vse kot prebrano
            </SubmitButton>
          </form>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState title="Ni obvestil">
          <p>Tukaj se bodo prikazale potrditve prijav, spremembe dogodkov in sporočila organizatorjev.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2" data-testid="notifications">
          {list.map((n) => {
            const inner = (
              <>
                <p className={n.read_at ? "font-semibold" : "font-bold"}>
                  {!n.read_at && <span className="sr-only">Novo: </span>}
                  {n.title}
                </p>
                {n.body && <p className="text-sm text-ink-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-ink-muted">
                  {formatDate(n.created_at)} · {formatTime(n.created_at)}
                </p>
              </>
            );
            const cls = cn(
              "block rounded-2xl p-4 ring-1 ring-line",
              n.read_at ? "bg-surface/60" : "bg-surface border-l-4 border-brand",
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className={cn(cls, "hover:ring-brand")}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
