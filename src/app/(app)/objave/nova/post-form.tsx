"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { MultiPhotoInput } from "@/components/ui/multi-photo-input";
import { createPost } from "@/lib/actions/feed";

export function PostForm({
  idea,
  event,
}: {
  idea: { id: string; title: string } | null;
  event: { id: string; title: string } | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(createPost, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form
      action={action}
      noValidate
      className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
    >
      <FormMessage state={state} />
      <MultiPhotoInput name="photos" label="Fotografije tvojega izdelka" error={e.photos} />
      <Field label="Opis (neobvezno)" htmlFor="caption" error={e.caption}>
        <textarea
          id="caption"
          name="caption"
          rows={3}
          maxLength={2200}
          defaultValue={v.caption}
          className={inputCls}
        />
      </Field>
      {idea && (
        <p className="text-sm">
          <input type="hidden" name="idea_id" value={idea.id} />
          Povezano z idejo: <strong>{idea.title}</strong>
        </p>
      )}
      {event && (
        <p className="text-sm">
          <input type="hidden" name="event_id" value={event.id} />
          Povezano z dogodkom: <strong>{event.title}</strong>
        </p>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Kdo vidi objavo</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name="visibility"
            value="public"
            defaultChecked={v.visibility !== "followers"}
            className="size-5 accent-[var(--color-brand)]"
          />
          <span>Vsi prijavljeni uporabniki Mekka</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name="visibility"
            value="followers"
            defaultChecked={v.visibility === "followers"}
            className="size-5 accent-[var(--color-brand)]"
          />
          <span>Samo moji sledilci</span>
        </label>
      </fieldset>
      <div className="space-y-1">
        <label className="flex items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            name="no_children"
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]"
            aria-invalid={e.no_children ? true : undefined}
            aria-describedby={e.no_children ? "no_children-error" : undefined}
          />
          <span>
            Na fotografijah ni prepoznavnih otrok, objavljam svoje delo in imam dovoljenje oseb, ki so na
            fotografijah.
          </span>
        </label>
        {e.no_children && (
          <p id="no_children-error" className="text-sm font-medium text-brand-strong">
            {e.no_children}
          </p>
        )}
      </div>
      <SubmitButton size="lg" pendingText="Objavljam …">
        Objavi
      </SubmitButton>
    </form>
  );
}
