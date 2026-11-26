"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import type { CancellationPolicy, EventSchedule, RegistrationMode } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const steps = ["Osnove", "Termini", "Prijave", "Pregled"] as const;

const scheduleOptions: { v: EventSchedule; l: string; d: string }[] = [
  { v: "one_off", l: "Enkratni", d: "En termin" },
  { v: "multi_session", l: "Večkratni tečaj", d: "Ena prijava za vsa srečanja" },
  { v: "recurring", l: "Ponavljajoči", d: "Prijava na posamezen termin" },
];

const registrationOptions: { v: RegistrationMode; l: string; d: string }[] = [
  { v: "native", l: "Prijava prek Mekka", d: "Udeleženci v tvojem seznamu, opomniki, Moje aktivnosti" },
  { v: "manual_payment", l: "Plačilo pri meni", d: "Mekko zbere prijave, plačilo uredite sami" },
  { v: "external", l: "Zunanja povezava", d: "Prijava na tvoji strani – jasno označeno" },
];

interface Draft {
  title: string;
  summary: string;
  schedule: EventSchedule;
  isOnline: boolean;
  isPrivate: boolean;
  sessions: { date: string; start: string; end: string }[];
  registration: RegistrationMode;
  externalUrl: string;
  capacity: string;
  priceEur: string;
  policy: CancellationPolicy["code"];
}

const initial: Draft = {
  title: "",
  summary: "",
  schedule: "one_off",
  isOnline: false,
  isPrivate: false,
  sessions: [{ date: "", start: "10:00", end: "12:00" }],
  registration: "native",
  externalUrl: "",
  capacity: "",
  priceEur: "0",
  policy: "flexible",
};

