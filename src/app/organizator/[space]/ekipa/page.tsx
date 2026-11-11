import type { Metadata } from "next";
import { Suspense } from "react";
import { hasSpaceRole, requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/page-skeleton";
import { Panel } from "@/components/workspace/stat-tile";
import { InviteForm, LeaveSpaceButton, MemberActions } from "./team-forms";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/spaces";

export const metadata: Metadata = { title: "Ekipa" };

export default function Page({ params }: PageProps<"/organizator/[space]/ekipa">) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Ekipa</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/ekipa">["params"] }) {
  const { space: slug } = await params;
  const { space, role, profile } = await requireSpaceRole(slug, "staff");
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("space_members")
    .select("profile_id, role, status, profile:profiles!space_members_profile_id_fkey(handle, display_name)")
    .eq("space_id", space.id)
    .in("status", ["active", "pending"])
    .neq("role", "member")
    .order("created_at");

  const isOwner = role === "owner";
  const isAdmin = hasSpaceRole(role, "admin");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Člani ekipe">
        <ul className="divide-y divide-line" data-testid="team-list">
          {(members ?? []).map((m) => {
            const canManage =
              m.role !== "owner" &&
              m.profile_id !== profile.id &&
              (isOwner || (isAdmin && m.role === "staff"));
            return (
              <li key={m.profile_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">
                    {m.profile?.display_name ?? "Zaseben profil"}
                    {m.profile_id === profile.id && <span className="font-normal text-ink-muted"> (ti)</span>}
                  </p>
                  <p className="text-sm text-ink-muted">{m.profile ? `@${m.profile.handle}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={m.role === "owner" ? "brand" : m.role === "admin" ? "lilac" : "neutral"}>
                    {roleLabel[m.role]}
                  </Badge>
                  {m.status === "pending" && <Badge tone="sun">Povabljen/-a</Badge>}
                </div>
                {canManage && (
                  <MemberActions
                    slug={slug}
                    profileId={m.profile_id}
                    role={m.role}
                    canChangeRole={isOwner && m.status === "active"}
                    name={m.profile?.display_name ?? "člana"}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="space-y-4">
        {isAdmin ? (
          <Panel title="Povabi v ekipo">
            <InviteForm slug={slug} canInviteAdmin={isOwner} />
          </Panel>
        ) : (
          <Panel title="Tvoja vloga">
            <p className="text-sm text-ink-muted">
              Kot sodelavec vidiš ekipo. Vabila in vloge urejata lastnik in skrbniki.
            </p>
          </Panel>
        )}
        <Panel title="Vloge">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-semibold">Lastnik</dt>
              <dd className="text-ink-muted">Vse, vključno z vlogami, financami in izbrisom prostora.</dd>
            </div>
            <div>
              <dt className="font-semibold">Skrbnik</dt>
              <dd className="text-ink-muted">Ureja prostor in dogodke, vabi sodelavce.</dd>
            </div>
            <div>
              <dt className="font-semibold">Sodelavec</dt>
              <dd className="text-ink-muted">Vidi prostor, ekipo in udeležence.</dd>
            </div>
          </dl>
        </Panel>
        {!isOwner && <LeaveSpaceButton slug={slug} />}
      </div>
    </div>
  );
}
