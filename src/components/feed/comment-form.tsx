"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
/** Shared comment box for feed posts and ideas; `action` is a bound server action. */
export function CommentForm({
  action: submit,
  label = "Napiši komentar",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  label?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(submit, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} noValidate className="space-y-2" data-testid="comment-form">
      <FormMessage state={state.ok ? undefined : state} />
      <label htmlFor="comment" className="sr-only">
        {label}
      </label>
      <textarea
        id="comment"
        name="body"
        rows={2}
        maxLength={1000}
        placeholder={`${label} …`}
        defaultValue={state.ok ? "" : state.values?.body}
        className={inputCls}
      />
      {state.errors?.body && <p className="text-sm font-medium text-brand-strong">{state.errors.body}</p>}
      <SubmitButton size="sm" pendingText="Objavljam …">
        Komentiraj
      </SubmitButton>
    </form>
  );
}
