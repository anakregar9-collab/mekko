"use client";

import { useActionState, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { createIdea, updateIdea } from "@/lib/actions/ideas";
import { cn } from "@/lib/cn";
import { PhotoInput } from "@/components/ui/photo-input";

const covers = [
  { v: "sun", l: "Rumena" },
  { v: "coral", l: "Koralna" },
  { v: "sage", l: "Zelena" },
  { v: "lilac", l: "Vijolična" },
  { v: "sky", l: "Modra" },
  { v: "clay", l: "Glinena" },
];

export interface IdeaEditTarget {
  id: string;
  values: Record<string, string>;
  photoUrl: string | null;
}

/** Create a new idea, or edit an existing one when `edit` is given. */
export function IdeaForm({
  interests,
  edit,
}: {
  interests: { id: number; label_sl: string }[];
  edit?: IdeaEditTarget;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    edit ? updateIdea.bind(null, edit.id) : createIdea,
    {},
  );
  const v = state.values ?? edit?.values ?? {};
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
      <Field label="Naslov ideje" htmlFor="title" error={e.title}>
        <input
          id="title"
          name="title"
          defaultValue={v.title}
          className={inputCls}
          {...describedBy("title", e.title)}
        />
      </Field>
      <Field label="Kratek opis" htmlFor="summary" hint="Ena poved, prikaže se na kartici." error={e.summary}>
        <input
          id="summary"
          name="summary"
          maxLength={200}
          defaultValue={v.summary}
          className={inputCls}
          {...describedBy("summary", e.summary, true)}
        />
      </Field>
      <Field label="Kategorija" htmlFor="interest_id" error={e.interest_id}>
        <select
          id="interest_id"
          name="interest_id"
          defaultValue={v.interest_id && v.interest_id !== "0" ? v.interest_id : ""}
          className={inputCls}
          {...describedBy("interest_id", e.interest_id)}
        >
          <option value="" disabled>
            Izberi …
          </option>
          {interests.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label_sl}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Navodila"
        htmlFor="body"
        hint="Korak za korakom. Vsak korak v svojo vrstico, npr. »1. Prepogni list na pol.«"
        error={e.body}
      >
        <textarea
          id="body"
          name="body"
          rows={8}
          maxLength={10000}
          defaultValue={v.body}
          className={inputCls}
          {...describedBy("body", e.body, true)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Potrebščine (neobvezno)" htmlFor="materials" error={e.materials}>
          <textarea
            id="materials"
            name="materials"
            rows={3}
            maxLength={1000}
            defaultValue={v.materials}
            className={inputCls}
          />
        </Field>
        <Field label="Koliko časa vzame (neobvezno)" htmlFor="time_needed" error={e.time_needed}>
          <input
            id="time_needed"
            name="time_needed"
            placeholder="npr. 30 minut"
            defaultValue={v.time_needed}
            className={inputCls}
          />
        </Field>
      </div>
      <Field
        label="Povezava (neobvezno)"
        htmlFor="external_url"
        hint="Npr. video ali vzorec na tvoji strani."
        error={e.external_url}
      >
        <input
          id="external_url"
          name="external_url"
          type="url"
          placeholder="https://"
          defaultValue={v.external_url}
          className={inputCls}
          {...describedBy("external_url", e.external_url, true)}
        />
      </Field>

      {edit?.photoUrl && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Trenutna fotografija</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- small preview of the stored photo */}
          <img
            src={edit.photoUrl}
            alt="Trenutna fotografija ideje"
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
        label={edit?.photoUrl ? "Nova fotografija (neobvezno)" : "Fotografija (neobvezno)"}
        error={e.photo}
      />

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

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Barva kartice (če ni fotografije)</legend>
        <div className="flex flex-wrap gap-2">
          {covers.map((c) => (
            <label key={c.v} className="cursor-pointer">
              <input
                type="radio"
                name="cover"
                value={c.v}
                defaultChecked={(v.cover || "sun") === c.v}
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
        Objavi samo svojo vsebino ali vsebino, ki jo smeš deliti. Ideje, ki kršijo avtorske pravice ali
        pravila, lahko moderatorji skrijejo.
      </p>
      <SubmitButton size="lg" pendingText={edit ? "Shranjujem …" : "Objavljam …"}>
        {edit ? "Shrani spremembe" : "Objavi idejo"}
      </SubmitButton>
    </form>
  );
}
