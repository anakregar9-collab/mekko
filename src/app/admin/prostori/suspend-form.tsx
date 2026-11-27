"use client";

import { useActionState } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { setSpaceSuspension } from "@/lib/actions/admin";

export function SuspendSpaceForm({
  spaceId,
  name,
  suspended,
}: {
  spaceId: string;
  name: string;
  suspended: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(setSpaceSuspension, {});
  const id = `suspend-${spaceId}`;
  return (
    <form action={action} className="space-y-2" data-testid="suspend-space-form">
      <FormMessage state={state} />
      <input type="hidden" name="space_id" value={spaceId} />
      <input type="hidden" name="suspend" value={suspended ? "0" : "1"} />
      <label htmlFor={id} className="block text-sm font-semibold">
        {suspended ? "Razlog za ponovno aktivacijo" : "Razlog za blokado (lastnik ga vidi)"}
      </label>
      <input
        id={id}
        name="reason"
        className={inputCls}
        aria-invalid={state.errors?.reason ? true : undefined}
      />
      {state.errors?.reason && <p className="text-sm text-brand-strong">{state.errors.reason}</p>}
      <SubmitButton variant={suspended ? "primary" : "secondary"} pendingText="…">
        {suspended ? "Odblokiraj prostor" : "Blokiraj prostor"}
        <span className="sr-only"> {name}</span>
      </SubmitButton>
    </form>
  );
}
