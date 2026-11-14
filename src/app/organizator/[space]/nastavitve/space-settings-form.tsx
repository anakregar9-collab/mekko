"use client";

import { useActionState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { updateSpace } from "@/lib/actions/spaces";

export function SpaceSettingsForm({
  slug,
  initial,
}: {
  slug: string;
  initial: { name: string; city: string; tagline: string; bio: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(updateSpace.bind(null, slug), {});
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  return (
    <form
      action={action}
      noValidate
      className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
    >
      <FormMessage state={state} />
      <Field label="Ime prostora" htmlFor="name" error={e.name}>
        <input
          id="name"
          name="name"
          defaultValue={v.name}
          className={inputCls}
          {...describedBy("name", e.name)}
        />
      </Field>
      <Field
        label="Kratek opis"
        htmlFor="tagline"
        hint="Do 140 znakov. Prikaže se pod imenom."
        error={e.tagline}
      >
        <input
          id="tagline"
          name="tagline"
          maxLength={140}
          defaultValue={v.tagline}
          className={inputCls}
          {...describedBy("tagline", e.tagline, true)}
        />
      </Field>
      <Field label="Kraj" htmlFor="city" error={e.city}>
        <input id="city" name="city" defaultValue={v.city} className={inputCls} />
      </Field>
      <Field label="Predstavitev" htmlFor="bio" error={e.bio}>
        <textarea id="bio" name="bio" rows={5} maxLength={2000} defaultValue={v.bio} className={inputCls} />
      </Field>
      <SubmitButton>Shrani</SubmitButton>
    </form>
  );
}
