"use client";

import { useActionState, useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { contactSpace, reportContent, sendMessage, startConversation } from "@/lib/actions/messages";

/** First message to a space owner ("Piši organizatorju") or to a person (organizer → attendee). */
export function StartConversationForm({
  target,
  label,
  placeholder,
}: {
  target: { kind: "space"; spaceId: string } | { kind: "person"; profileId: string };
  label: string;
  placeholder?: string;
}) {
  const bound =
    target.kind === "space"
      ? contactSpace.bind(null, target.spaceId)
      : startConversation.bind(null, target.profileId);
  const [state, action] = useActionState<FormState, FormData>(bound, {});
  const id = target.kind === "space" ? `contact-${target.spaceId}` : `dm-${target.profileId}`;
  return (
    <form action={action} className="space-y-2" noValidate>
      <FormMessage state={state} />
      <Field label={label} htmlFor={id} error={state.errors?.body}>
        <textarea
          id={id}
          name="body"
          rows={3}
          maxLength={2000}
          defaultValue={state.values?.body}
          placeholder={placeholder}
          className={inputCls}
          {...describedBy(id, state.errors?.body)}
        />
      </Field>
      <SubmitButton size="sm" pendingText="Pošiljam …">
        Pošlji sporočilo
      </SubmitButton>
    </form>
  );
}

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState<FormState, FormData>(sendMessage.bind(null, conversationId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2" noValidate data-testid="reply-form">
      <FormMessage state={state.ok ? undefined : state} />
      <Field label="Novo sporočilo" htmlFor="reply" error={state.errors?.body}>
        <textarea
          id="reply"
          name="body"
          rows={3}
          maxLength={2000}
          defaultValue={state.ok ? "" : state.values?.body}
          className={inputCls}
          {...describedBy("reply", state.errors?.body)}
        />
      </Field>
      <SubmitButton pendingText="Pošiljam …">Pošlji</SubmitButton>
    </form>
  );
}

const reasons = [
  ["spam", "Neželena vsebina ali oglaševanje"],
  ["harassment", "Nadlegovanje ali žaljenje"],
  ["inappropriate", "Neprimerna vsebina"],
  ["scam", "Prevara ali sumljivo plačilo"],
  ["copyright", "Kršitev avtorskih pravic"],
  ["other", "Drugo"],
] as const;

/** Collapsible "Prijavi" form for profiles, messages, events and spaces. */
export function ReportForm({
  targetType,
  targetId,
  label,
}: {
  targetType: "profile" | "message" | "event" | "space";
  targetId: string;
  label: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(reportContent, {});
  const id = `${targetType}-${targetId}`;
  return (
    <details className="group text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 font-semibold text-ink-muted hover:text-ink">
        <Flag aria-hidden="true" className="size-4" /> {label}
      </summary>
      {state.ok ? (
        <div className="mt-2">
          <FormMessage state={state} />
        </div>
      ) : (
        <form
          action={action}
          className="mt-2 space-y-2 rounded-2xl bg-surface p-3 ring-1 ring-line"
          noValidate
        >
          <FormMessage state={state} />
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <Field label="Razlog prijave" htmlFor={`reason-${id}`} error={state.errors?.reason}>
            <select
              id={`reason-${id}`}
              name="reason"
              defaultValue=""
              className={inputCls}
              {...describedBy(`reason-${id}`, state.errors?.reason)}
            >
              <option value="" disabled>
                Izberi …
              </option>
              {reasons.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Podrobnosti (neobvezno)" htmlFor={`details-${id}`} error={state.errors?.details}>
            <textarea id={`details-${id}`} name="details" rows={2} maxLength={1000} className={inputCls} />
          </Field>
          <SubmitButton size="sm" variant="secondary" pendingText="Pošiljam …">
            Pošlji prijavo
          </SubmitButton>
        </form>
      )}
    </details>
  );
}
