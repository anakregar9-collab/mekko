"use client";

import { useActionState, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { updateLegalInfo } from "@/lib/actions/spaces";
import { legalForms, type LegalForm } from "@/lib/spaces";
import { cn } from "@/lib/cn";

export interface LegalInitial {
  legal_form: LegalForm | "";
  legal_name: string;
  address: string;
  registration_number: string;
  contact_email: string;
}

export function LegalInfoForm({ slug, initial }: { slug: string; initial: LegalInitial }) {
  const [state, action] = useActionState<FormState, FormData>(updateLegalInfo.bind(null, slug), {});
  const v = { ...initial, ...(state.values ?? {}) } as LegalInitial;
  const e = state.errors ?? {};
  const [form, setForm] = useState<LegalForm | "">(initial.legal_form);
  const needsReg = form === "company" || form === "sole_trader";

  return (
    <form
      action={action}
      noValidate
      className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
      data-testid="legal-form"
    >
      <div>
        <h2 className="font-display text-xl font-bold">Pravni status organizatorja</h2>
        <p className="text-sm text-ink-muted">
          Obiskovalci morajo vedeti, od koga kupujejo. Status je viden vsem, podatki ponudnika pa prijavljenim
          uporabnikom. Obvezno za plačljive dogodke.
        </p>
      </div>
      <FormMessage state={state} />
      <input type="hidden" name="legal_form" value={form} />
      <fieldset className="space-y-2" key={state.values?.nonce ?? "0"}>
        <legend className="text-sm font-semibold">Kako nastopaš?</legend>
        {e.legal_form && <p className="text-sm font-medium text-brand-strong">{e.legal_form}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {legalForms.map((f) => (
            <label
              key={f.v}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl p-3 ring-1",
                form === f.v ? "bg-brand-soft ring-brand" : "bg-surface ring-line",
              )}
            >
              <input
                type="radio"
                name="legal_form_choice"
                value={f.v}
                checked={form === f.v}
                onChange={() => setForm(f.v)}
                className="mt-1 size-4 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block font-semibold">{f.l}</span>
                <span className="block text-sm text-ink-muted">{f.d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {form === "private" && (
        <p className="rounded-2xl bg-sun-soft p-3 text-sm text-sun-ink">
          Obiskovalci bodo videli, da nisi podjetje in da zato zanje ne veljajo pravice potrošnikov. Če
          delavnice izvajaš redno in za plačilo, se posvetuj o registraciji (s.p. ali ODD).
        </p>
      )}

      {form && form !== "private" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Ime ali naziv ponudnika"
            htmlFor="legal_name"
            error={e.legal_name}
            className="sm:col-span-2"
          >
            <input
              id="legal_name"
              name="legal_name"
              defaultValue={v.legal_name}
              placeholder={form === "sole_trader" ? "Ana Novak s.p." : undefined}
              className={inputCls}
              {...describedBy("legal_name", e.legal_name)}
            />
          </Field>
          <Field label="Naslov" htmlFor="legal_address" error={e.address} className="sm:col-span-2">
            <input
              id="legal_address"
              name="address"
              defaultValue={v.address}
              className={inputCls}
              {...describedBy("legal_address", e.address)}
            />
          </Field>
          <Field
            label={needsReg ? "Matična ali davčna številka" : "Matična ali davčna številka (neobvezno)"}
            htmlFor="registration_number"
            error={e.registration_number}
          >
            <input
              id="registration_number"
              name="registration_number"
              defaultValue={v.registration_number}
              className={inputCls}
              {...describedBy("registration_number", e.registration_number)}
            />
          </Field>
          <Field label="E-pošta za stranke" htmlFor="contact_email" error={e.contact_email}>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={v.contact_email}
              className={inputCls}
              {...describedBy("contact_email", e.contact_email)}
            />
          </Field>
        </div>
      )}

      <SubmitButton pendingText="Shranjujem …">Shrani pravne podatke</SubmitButton>
    </form>
  );
}
