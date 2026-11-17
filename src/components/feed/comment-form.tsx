"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { addComment } from "@/lib/actions/feed";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addComment.bind(null, postId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} noValidate className="space-y-2" data-testid="comment-form">
      <FormMessage state={state.ok ? undefined : state} />
      <label htmlFor="comment" className="sr-only">
        Napiši komentar
      </label>
      <textarea
        id="comment"
        name="body"
        rows={2}
        maxLength={1000}
        placeholder="Napiši komentar …"
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
