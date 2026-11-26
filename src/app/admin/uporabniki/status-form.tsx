"use client";

import { useActionState } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { setUserStatus } from "@/lib/actions/admin";

export function StatusForm({
  profileId,
  current,
  handle,
}: {
  profileId: string;
  current: string;
  handle: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(setUserStatus, {});
  const next = current === "active" ? "suspended" : "active";
  const id = `reason-${profileId}`;
  return (
    <form action={action} className="w-full space-y-2 lg:w-80">
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="status" value={next} />
      <label htmlFor={id} className="sr-only">
        Razlog za @{handle}
      </label>
      <input
        id={id}
        name="reason"
        placeholder="Razlog (obvezno)"
        className={inputCls}
        aria-invalid={state.errors?.reason ? true : undefined}
      />
      {state.errors?.reason && <p className="text-sm text-brand-strong">{state.errors.reason}</p>}
      <SubmitButton variant={next === "suspended" ? "secondary" : "primary"} size="sm" pendingText="…">
        {next === "suspended" ? "Omeji račun" : "Ponovno aktiviraj"}
      </SubmitButton>
      <FormMessage state={state.message ? state : undefined} />
    </form>
  );
}
