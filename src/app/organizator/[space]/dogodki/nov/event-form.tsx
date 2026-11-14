"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { createEvent } from "@/lib/actions/events";
import { cn } from "@/lib/cn";

const covers = [
  { v: "coral", c: "#f08a6e" },
  { v: "sun", c: "#f6b53b" },
  { v: "sage", c: "#7fb894" },
  { v: "lilac", c: "#a98bd6" },
  { v: "sky", c: "#7fb0e0" },
  { v: "clay", c: "#d49a73" },
] as const;

export function EventForm({
  spaceSlug,
  defaultCity,
  interests,
}: {
  spaceSlug: string;
  defaultCity: string;
  interests: { id: number; label_sl: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(createEvent.bind(null, spaceSlug), {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [schedule, setSchedule] = useState(v.schedule || "one_off");
  const [mode, setMode] = useState(v.registration_mode || "native");
  const [online, setOnline] = useState(v.is_online === "true");
  const [sessions, setSessions] = useState([{ k: 0 }]);

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage state={state} />

      <Card title="Osnove">
        <Field label="Ime dogodka" htmlFor="title" error={e.title}>
          <input
            id="title"
            name="title"
            defaultValue={v.title}
            className={inputCls}
            {...describedBy("title", e.title)}
          />
        </Field>
        <Field
          label="Kratek opis"
          htmlFor="summary"
          hint="Prikaže se na kartici v odkrivanju."
          error={e.summary}
        >
          <input
            id="summary"
            name="summary"
            maxLength={200}
            defaultValue={v.summary}
            className={inputCls}
            {...describedBy("summary", e.summary, true)}
          />
        </Field>
        <Field label="Podroben opis" htmlFor="description" hint="Vidijo ga prijavljeni uporabniki.">
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={5000}
            defaultValue={v.description}
            className={inputCls}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Barva kartice</legend>
            <div className="flex flex-wrap gap-2">
              {covers.map((c, i) => (
                <label key={c.v} className="cursor-pointer">
                  <input
                    type="radio"
                    name="cover"
                    value={c.v}
                    defaultChecked={(v.cover || "coral") === c.v}
                    className="peer sr-only"
                  />
                  <span
                    className="block size-10 rounded-full ring-2 ring-transparent ring-offset-2 peer-checked:ring-ink peer-focus-visible:ring-brand"
                    style={{ background: c.c }}
                  >
                    <span className="sr-only">Barva {i + 1}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card title="Termini">
        <fieldset className="space-y-2">
          <legend className="sr-only">Vrsta dogodka</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Radio
              name="schedule"
              value="one_off"
              checked={schedule === "one_off"}
              onChange={setSchedule}
              label="Posamezni termini"
              desc="Ljudje se prijavijo na posamezen termin."
            />
            <Radio
              name="schedule"
              value="multi_session"
              checked={schedule === "multi_session"}
              onChange={setSchedule}
              label="Večkratni tečaj"
              desc="Ena prijava velja za vsa srečanja."
            />
          </div>
        </fieldset>
        {e.sessions && (
          <p role="alert" className="text-sm font-medium text-brand-strong">
            {e.sessions}
          </p>
        )}
        <ul className="space-y-2">
          {sessions.map((s, i) => (
            <li
              key={s.k}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
            >
              <Field
                label={`Datum ${sessions.length > 1 ? i + 1 : ""}`}
                htmlFor={`d-${s.k}`}
                className="col-span-3 sm:col-span-1"
              >
                <input id={`d-${s.k}`} name="session_date" type="date" className={inputCls} />
              </Field>
              <Field label="Od" htmlFor={`s-${s.k}`}>
                <input
                  id={`s-${s.k}`}
                  name="session_start"
                  type="time"
                  defaultValue="17:00"
                  className={inputCls}
                />
              </Field>
              <Field label="Do" htmlFor={`e-${s.k}`}>
                <input
                  id={`e-${s.k}`}
                  name="session_end"
                  type="time"
                  defaultValue="19:00"
                  className={inputCls}
                />
              </Field>
              {sessions.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Odstrani termin ${i + 1}`}
                  onClick={() => setSessions(sessions.filter((x) => x.k !== s.k))}
                  className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-brand-soft"
                >
                  <Trash2 aria-hidden="true" className="size-5" />
                </button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
        <Button variant="secondary" size="sm" onClick={() => setSessions([...sessions, { k: Date.now() }])}>
          <Plus aria-hidden="true" className="size-4" /> Dodaj termin
        </Button>
      </Card>

      <Card title="Lokacija">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="is_online"
            checked={online}
            onChange={(ev) => setOnline(ev.target.checked)}
            className="size-5 accent-[var(--color-brand)]"
          />
          <span className="font-medium">Online dogodek</span>
        </label>
        {online ? (
          <Field
            label="Povezava do spletne sobe (neobvezno)"
            htmlFor="online_url"
            hint="Vidijo jo samo prijavljeni udeleženci."
            error={e.online_url}
          >
            <input
              id="online_url"
              name="online_url"
              type="url"
              placeholder="https://"
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
                defaultValue={v.city ?? defaultCity}
                className={inputCls}
                {...describedBy("city", e.city)}
              />
            </Field>
            <Field label="Naslov lokacije" htmlFor="address" hint="Vidijo ga samo prijavljeni uporabniki.">
              <input id="address" name="address" defaultValue={v.address} className={inputCls} />
            </Field>
          </div>
        )}
      </Card>

      <Card title="Prijave">
        <fieldset className="space-y-2">
          <legend className="sr-only">Način prijave</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Radio
              name="registration_mode"
              value="native"
              checked={mode === "native"}
              onChange={setMode}
              label="Prijava prek Mekka"
              desc="Brezplačno. Seznam udeležencev, obvestila, Moje aktivnosti."
            />
            <Radio
              name="registration_mode"
              value="external"
              checked={mode === "external"}
              onChange={setMode}
              label="Zunanja povezava"
              desc="Prijava na tvoji strani – jasno označeno."
            />
          </div>
        </fieldset>
        {mode === "external" ? (
          <Field label="Povezava do prijave" htmlFor="external_url" error={e.external_url}>
            <input
              id="external_url"
              name="external_url"
              type="url"
              placeholder="https://"
              defaultValue={v.external_url}
              className={inputCls}
              {...describedBy("external_url", e.external_url)}
            />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Število mest" htmlFor="capacity" hint="Prazno = neomejeno" error={e.capacity}>
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
                defaultValue={v.max_per_booking || "4"}
                className={inputCls}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pogoji odjave" htmlFor="cancellation_policy">
              <select
                id="cancellation_policy"
                name="cancellation_policy"
                defaultValue={v.cancellation_policy || "flexible"}
                className={inputCls}
              >
                <option value="flexible">Do 24 ur prej</option>
                <option value="moderate">Do 5 dni prej</option>
                <option value="strict">Do 14 dni prej</option>
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
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton name="publish" value="1" size="lg" pendingText="Objavljam …">
          Objavi dogodek
        </SubmitButton>
        <SubmitButton name="publish" value="0" variant="secondary" size="lg" pendingText="Shranjujem …">
          Shrani kot osnutek
        </SubmitButton>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
  desc,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  label: string;
  desc: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-2xl p-3 ring-1",
        checked ? "bg-brand-soft ring-brand" : "bg-surface ring-line",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 size-4 accent-[var(--color-brand)]"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-muted">{desc}</span>
      </span>
    </label>
  );
}
