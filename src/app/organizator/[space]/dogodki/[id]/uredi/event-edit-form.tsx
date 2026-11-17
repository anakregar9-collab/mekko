"use client";

import { useActionState, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { PhotoInput } from "@/components/ui/photo-input";
import { updateEvent } from "@/lib/actions/events";
import { cn } from "@/lib/cn";

const covers = [
  { v: "coral", l: "Koralna" },
  { v: "sun", l: "Rumena" },
  { v: "sage", l: "Zelena" },
  { v: "lilac", l: "Vijolična" },
  { v: "sky", l: "Modra" },
  { v: "clay", l: "Glinena" },
];

export interface EventEditInitial {
  values: Record<string, string>;
  isOnline: boolean;
  external: boolean;
  photoUrl: string | null;
  booked: number;
}

export function EventEditForm({
  spaceSlug,
  eventId,
  interests,
  initial,
}: {
  spaceSlug: string;
  eventId: string;
  interests: { id: number; label_sl: string }[];
  initial: EventEditInitial;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateEvent.bind(null, spaceSlug, eventId), {});
  const v = state.values ?? initial.values;
  const e = state.errors ?? {};
  const [beginner, setBeginner] = useState(v.beginner_friendly === "true");
  const [family, setFamily] = useState(v.family_friendly === "true");
  const formKey = v.nonce ?? "0";

  return (
    <form
      action={action}
      noValidate
      className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
    >
      <FormMessage state={state} />
      <Field label="Ime dogodka" htmlFor="title" error={e.title}>
        <input
          id="title"
          name="title"
          defaultValue={v.title}
          className={inputCls}
          {...describedBy("title", e.title)}
        />
      </Field>
      <Field label="Kratek opis" htmlFor="summary" error={e.summary}>
        <input id="summary" name="summary" maxLength={200} defaultValue={v.summary} className={inputCls} />
      </Field>
      <Field label="Podroben opis" htmlFor="description" error={e.description}>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          defaultValue={v.description}
          className={inputCls}
        />
      </Field>
      <Field label="Kategorija" htmlFor="interest_id">
        <select id="interest_id" name="interest_id" defaultValue={v.interest_id} className={inputCls}>
          <option value="">Brez kategorije</option>
          {interests.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label_sl}
            </option>
          ))}
        </select>
      </Field>

      {initial.isOnline ? (
        <Field
          label="Povezava do spletne sobe"
          htmlFor="online_url"
          hint="Ob spremembi prijavljeni dobijo obvestilo."
          error={e.online_url}
        >
          <input
            id="online_url"
            name="online_url"
            type="url"
            defaultValue={v.online_url}
            className={inputCls}
            {...describedBy("online_url", e.online_url, true)}
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kraj" htmlFor="city" error={e.city}>
            <input
              id="city"
              name="city"
              defaultValue={v.city}
              className={inputCls}
              {...describedBy("city", e.city)}
            />
          </Field>
          <Field label="Naslov lokacije" htmlFor="address" hint="Ob spremembi prijavljeni dobijo obvestilo.">
            <input
              id="address"
              name="address"
              defaultValue={v.address}
              className={inputCls}
              {...describedBy("address", undefined, true)}
            />
          </Field>
        </div>
      )}

      {initial.external ? (
        <Field label="Povezava do prijave" htmlFor="external_url" error={e.external_url}>
          <input
            id="external_url"
            name="external_url"
            type="url"
            defaultValue={v.external_url}
            className={inputCls}
          />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Število mest"
            htmlFor="capacity"
            hint={
              initial.booked
                ? `Prazno = neomejeno. Že prijavljenih: ${initial.booked}.`
                : "Prazno = neomejeno"
            }
            error={e.capacity}
          >
            <input
              id="capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={v.capacity}
              className={inputCls}
              {...describedBy("capacity", e.capacity, true)}
            />
          </Field>
          <Field label="Največ oseb na prijavo" htmlFor="max_per_booking">
            <select
              id="max_per_booking"
              name="max_per_booking"
              defaultValue={v.max_per_booking}
              className={inputCls}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label="Kaj naj udeleženci prinesejo (neobvezno)" htmlFor="materials">
        <textarea
          id="materials"
          name="materials"
          rows={2}
          maxLength={1000}
          defaultValue={v.materials}
          className={inputCls}
        />
      </Field>

      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold">Za koga je</legend>
        <input type="hidden" name="beginner_friendly" value={beginner ? "on" : ""} />
        <input type="hidden" name="family_friendly" value={family ? "on" : ""} />
        <label className="flex min-h-11 items-center gap-3">
          <input
            key={`b-${formKey}`}
            type="checkbox"
            checked={beginner}
            onChange={(ev) => setBeginner(ev.target.checked)}
            className="size-5 accent-[var(--color-brand)]"
          />
          <span className="font-medium">Primerno za začetnike</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            key={`f-${formKey}`}
            type="checkbox"
            checked={family}
            onChange={(ev) => setFamily(ev.target.checked)}
            className="size-5 accent-[var(--color-brand)]"
          />
          <span className="font-medium">Primerno za otroke in družine</span>
        </label>
      </fieldset>

      {initial.photoUrl && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Trenutna fotografija</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- small preview of the stored photo */}
          <img
            src={initial.photoUrl}
            alt="Trenutna fotografija dogodka"
            className="h-32 w-full rounded-2xl object-cover"
          />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="remove_photo" className="size-5 accent-[var(--color-brand)]" />
            Odstrani trenutno fotografijo
          </label>
        </div>
      )}
      <PhotoInput
        name="photo"
        label={initial.photoUrl ? "Nova fotografija (neobvezno)" : "Fotografija dogodka (neobvezno)"}
        error={e.photo}
      />
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Barva kartice (če ni fotografije)</legend>
        <div className="flex flex-wrap gap-2">
          {covers.map((c) => (
            <label key={c.v} className="cursor-pointer">
              <input
                type="radio"
                name="cover"
                value={c.v}
                defaultChecked={(v.cover || "coral") === c.v}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line",
                  "peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:outline-2",
                )}
              >
                {c.l}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-ink-muted">
        Termini, cena, pogoji plačila in pogoji odjave ostanejo, kot so bili objavljeni, ker so se ljudje
        nanje že prijavili.
      </p>
      <SubmitButton size="lg" pendingText="Shranjujem …">
        Shrani spremembe
      </SubmitButton>
    </form>
  );
}
