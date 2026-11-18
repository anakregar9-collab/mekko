import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requirePlatformRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { ResolveReportForm } from "./resolve-report-form";

export const metadata: Metadata = { title: "Prijave vsebin" };

const reasonLabel: Record<string, string> = {
  spam: "Neželena vsebina",
  harassment: "Nadlegovanje",
  inappropriate: "Neprimerna vsebina",
  scam: "Prevara",
  copyright: "Avtorske pravice",
  other: "Drugo",
};
const typeLabel: Record<string, string> = {
  profile: "Oseba",
  message: "Sporočilo",
  event: "Dogodek",
  space: "Prostor",
  idea: "Ideja",
  post: "Objava v feedu",
  comment: "Komentar",
  idea_comment: "Komentar pri ideji",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Prijave vsebin</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requirePlatformRole(["super_admin", "admin", "moderator"]);
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(handle)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  const list = reports ?? [];
  if (list.length === 0) {
    return (
      <EmptyState title="Ni odprtih prijav">
        <p>Ko uporabniki prijavijo osebo, sporočilo, dogodek, prostor ali idejo, se prijava prikaže tukaj.</p>
      </EmptyState>
    );
  }

  const ids = (t: string) => list.filter((r) => r.target_type === t).map((r) => r.target_id);
  const msgIds = ids("message").map(Number).filter(Number.isFinite);
  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, slug, title, status")
    .in("id", ids("idea"));
  const ideaCommentIds = ids("idea_comment").map(Number).filter(Number.isFinite);
  const { data: ideaCommentsRep } = ideaCommentIds.length
    ? await supabase.from("idea_comments").select("id, idea_id, body, removed_at").in("id", ideaCommentIds)
    : { data: [] as { id: number; idea_id: string; body: string; removed_at: string | null }[] };
  const { data: postsRep } = await supabase.from("posts").select("id, caption, status").in("id", ids("post"));
  const commentIds = ids("comment").map(Number).filter(Number.isFinite);
  const { data: commentsRep } = commentIds.length
    ? await supabase.from("post_comments").select("id, post_id, body, removed_at").in("id", commentIds)
    : { data: [] as { id: number; post_id: string; body: string; removed_at: string | null }[] };
  const [{ data: msgs }, { data: people }, { data: events }, { data: spaces }] = await Promise.all([
    msgIds.length
      ? supabase.from("messages").select("id, body, removed_at, sender_id").in("id", msgIds)
      : Promise.resolve({
          data: [] as { id: number; body: string; removed_at: string | null; sender_id: string }[],
        }),
    supabase.from("profiles").select("id, handle, display_name, status").in("id", ids("profile")),
    supabase.from("events").select("id, slug, title").in("id", ids("event")),
    supabase.from("spaces").select("id, slug, name").in("id", ids("space")),
  ]);
  const senderIds = (msgs ?? []).map((m) => m.sender_id);
  const { data: senders } = senderIds.length
    ? await supabase.from("profiles").select("id, handle").in("id", senderIds)
    : { data: [] as { id: string; handle: string }[] };

  return (
    <ul
      className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
      data-testid="admin-reports"
    >
      {list.map((r) => {
        let target: React.ReactNode = <span className="text-ink-muted">Vsebine ni več</span>;
        let messageId: number | undefined;
        let ideaId: string | undefined;
        let postId: string | undefined;
        let commentId: number | undefined;
        let ideaCommentId: number | undefined;
        if (r.target_type === "message") {
          const m = (msgs ?? []).find((x) => String(x.id) === r.target_id);
          if (m) {
            messageId = m.removed_at ? undefined : m.id;
            const sender = (senders ?? []).find((s) => s.id === m.sender_id);
            target = (
              <>
                <span className="block text-sm text-ink-muted">Pošiljatelj: @{sender?.handle ?? "?"}</span>
                <span className="block rounded-xl bg-cream p-2 break-words whitespace-pre-line">
                  {m.removed_at ? "(odstranjeno)" : m.body}
                </span>
              </>
            );
          }
        } else if (r.target_type === "profile") {
          const p = (people ?? []).find((x) => x.id === r.target_id);
          if (p)
            target = (
              <Link
                href={`/admin/uporabniki?q=${encodeURIComponent(p.handle)}`}
                className="font-semibold underline"
              >
                {p.display_name} (@{p.handle})
              </Link>
            );
        } else if (r.target_type === "event") {
          const e = (events ?? []).find((x) => x.id === r.target_id);
          if (e)
            target = (
              <Link href={`/dogodki/${e.slug}`} className="font-semibold underline">
                {e.title}
              </Link>
            );
        } else if (r.target_type === "post") {
          const p = (postsRep ?? []).find((x) => x.id === r.target_id);
          if (p) {
            postId = p.status === "published" ? p.id : undefined;
            target = (
              <Link href={`/objave/${p.id}`} className="font-semibold underline">
                {p.caption ? p.caption.slice(0, 80) : "Objava brez opisa"}
                {p.status !== "published" ? " (skrita)" : ""}
              </Link>
            );
          }
        } else if (r.target_type === "comment") {
          const c = (commentsRep ?? []).find((x) => String(x.id) === r.target_id);
          if (c) {
            commentId = c.removed_at ? undefined : c.id;
            target = (
              <>
                <span className="block rounded-xl bg-cream p-2 break-words whitespace-pre-line">
                  {c.removed_at ? "(odstranjeno)" : c.body}
                </span>
                <Link href={`/objave/${c.post_id}`} className="text-sm underline">
                  Odpri objavo
                </Link>
              </>
            );
          }
        } else if (r.target_type === "idea_comment") {
          const c = (ideaCommentsRep ?? []).find((x) => String(x.id) === r.target_id);
          if (c) {
            ideaCommentId = c.removed_at ? undefined : c.id;
            target = (
              <span className="block rounded-xl bg-cream p-2 break-words whitespace-pre-line">
                {c.removed_at ? "(odstranjeno)" : c.body}
              </span>
            );
          }
        } else if (r.target_type === "idea") {
          const i = (ideas ?? []).find((x) => x.id === r.target_id);
          if (i) {
            ideaId = i.status === "published" ? i.id : undefined;
            target = (
              <Link href={`/ideje/${i.slug}`} className="font-semibold underline">
                {i.title}
                {i.status === "hidden" ? " (skrita)" : ""}
              </Link>
            );
          }
        } else {
          const s = (spaces ?? []).find((x) => x.id === r.target_id);
          if (s)
            target = (
              <Link href={`/prostori/${s.slug}`} className="font-semibold underline">
                {s.name}
              </Link>
            );
        }
        const reporter = r.reporter as { handle: string } | null;
        return (
          <li key={r.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="lilac">{typeLabel[r.target_type]}</Badge>
                <Badge tone="brand">{reasonLabel[r.reason]}</Badge>
              </div>
              <div className="break-words">{target}</div>
              {r.details && <p className="text-sm">„{r.details}“</p>}
              <p className="text-xs text-ink-muted">
                Prijavil/-a @{reporter?.handle ?? "?"} · {formatDate(r.created_at)} {formatTime(r.created_at)}
              </p>
            </div>
            <ResolveReportForm
              reportId={r.id}
              messageId={messageId}
              ideaId={ideaId}
              postId={postId}
              commentId={commentId}
              ideaCommentId={ideaCommentId}
            />
          </li>
        );
      })}
    </ul>
  );
}
