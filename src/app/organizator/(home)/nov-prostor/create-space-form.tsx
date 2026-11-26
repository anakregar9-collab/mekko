"use client";

import { useActionState, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { createSpace } from "@/lib/actions/spaces";
import { slugify } from "@/lib/slug";
import { spaceKinds, type SpaceKind } from "@/lib/spaces";

export function CreateSpaceForm({
  defaultKind,
  defaultName = "",
}: {
  defaultKind?: SpaceKind;
  defaultName?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createSpace, {});
  const v = state.values;
  const [name, setName] = useState(v?.name ?? defaultName);
  const [slug, setSlug] = useState(v?.slug ?? slugify(defaultName));
  const [slugTouched, setSlugTouched] = useState(false);
  const e = state.errors ?? {};

  return (
    <form
      action={action}
      noValidate
      className="space-y-5 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
    >
      <FormMessage state={state} />
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Vrsta prostora</legend>
        {e.kind && <p className="text-sm font-medium text-brand-strong">Izberi vrsto prostora.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {spaceKinds.map((k) => (
            <label
              key={k.v}
              className="flex cursor-pointer gap-3 rounded-2xl p-3 ring-1 ring-line has-[:checked]:bg-brand-soft has-[:checked]:ring-brand"
            >
              <input
                type="radio"
                name="kind"
                value={k.v}
                defaultChecked={(v?.kind ?? defaultKind) === k.v}
                className="mt-1 size-4 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block font-semibold">{k.l}</span>
                <span className="block text-sm text-ink-muted">{k.d}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-muted">Vse vrste uporabljajo iste dogodke in nastavitve.</p>
      </fieldset>

      <Field label="Ime prostora" htmlFor="name" error={e.name}>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
            if (!slugTouched) setSlug(slugify(ev.target.value));
          }}
          className={inputCls}
          {...describedBy("name", e.name)}
        />
      </Field>

      <Field
        label="Spletni naslov"
        htmlFor="slug"
        hint="Del povezave do tvojega prostora. Kasneje ga ni mogoče spremeniti."
        error={e.slug}
      >
        <div className="flex flex-wrap items-center gap-x-1 rounded-xl border border-line bg-surface pl-3 focus-within:outline-3 focus-within:outline-brand">
          <span className="text-sm text-ink-muted">mekko.eu/prostori/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(ev.target.value.toLowerCase());
            }}
            className="min-h-11 min-w-0 flex-1 bg-transparent py-2 pr-3 text-base outline-none"
            {...describedBy("slug", e.slug, true)}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kraj (neobvezno)" htmlFor="city" error={e.city}>
          <input id="city" name="city" defaultValue={v?.city} className={inputCls} />
        </Field>
        <Field label="Kratek opis (neobvezno)" htmlFor="tagline" error={e.tagline}>
          <input id="tagline" name="tagline" maxLength={140} defaultValue={v?.tagline} className={inputCls} />
        </Field>
      </div>

      <SubmitButton size="lg" pendingText="Ustvarjam …" className="w-full sm:w-auto">
        Ustvari prostor
      </SubmitButton>
    </form>
  );
}
