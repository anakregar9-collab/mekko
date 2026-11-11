"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/components/forms";
import { updateInterests } from "@/lib/actions/profile";

export function InterestsForm({
  interests,
  selected,
}: {
  interests: { id: number; label_sl: string }[];
  selected: number[];
}) {
  const [state, action] = useActionState<FormState, FormData>(updateInterests, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <fieldset className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
        <legend className="sr-only">Izberi zanimanja</legend>
        <p className="text-sm text-ink-muted">
          Zanimanja le razvrstijo odkrivanje. Iskanje vedno prikaže vse.
        </p>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <label key={i.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="interests"
                value={i.id}
                defaultChecked={selected.includes(i.id)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-line peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                {i.label_sl}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton>Shrani zanimanja</SubmitButton>
    </form>
  );
}
