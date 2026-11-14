"use client";

import { useActionState, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";

export interface InterestOption {
  id: number;
  label_sl: string;
}

const visibilityOptions = [
  { v: "public", l: "Javen", d: "Ime, uporabniško ime, opis in kraj vidijo vsi, tudi neprijavljeni." },
  { v: "members", l: "Samo prijavljenim", d: "Profil vidijo samo prijavljeni uporabniki Mekka." },
  { v: "private", l: "Zaseben", d: "Profil vidiš samo ti (in ekipe prostorov, v katere si povabljen/-a)." },
] as const;

export function ProfileForm({
  mode,
  action,
  initial,
  interests,
  selectedInterests = [],
  locationConsent = false,
  marketingConsent = false,
  next,
}: {
  mode: "onboarding" | "settings";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: {
    display_name: string;
    handle: string;
    bio: string | null;
    approx_city: string | null;
    visibility: string;
  };
  interests?: InterestOption[];
  selectedInterests?: number[];
  locationConsent?: boolean;
  marketingConsent?: boolean;
  next?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const v = state.values;
  const generated = /^u[0-9a-f]{11}$/.test(initial.handle);
  const [name, setName] = useState(
    v?.display_name ?? (initial.display_name === "Nov uporabnik" ? "" : initial.display_name),
  );
  const [handle, setHandle] = useState(v?.handle ?? (generated ? "" : initial.handle));
  const [handleTouched, setHandleTouched] = useState(!generated);
  const [consent, setConsent] = useState(locationConsent);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-6">
      <FormMessage state={state} />
      {next !== undefined && <input type="hidden" name="naprej" value={next} />}

      <section className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-lg font-bold">Profil</h2>
        <Field label="Ime, ki ga vidijo drugi" htmlFor="display_name" error={e.display_name}>
          <input
            id="display_name"
            name="display_name"
            autoComplete="name"
            value={name}
            onChange={(ev) => {
              setName(ev.target.value);
              if (!handleTouched) setHandle(slugify(ev.target.value).replace(/-/g, ".").slice(0, 30));
            }}
            className={inputCls}
            {...describedBy("display_name", e.display_name)}
          />
        </Field>
        <Field
          label="Uporabniško ime"
          htmlFor="handle"
          hint="Male črke, številke, pika ali podčrtaj. Prek njega te lahko povabijo v ekipo."
          error={e.handle}
        >
          <div className="flex items-center rounded-xl border border-line bg-surface pl-3 focus-within:outline-3 focus-within:outline-brand">
            <span aria-hidden="true" className="text-ink-muted">
              @
            </span>
            <input
              id="handle"
              name="handle"
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              value={handle}
              onChange={(ev) => {
                setHandleTouched(true);
                setHandle(ev.target.value.toLowerCase());
              }}
              className="min-h-11 w-full rounded-xl bg-transparent px-1 py-2 text-base outline-none"
              {...describedBy("handle", e.handle, true)}
            />
          </div>
        </Field>
        <Field label="Kratek opis (neobvezno)" htmlFor="bio" error={e.bio}>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={v?.bio ?? initial.bio ?? ""}
            className={inputCls}
          />
        </Field>
      </section>

      {interests && (
        <fieldset className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
          <legend className="sr-only">Zanimanja</legend>
          <h2 aria-hidden="true" className="font-display text-lg font-bold">
            Kaj te zanima?
          </h2>
          <p className="text-sm text-ink-muted">
            Pomaga nam razvrstiti odkrivanje. Iskanje vedno prikaže vse.
          </p>
          {e.interests && <p className="text-sm font-medium text-brand-strong">{e.interests}</p>}
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <label key={i.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="interests"
                  value={i.id}
                  defaultChecked={selectedInterests.includes(i.id)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-line peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                  {i.label_sl}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <section className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="font-display text-lg font-bold">Lokacija</h2>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="location_consent"
            checked={consent}
            onChange={(ev) => setConsent(ev.target.checked)}
            className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
          />
          <span>
            <span className="block font-medium">Uporabi moj približni kraj za predloge v bližini</span>
            <span className="block text-sm text-ink-muted">
              Shranimo samo ime kraja, nikoli natančne lokacije. Soglasje lahko kadarkoli prekličeš.
            </span>
          </span>
        </label>
        {consent && (
          <Field label="Kraj" htmlFor="approx_city" error={e.approx_city}>
            <input
              id="approx_city"
              name="approx_city"
              autoComplete="address-level2"
              defaultValue={v?.approx_city ?? initial.approx_city ?? ""}
              placeholder="npr. Ljubljana"
              className={inputCls}
            />
          </Field>
        )}
      </section>

      <fieldset className="space-y-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
        <legend className="sr-only">Vidnost profila</legend>
        <h2 aria-hidden="true" className="mb-2 font-display text-lg font-bold">
          Kdo vidi moj profil?
        </h2>
        {visibilityOptions.map((o) => (
          <label
            key={o.v}
            className="flex cursor-pointer gap-3 rounded-2xl p-3 ring-1 ring-line has-[:checked]:bg-brand-soft has-[:checked]:ring-brand"
          >
            <input
              type="radio"
              name="visibility"
              value={o.v}
              defaultChecked={(v?.visibility ?? initial.visibility) === o.v}
              className="mt-1 size-4 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-semibold">{o.l}</span>
              <span className="block text-sm text-ink-muted">{o.d}</span>
            </span>
          </label>
        ))}
        <p className="pt-1 text-xs text-ink-muted">
          E-pošte, nakupov in rezervacij nikoli ne prikažemo na profilu.
        </p>
      </fieldset>

      <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 px-1")}>
        <input
          type="checkbox"
          name="marketing_email"
          defaultChecked={marketingConsent}
          className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
        />
        <span>
          <span className="block font-medium">Pošiljajte mi novice in predloge dogodkov po e-pošti</span>
          <span className="block text-sm text-ink-muted">
            Neobvezno. Obvestila o tvojih rezervacijah prejmeš vedno.
          </span>
        </span>
      </label>

      <SubmitButton size="lg" className="w-full sm:w-auto">
        {mode === "onboarding" ? "Nadaljuj" : "Shrani"}
      </SubmitButton>
    </form>
  );
}
