"use client";

import { useActionState } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { setSpaceVerification } from "@/lib/actions/messages";

export function VerifyForm({ spaceId, name }: { spaceId: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(setSpaceVerification, {});
  if (state.ok) return <FormMessage state={state} />;
  const id = `verify-${spaceId}`;
  return (
    <form action={action} className="w-full space-y-2 sm:w-80">
      <input type="hidden" name="space_id" value={spaceId} />
      <label htmlFor={id} className="sr-only">
        Opomba za {name}
      </label>
      <input id={id} name="reason" placeholder="Kako je bilo preverjeno (obvezno)" className={inputCls} />
      {state.errors?.reason && <p className="text-sm text-brand-strong">{state.errors.reason}</p>}
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="status" value="verified" size="sm" pendingText="…">
          Potrdi organizatorja
        </SubmitButton>
        <SubmitButton name="status" value="rejected" variant="ghost" size="sm" pendingText="…">
          Zavrni
        </SubmitButton>
      </div>
      <FormMessage state={state.message ? state : undefined} />
    </form>
  );
}
