"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { cancelEventAction, deleteDraft, notifyAttendeesAction, publishEvent } from "@/lib/actions/events";

export function PublishButton({ spaceSlug, eventId }: { spaceSlug: string; eventId: string }) {
  const [state, action] = useActionState<FormState>(publishEvent.bind(null, spaceSlug, eventId), {});
  return (
    <form action={action} className="space-y-1">
      <SubmitButton size="sm" pendingText="…">
        Objavi
      </SubmitButton>
      {state.message && !state.ok && <FormMessage state={state} />}
    </form>
  );
}

export function DeleteDraftButton({ spaceSlug, eventId }: { spaceSlug: string; eventId: string }) {
  return (
    <form
      action={deleteDraft.bind(null, spaceSlug, eventId)}
      onSubmit={(e) => {
        if (!confirm("Izbrišem osnutek?")) e.preventDefault();
      }}
    >
      <SubmitButton variant="ghost" size="sm" pendingText="…">
        Izbriši
      </SubmitButton>
    </form>
  );
}

export function NotifyForm({ spaceSlug, eventId }: { spaceSlug: string; eventId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    notifyAttendeesAction.bind(null, spaceSlug, eventId),
    {},
  );
  return (
    <form action={action} className="space-y-3" key={state.ok ? state.message : "f"}>
      <FormMessage state={state} />
      <Field
        label="Sporočilo"
        htmlFor="message"
        hint="Prejmejo ga vsi prijavljeni (v aplikaciji)."
        error={state.errors?.message}
      >
        <textarea id="message" name="message" rows={3} maxLength={1000} className={inputCls} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Pošiljam …">
        Pošlji obvestilo
      </SubmitButton>
    </form>
  );
}

export function CancelEventForm({ spaceSlug, eventId }: { spaceSlug: string; eventId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    cancelEventAction.bind(null, spaceSlug, eventId),
    {},
  );
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (!confirm("Res odpoveš dogodek? Vse prijave bodo preklicane.")) e.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <Field label="Razlog (vidijo ga udeleženci)" htmlFor="reason" error={state.errors?.reason}>
        <input id="reason" name="reason" className={inputCls} />
      </Field>
      <SubmitButton variant="secondary" pendingText="…">
        Odpovej dogodek
      </SubmitButton>
    </form>
  );
}
