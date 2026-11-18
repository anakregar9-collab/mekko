import type { Metadata } from "next";
import { Suspense } from "react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { buttonClasses } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { removeAnnouncement, removeMember, respondMember } from "@/lib/actions/community";
import { AnnouncementForm, MembershipModeForm } from "./community-forms";

export const metadata: Metadata = { title: "Člani" };

export default function Page({ params }: PageProps<"/organizator/[space]/clani">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Člani</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/clani">["params"] }) {
  const { space: slug } = await params;
  const { space, role } = await requireSpaceRole(slug, "staff");
  const isAdmin = hasSpaceRole(role, "admin");
  const supabase = await createClient();
  const [{ data: rows }, { data: posts }] = await Promise.all([
    supabase
      .from("space_members")
      .select(
        "profile_id, status, created_at, profile:profiles!space_members_profile_id_fkey(handle, display_name)",
      )
      .eq("space_id", space.id)
      .eq("role", "member")
      .in("status", ["active", "pending"])
      .order("created_at"),
    supabase
      .from("space_posts")
      .select("id, body, created_at")
      .eq("space_id", space.id)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const active = (rows ?? []).filter((r) => r.status === "active");
  const name = (r: (typeof active)[number]) =>
    r.profile ? `${r.profile.display_name} (@${r.profile.handle})` : "Zaseben profil";
  const respond = respondMember.bind(null, slug);
  const remove = removeMember.bind(null, slug);
  const removePost = removeAnnouncement.bind(null, slug);
  const enabled = space.membership_mode !== "none";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0 space-y-4">
        {pending.length > 0 && (
          <Panel title={`Prošnje za članstvo (${pending.length})`}>
            <ul className="divide-y divide-line" data-testid="member-requests">
              {pending.map((r) => (
                <li key={r.profile_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <p className="min-w-0 flex-1 font-semibold break-words">{name(r)}</p>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <form action={respond}>
                        <input type="hidden" name="profile_id" value={r.profile_id} />
                        <input type="hidden" name="accept" value="1" />
                        <button type="submit" className={buttonClasses("primary", "sm")}>
                          Sprejmi
                        </button>
                      </form>
                      <form action={respond}>
                        <input type="hidden" name="profile_id" value={r.profile_id} />
                        <input type="hidden" name="accept" value="0" />
                        <button type="submit" className={buttonClasses("ghost", "sm")}>
                          Zavrni
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title={`Člani (${active.length})`}>
          {active.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {enabled ? "Še nihče se ni pridružil." : "Članstvo je izklopljeno. Vključi ga na desni."}
            </p>
          ) : (
            <ul className="divide-y divide-line" data-testid="member-list">
              {active.map((r) => (
                <li key={r.profile_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{name(r)}</p>
                    <p className="text-xs text-ink-muted">Član/-ica od {formatDate(r.created_at)}</p>
                  </div>
                  {isAdmin && (
                    <form action={remove}>
                      <input type="hidden" name="profile_id" value={r.profile_id} />
                      <button type="submit" className={buttonClasses("ghost", "sm")}>
                        Odstrani
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Obvestila za člane">
          {enabled ? (
            <AnnouncementForm spaceSlug={slug} />
          ) : (
            <p className="text-sm text-ink-muted">Obvestila lahko pošiljaš, ko vključiš članstvo.</p>
          )}
          {(posts ?? []).length > 0 && (
            <ul className="mt-4 space-y-2" data-testid="announcement-list">
              {(posts ?? []).map((p) => (
                <li key={p.id} className="rounded-2xl bg-cream p-3">
                  <p className="break-words whitespace-pre-line">{p.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-muted">
                      {formatDate(p.created_at)} {formatTime(p.created_at)}
                    </span>
                    <form action={removePost}>
                      <input type="hidden" name="post_id" value={p.id} />
                      <button type="submit" className={buttonClasses("ghost", "sm")}>
                        Odstrani
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Način članstva">
          {isAdmin ? (
            <MembershipModeForm spaceSlug={slug} current={space.membership_mode} />
          ) : (
            <p className="text-sm text-ink-muted">Način članstva lahko spremeni skrbnik prostora.</p>
          )}
        </Panel>
        <Panel title="Kaj dobijo člani">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>obvestila prostora v zvonček,</li>
            <li>dostop do dogodkov, označenih »Samo za člane«,</li>
            <li>seznam članov vidi samo ekipa prostora.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
