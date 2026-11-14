import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getConversation } from "@/lib/data/messages";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReplyForm, ReportForm } from "@/components/messages/forms";
import { BlockButton } from "@/components/messages/block-button";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Pogovor" };

export default function Page({ params }: PageProps<"/sporocila/[id]">) {
  return (
    <div className="space-y-4">
      <BackLink href="/sporocila">Sporočila</BackLink>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params }: { params: PageProps<"/sporocila/[id]">["params"] }) {
  const { id } = await params;
  const profile = await requireUser({ next: `/sporocila/${id}` });
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation: id });
  const conv = await getConversation(id, profile.id);
  if (!conv) notFound();
  const name = conv.other.display_name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight break-words">{name}</h1>
          {conv.other.handle && <p className="text-sm text-ink-muted">@{conv.other.handle}</p>}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <BlockButton
            profileId={conv.other.id}
            blocked={conv.iBlocked}
            back={`/sporocila/${id}`}
            name={name}
          />
        </div>
      </div>

      <ol className="space-y-3" data-testid="thread" aria-label={`Pogovor z ${name}`}>
        {conv.messages.map((m) => (
          <li key={m.id} className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 break-words whitespace-pre-line",
                m.removed
                  ? "bg-surface/60 text-ink-muted italic ring-1 ring-line"
                  : m.mine
                    ? "bg-brand text-white"
                    : "bg-surface ring-1 ring-line",
              )}
            >
              <span className="sr-only">{m.mine ? "Ti" : name}: </span>
              {m.removed ? "Sporočilo je odstranil moderator." : m.body}
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              {formatDate(m.createdAt)} · {formatTime(m.createdAt)}
            </p>
            {!m.mine && !m.removed && (
              <ReportForm targetType="message" targetId={String(m.id)} label="Prijavi sporočilo" />
            )}
          </li>
        ))}
      </ol>

      {conv.iBlocked ? (
        <p role="status" className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
          Osebo si blokiral/-a. Pošiljanje sporočil ni mogoče, dokler je ne odblokiraš.
        </p>
      ) : conv.canWrite ? (
        <ReplyForm conversationId={conv.id} />
      ) : (
        <p role="status" className="rounded-2xl bg-surface p-3 text-ink-muted ring-1 ring-line">
          Tej osebi trenutno ne moreš pisati.
        </p>
      )}

      <ReportForm targetType="profile" targetId={conv.other.id} label={`Prijavi osebo ${name}`} />
    </div>
  );
}
