"use client";

import { useActionState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { inviteMember, leaveSpace, removeMember, setMemberRole } from "@/lib/actions/spaces";

export function InviteForm({ slug, canInviteAdmin }: { slug: string; canInviteAdmin: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(inviteMember.bind(null, slug), {});
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="space-y-3">
      <FormMessage state={state} />
      <Field
        label="Uporabniško ime"
        htmlFor="invite-handle"
        hint="Oseba mora že imeti račun na Mekku."
        error={e.handle}
      >
        <input
          id="invite-handle"
          name="handle"
          placeholder="@uporabnik"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.ok ? "" : state.values?.handle}
          key={state.ok ? state.message : "form"}
          className={inputCls}
          {...describedBy("invite-handle", e.handle, true)}
        />
      </Field>
      <Field label="Vloga" htmlFor="invite-role">
        <select id="invite-role" name="role" defaultValue="staff" className={inputCls}>
          <option value="staff">Sodelavec</option>
          {canInviteAdmin && <option value="admin">Skrbnik</option>}
        </select>
      </Field>
      <SubmitButton pendingText="Pošiljam …">Pošlji povabilo</SubmitButton>
    </form>
  );
}

export function MemberActions({
  slug,
  profileId,
  role,
  canChangeRole,
  name,
}: {
  slug: string;
  profileId: string;
  role: "owner" | "admin" | "staff" | "member";
  canChangeRole: boolean;
  name: string;
}) {
  const [roleState, roleAction] = useActionState<FormState, FormData>(setMemberRole.bind(null, slug), {});
  const [removeState, removeAction] = useActionState<FormState, FormData>(removeMember.bind(null, slug), {});
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {canChangeRole && (
          <form action={roleAction}>
            <input type="hidden" name="profile_id" value={profileId} />
            <input type="hidden" name="role" value={role === "admin" ? "staff" : "admin"} />
            <SubmitButton variant="secondary" size="sm" pendingText="…">
              {role === "admin" ? "Naredi sodelavca" : "Naredi skrbnika"}
            </SubmitButton>
          </form>
        )}
        <form
          action={removeAction}
          onSubmit={(ev) => {
            if (!confirm(`Odstranim ${name} iz ekipe?`)) ev.preventDefault();
          }}
        >
          <input type="hidden" name="profile_id" value={profileId} />
          <SubmitButton variant="ghost" size="sm" pendingText="…">
            Odstrani
          </SubmitButton>
        </form>
      </div>
      <FormMessage state={roleState.message ? roleState : removeState} />
    </div>
  );
}

export function LeaveSpaceButton({ slug }: { slug: string }) {
  return (
    <form
      action={leaveSpace.bind(null, slug)}
      onSubmit={(ev) => {
        if (!confirm("Res želiš zapustiti ekipo tega prostora?")) ev.preventDefault();
      }}
    >
      <SubmitButton variant="ghost" pendingText="…">
        Zapusti ekipo
      </SubmitButton>
    </form>
  );
}
