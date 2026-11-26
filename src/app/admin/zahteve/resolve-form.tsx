"use client";

import { useActionState } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { resolveDataRequest } from "@/lib/actions/admin";

export function ResolveForm({ requestId, current }: { requestId: string; current: "open" | "in_progress" }) {
  const [state, action] = useActionState<FormState, FormData>(resolveDataRequest, {});
  const id = `note-${requestId}`;
  return (
    <form action={action} className="w-full space-y-2 lg:w-96">
      <input type="hidden" name="request_id" value={requestId} />
      <label htmlFor={id} className="sr-only">
        Opomba
      </label>
      <input id={id} name="reason" placeholder="Opomba (obvezno)" className={inputCls} />
      {state.errors?.reason && <p className="text-sm text-brand-strong">{state.errors.reason}</p>}
      <div className="flex flex-wrap gap-2">
        {current === "open" && (
          <SubmitButton name="status" value="in_progress" variant="secondary" size="sm" pendingText="…">
            V obdelavo
          </SubmitButton>
        )}
        <SubmitButton name="status" value="done" size="sm" pendingText="…">
          Zaključi
        </SubmitButton>
        <SubmitButton name="status" value="rejected" variant="ghost" size="sm" pendingText="…">
          Zavrni
        </SubmitButton>
      </div>
      <FormMessage state={state.message ? state : undefined} />
    </form>
  );
}