export function CreateEventFlow({ policies }: { policies: CancellationPolicy[] }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  function validate(s: number): string[] {
    const e: string[] = [];
    if (s === 0 && d.title.trim().length < 3) e.push("Naslov naj ima vsaj 3 znake.");
    if (s === 1 && d.sessions.some((x) => !x.date)) e.push("Vsak termin potrebuje datum.");
    if (s === 1 && d.sessions.some((x) => x.end <= x.start)) e.push("Konec mora biti po začetku.");
    if (s === 2 && d.registration === "external" && !/^https:\/\//.test(d.externalUrl))
      e.push("Zunanja povezava mora začeti s https://.");
    if (s === 2 && d.capacity && !(Number(d.capacity) > 0)) e.push("Kapaciteta mora biti pozitivno število.");
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (e.length === 0) setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  if (submitted) {
    return (
      <div
        className="rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[var(--shadow-card)]"
        role="status"
      >
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-sage-soft text-sage-ink">
          <Check aria-hidden="true" />
        </span>
        <p className="font-display text-xl font-bold">Prototip: dogodek ni bil shranjen</p>
        <p className="mt-1 text-ink-muted">
          Shranjevanje osnutkov in objava pridejo v M2. Tako bo izgledal tok, ko bo povezan.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setD(initial);
            setStep(0);
            setSubmitted(false);
          }}
        >
          Začni znova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/prototip/ustvari"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-5" /> Ustvari
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nov dogodek</h1>

      <ol className="grid grid-cols-4 gap-2" aria-label="Koraki">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="space-y-1">
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
            <span className={cn("block text-xs font-semibold", i === step ? "text-ink" : "text-ink-muted")}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < steps.length - 1) next();
          else setSubmitted(true);
        }}
        className="space-y-5 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6"
      >
        {errors.length > 0 && (
          <div role="alert" className="rounded-2xl bg-brand-soft p-3 text-sm text-brand-strong">
            <ul className="list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 0 && (
          <>
            <Field label="Naslov" htmlFor="title">
              <input
                id="title"
                className={inputCls}
                value={d.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="npr. Keramika za začetnike"
              />
            </Field>
            <Field label="Kratek opis" htmlFor="summary" hint="Prikaže se na kartici v odkrivanju.">
              <textarea
                id="summary"
                rows={3}
                className={inputCls}
                value={d.summary}
                onChange={(e) => set("summary", e.target.value)}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-1 font-semibold">Vrsta</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {scheduleOptions.map((o) => (
                  <RadioCard
                    key={o.v}
                    name="schedule"
                    checked={d.schedule === o.v}
                    onChange={() => set("schedule", o.v)}
                    label={o.l}
                    desc={o.d}
                  />
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <Toggle label="Online dogodek" checked={d.isOnline} onChange={(v) => set("isOnline", v)} />
              <Toggle
                label="Zaseben (samo s povezavo)"
                checked={d.isPrivate}
                onChange={(v) => set("isPrivate", v)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <fieldset className="space-y-3">
            <legend className="mb-1 font-semibold">
              {d.schedule === "multi_session"
                ? "Srečanja tečaja"
                : d.schedule === "recurring"
                  ? "Termini"
                  : "Termin"}
            </legend>
            {d.sessions.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end"
              >
                <Field
                  label={`Datum ${d.sessions.length > 1 ? i + 1 : ""}`}
                  htmlFor={`date-${i}`}
                  className="col-span-2 sm:col-span-1"
                >
                  <input
                    id={`date-${i}`}
                    type="date"
                    className={inputCls}
                    value={s.date}
                    onChange={(e) => updSession(i, { date: e.target.value })}
                  />
                </Field>
                <Field label="Od" htmlFor={`start-${i}`}>
                  <input
                    id={`start-${i}`}
                    type="time"
                    className={inputCls}
                    value={s.start}
                    onChange={(e) => updSession(i, { start: e.target.value })}
                  />
                </Field>
                <Field label="Do" htmlFor={`end-${i}`}>
                  <input
                    id={`end-${i}`}
                    type="time"
                    className={inputCls}
                    value={s.end}
                    onChange={(e) => updSession(i, { end: e.target.value })}
                  />
                </Field>
                {d.sessions.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Odstrani termin ${i + 1}`}
                    onClick={() =>
                      set(
                        "sessions",
                        d.sessions.filter((_, j) => j !== i),
                      )
                    }
                    className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-brand-soft"
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                  </button>
                )}
              </div>
            ))}
            {d.schedule !== "one_off" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set("sessions", [...d.sessions, { date: "", start: "10:00", end: "12:00" }])}
              >
                <Plus aria-hidden="true" className="size-4" /> Dodaj termin
              </Button>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <>
            <fieldset className="space-y-2">
              <legend className="mb-1 font-semibold">Kako se udeleženci prijavijo?</legend>
              <div className="grid gap-2">
                {registrationOptions.map((o) => (
                  <RadioCard
                    key={o.v}
                    name="registration"
                    checked={d.registration === o.v}
                    onChange={() => set("registration", o.v)}
                    label={o.l}
                    desc={o.d}
                  />
                ))}
              </div>
            </fieldset>
            {d.registration === "external" ? (
              <Field label="Povezava do prijave" htmlFor="ext">
                <input
                  id="ext"
                  type="url"
                  inputMode="url"
                  className={inputCls}
                  value={d.externalUrl}
                  onChange={(e) => set("externalUrl", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Število mest" htmlFor="cap" hint="Pusti prazno za neomejeno.">
                  <input
                    id="cap"
                    inputMode="numeric"
                    className={inputCls}
                    value={d.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                  />
                </Field>
                <Field
                  label="Cena (€)"
                  htmlFor="price"
                  hint={
                    d.registration === "native"
                      ? "Plačljive prijave prek Mekka so na voljo od M3."
                      : "Plačilo uredite neposredno."
                  }
                >
                  <input
                    id="price"
                    inputMode="decimal"
                    className={inputCls}
                    value={d.priceEur}
                    onChange={(e) => set("priceEur", e.target.value)}
                  />
                </Field>
                <Field label="Pogoji odpovedi" htmlFor="policy" className="sm:col-span-2">
                  <select
                    id="policy"
                    className={inputCls}
                    value={d.policy}
                    onChange={(e) => set("policy", e.target.value as Draft["policy"])}
                  >
                    {policies.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.title} – {p.summary}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <dl className="divide-y divide-line">
            <Row k="Naslov" v={d.title} />
            <Row
              k="Vrsta"
              v={`${scheduleOptions.find((o) => o.v === d.schedule)?.l}${d.isOnline ? " · online" : ""}${d.isPrivate ? " · zaseben" : ""}`}
            />
            <Row k="Termini" v={d.sessions.map((s) => `${s.date} ${s.start}–${s.end}`).join(", ")} />
            <Row k="Prijava" v={registrationOptions.find((o) => o.v === d.registration)?.l ?? ""} />
            {d.registration !== "external" && <Row k="Mesta" v={d.capacity || "neomejeno"} />}
          </dl>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => {
              setErrors([]);
              setStep((s) => Math.max(s - 1, 0));
            }}
          >
            Nazaj
          </Button>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 font-semibold text-white hover:bg-brand-strong"
          >
            {step === steps.length - 1 ? "Objavi (prototip)" : "Naprej"}
          </button>
        </div>
      </form>
    </div>
  );

  function updSession(i: number, patch: Partial<Draft["sessions"][number]>) {
    set(
      "sessions",
      d.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );
  }
}

const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted";

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function RadioCard({
  name,
  checked,
  onChange,
  label,
  desc,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
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
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 accent-[var(--color-brand)]"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-muted">{desc}</span>
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--color-brand)]"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 py-2">
      <dt className="text-sm text-ink-muted">{k}</dt>
      <dd className="font-medium break-words">{v}</dd>
    </div>
  );
}
