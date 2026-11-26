"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { postAnnouncement, setMembershipMode } from "@/lib/actions/community";

const modes = [
  ["none", "Brez članstva", "Prostor nima članov; vsi dogodki so javni."],
  ["open", "Odprto", "Kdorkoli se lahko pridruži z enim klikom."],
  ["approval", "S potrditvijo", "Ljudje pošljejo prošnjo, ti jo potrdiš ali zavrneš."],
] as const;

export function MembershipModeForm({ spaceSlug, current }: { spaceSlug: string; current: string }) {
  const [state, action] = useActionState<FormState, FormData>(setMembershipMode.bind(null, spaceSlug), {});
  const [mode, setMode] = useState(current);
  return (
    <form action={action} className="space-y-3" data-testid="membership-mode-form">
      <FormMessage state={state} />
      <input type="hidden" name="membership_mode" value={mode} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Kdo se lahko pridruži</legend>
        {modes.map(([value, label, hint]) => (
          <label key={value} className="flex min-h-11 items-start gap-3 rounded-2xl p-2 ring-1 ring-line">
            <input
              type="radio"
              name="membership_mode_choice"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
              className="mt-1 size-5 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-ink-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <SubmitButton size="sm" pendingText="Shranjujem …">
        Shrani način članstva
      </SubmitButton>
    </form>
  );
}

export function AnnouncementForm({ spaceSlug }: { spaceSlug: string }) {
  const [state, action] = useActionState<FormState, FormData>(postAnnouncement.bind(null, spaceSlug), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2" noValidate data-testid="announcement-form">
      <FormMessage state={state} />
      <Field label="Obvestilo za člane" htmlFor="announcement" error={state.errors?.body}>
        <textarea
          id="announcement"
          name="body"
          rows={4}
          maxLength={3000}
          defaultValue={state.ok ? "" : state.values?.body}
          className={inputCls}
          {...describedBy("announcement", state.errors?.body)}
        />
      </Field>
      <SubmitButton size="sm" pendingText="Objavljam …">
        Objavi in obvesti člane
      </SubmitButton>
    </form>
  );
}
