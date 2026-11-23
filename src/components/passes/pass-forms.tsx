"use client";

import { useActionState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { bookWithPass, cancelPass, createPassType, extendPass, requestPass } from "@/lib/actions/passes";

export function PassTypeForm({ spaceSlug }: { spaceSlug: string }) {
  const [state, action] = useActionState<FormState, FormData>(createPassType.bind(null, spaceSlug), {});
  const v = state.ok ? {} : (state.values ?? {});
  const e = state.errors ?? {};
  const field = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
  ) => (
    <Field label={label} htmlFor={`pt-${name}`} error={e[name]} hint={hint}>
      <input
        id={`pt-${name}`}
        name={name}
        defaultValue={v[name]}
        className={inputCls}
        {...describedBy(`pt-${name}`, e[name])}
        {...props}
      />
    </Field>
  );
  return (
    <form
      action={action}
      className="space-y-3"
      noValidate
      data-testid="pass-type-form"
      key={state.ok ? state.message : "f"}
    >
      <FormMessage state={state} />
      {field("name", "Ime karte", { maxLength: 80, placeholder: "npr. 10 obiskov joge" })}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {field("visits", "Število obiskov", { inputMode: "numeric", placeholder: "10" })}
        {field("price", "Cena (€)", { inputMode: "decimal", placeholder: "90" })}
        {field(
          "validity_days",
          "Velja dni",
          { inputMode: "numeric", placeholder: "90" },
          "Od potrditve plačila.",
        )}
      </div>
      <Field label="Opis (neobvezno)" htmlFor="pt-description" error={e.description}>
        <textarea
          id="pt-description"
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={v.description}
          className={inputCls}
        />
      </Field>
      <Field label="Navodila za plačilo" htmlFor="pt-payment_instructions" error={e.payment_instructions}>
        <textarea
          id="pt-payment_instructions"
          name="payment_instructions"
          rows={3}
          maxLength={1000}
          defaultValue={v.payment_instructions}
          placeholder="IBAN, prejemnik, sklic …"
          className={inputCls}
          {...describedBy("pt-payment_instructions", e.payment_instructions)}
        />
      </Field>
      {field(
        "payment_link",
        "Povezava za spletno plačilo (neobvezno)",
        { type: "url", placeholder: "https://buy.stripe.com/…" },
        "Npr. tvoja Stripe plačilna povezava. Denar gre neposredno tebi.",
      )}
      <SubmitButton size="sm" pendingText="Shranjujem …">
        Dodaj karto
      </SubmitButton>
    </form>
  );
}

export function BuyPassForm({
  spaceSlug,
  typeId,
  name,
}: {
  spaceSlug: string;
  typeId: string;
  name: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(requestPass.bind(null, spaceSlug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="type_id" value={typeId} />
      <SubmitButton size="sm" pendingText="…">
        Kupi karto<span className="sr-only"> {name}</span>
      </SubmitButton>
    </form>
  );
}

export function CancelPassForm({ spaceSlug, passId }: { spaceSlug: string; passId: string }) {
  const [state, action] = useActionState<FormState, FormData>(cancelPass.bind(null, spaceSlug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center font-semibold text-ink-muted">
        Prekliči
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <FormMessage state={state.message ? state : undefined} />
        <input type="hidden" name="pass_id" value={passId} />
        <Field label="Razlog (kupec ga vidi)" htmlFor={`cp-${passId}`} error={state.errors?.reason}>
          <input id={`cp-${passId}`} name="reason" className={inputCls} />
        </Field>
        <SubmitButton size="sm" variant="secondary" pendingText="…">
          Prekliči karto
        </SubmitButton>
      </form>
    </details>
  );
}

export function ExtendPassForm({
  spaceSlug,
  passId,
  min,
}: {
  spaceSlug: string;
  passId: string;
  min: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(extendPass.bind(null, spaceSlug), {});
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center font-semibold text-brand-strong">
        Podaljšaj
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <FormMessage state={state} />
        <input type="hidden" name="pass_id" value={passId} />
        <Field label="Velja do" htmlFor={`ex-${passId}`} error={state.errors?.until}>
          <input id={`ex-${passId}`} name="until" type="date" min={min} className={inputCls} />
        </Field>
        <SubmitButton size="sm" pendingText="…">
          Shrani nov datum
        </SubmitButton>
      </form>
    </details>
  );
}

export function PassBookingForm({
  slug,
  eventId,
  passes,
  sessions,
  maxPerBooking,
}: {
  slug: string;
  eventId: string;
  passes: { id: string; label: string; left: number }[];
  sessions: { id: string; label: string }[];
  maxPerBooking: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(bookWithPass.bind(null, slug), {});
  if (state.ok) return <FormMessage state={state} />;
  const most = Math.min(maxPerBooking, Math.max(...passes.map((p) => p.left)));
  return (
    <form action={action} className="space-y-2 rounded-2xl bg-sage-soft p-3" data-testid="pass-booking-form">
      <p className="text-sm font-semibold text-sage-ink">Prijava s karto</p>
      <FormMessage state={state} />
      <input type="hidden" name="event_id" value={eventId} />
      {passes.length === 1 ? (
        <>
          <input type="hidden" name="pass_id" value={passes[0].id} />
          <p className="text-sm">{passes[0].label}</p>
        </>
      ) : (
        <Field label="Karta" htmlFor="pb-pass">
          <select id="pb-pass" name="pass_id" className={inputCls}>
            {passes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Termin (s karto)" htmlFor="pb-occ">
        <select id="pb-occ" name="occurrence_id" className={inputCls}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Število oseb (s karto)" htmlFor="pb-qty">
        <select id="pb-qty" name="quantity" className={inputCls} defaultValue="1">
          {Array.from({ length: Math.max(most, 1) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton size="sm" pendingText="Prijavljam …">
        Prijavi se s karto
      </SubmitButton>
    </form>
  );
}
