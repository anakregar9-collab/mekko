"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { describedBy, Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import {
  addLesson,
  cancelEnrollment,
  createCourse,
  enrollCourse,
  removeLesson,
  setCourseStatus,
  updateCourse,
} from "@/lib/actions/courses";

export function CourseForm({
  spaceSlug,
  courseId,
  interests,
  initial,
}: {
  spaceSlug: string;
  /** Present when editing. */
  courseId?: string;
  interests: { id: number; label_sl: string }[];
  initial?: Record<string, string>;
}) {
  const bound = courseId ? updateCourse.bind(null, spaceSlug, courseId) : createCourse.bind(null, spaceSlug);
  const [state, action] = useActionState<FormState, FormData>(bound, {});
  const v = state.values ?? initial ?? {};
  const e = state.errors ?? {};
  const [paid, setPaid] = useState(v.paid === "true");
  const key = v.nonce ?? "0";
  return (
    <form action={action} className="space-y-3" noValidate data-testid="course-form">
      <FormMessage state={state} />
      <Field label="Naslov tečaja" htmlFor="c-title" error={e.title}>
        <input
          id="c-title"
          name="title"
          maxLength={120}
          defaultValue={v.title}
          className={inputCls}
          {...describedBy("c-title", e.title)}
        />
      </Field>
      <Field label="Kratek opis" htmlFor="c-summary" error={e.summary} hint="Prikaže se na kartici.">
        <input id="c-summary" name="summary" maxLength={200} defaultValue={v.summary} className={inputCls} />
      </Field>
      <Field label="Kaj se naučiš" htmlFor="c-description" error={e.description}>
        <textarea
          id="c-description"
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={v.description}
          className={inputCls}
        />
      </Field>
      <Field label="Kategorija" htmlFor="c-interest">
        <select
          id="c-interest"
          name="interest_id"
          defaultValue={v.interest_id ?? ""}
          className={inputCls}
          key={`i-${key}`}
        >
          <option value="">Brez kategorije</option>
          {interests.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label_sl}
            </option>
          ))}
        </select>
      </Field>
      <input type="hidden" name="paid" value={paid ? "on" : ""} />
      <label className="flex min-h-11 items-center gap-3">
        <input
          key={`paid-${key}`}
          type="checkbox"
          checked={paid}
          onChange={(ev) => setPaid(ev.target.checked)}
          className="size-5 accent-[var(--color-brand)]"
        />
        <span className="font-medium">Plačljiv tečaj</span>
      </label>
      {paid && (
        <div className="space-y-3 rounded-2xl bg-cream p-3">
          <Field label="Cena (€)" htmlFor="c-price" error={e.price}>
            <input
              id="c-price"
              name="price"
              inputMode="decimal"
              defaultValue={v.price}
              className={inputCls}
              {...describedBy("c-price", e.price)}
            />
          </Field>
          <Field label="Navodila za plačilo" htmlFor="c-pay" error={e.payment_instructions}>
            <textarea
              id="c-pay"
              name="payment_instructions"
              rows={2}
              maxLength={1000}
              defaultValue={v.payment_instructions}
              placeholder="IBAN, prejemnik, sklic …"
              className={inputCls}
              {...describedBy("c-pay", e.payment_instructions)}
            />
          </Field>
          <Field
            label="Povezava za spletno plačilo (neobvezno)"
            htmlFor="c-link"
            error={e.payment_link}
            hint="Npr. tvoja Stripe plačilna povezava. Denar gre neposredno tebi."
          >
            <input
              id="c-link"
              name="payment_link"
              type="url"
              defaultValue={v.payment_link}
              placeholder="https://buy.stripe.com/…"
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-ink-muted">
            Kupec dobi dostop do lekcij, ko potrdiš, da si prejel/-a plačilo. Mekko plačil ne obdeluje.
          </p>
        </div>
      )}
      <SubmitButton size="sm" pendingText="Shranjujem …">
        {courseId ? "Shrani tečaj" : "Ustvari tečaj"}
      </SubmitButton>
    </form>
  );
}

export function CourseStatusForm({
  spaceSlug,
  courseId,
  status,
}: {
  spaceSlug: string;
  courseId: string;
  status: "draft" | "published" | "hidden";
}) {
  const [state, action] = useActionState<FormState, FormData>(
    setCourseStatus.bind(null, spaceSlug, courseId),
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="status" value={status === "published" ? "hidden" : "published"} />
      <SubmitButton size="sm" variant={status === "published" ? "secondary" : "primary"} pendingText="…">
        {status === "published" ? "Skrij tečaj" : "Objavi tečaj"}
      </SubmitButton>
    </form>
  );
}

export function LessonForm({ spaceSlug, courseId }: { spaceSlug: string; courseId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addLesson.bind(null, spaceSlug, courseId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const v = state.ok ? {} : (state.values ?? {});
  const e = state.errors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate data-testid="lesson-form">
      <FormMessage state={state} />
      <Field label="Naslov lekcije" htmlFor="l-title" error={e.title}>
        <input
          id="l-title"
          name="title"
          maxLength={120}
          defaultValue={v.title}
          className={inputCls}
          {...describedBy("l-title", e.title)}
        />
      </Field>
      <Field
        label="YouTube povezava"
        htmlFor="l-video"
        error={e.video}
        hint="Na YouTubu nastavi video kot »Neuvrščeno« (unlisted), da ga ne najde vsak."
      >
        <input
          id="l-video"
          name="video"
          type="url"
          defaultValue={v.video}
          placeholder="https://youtu.be/…"
          className={inputCls}
          {...describedBy("l-video", e.video)}
        />
      </Field>
      <Field label="Zapiski (neobvezno)" htmlFor="l-notes" error={e.notes}>
        <textarea
          id="l-notes"
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={v.notes}
          className={inputCls}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="is_preview" className="size-5 accent-[var(--color-brand)]" />
        <span>
          <span className="block font-medium">Brezplačen predogled</span>
          <span className="block text-sm text-ink-muted">
            To lekcijo lahko pogleda vsak, tudi brez nakupa.
          </span>
        </span>
      </label>
      <SubmitButton size="sm" pendingText="Dodajam …">
        Dodaj lekcijo
      </SubmitButton>
    </form>
  );
}

export function RemoveLessonForm({
  spaceSlug,
  courseId,
  lessonId,
  title,
}: {
  spaceSlug: string;
  courseId: string;
  lessonId: string;
  title: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    removeLesson.bind(null, spaceSlug, courseId),
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm(`Odstranim lekcijo »${title}«?`)) ev.preventDefault();
      }}
    >
      {state.message && <p className="text-sm text-brand-strong">{state.message}</p>}
      <input type="hidden" name="lesson_id" value={lessonId} />
      <button type="submit" className="min-h-9 text-sm font-semibold text-ink-muted underline">
        Odstrani<span className="sr-only"> lekcijo {title}</span>
      </button>
    </form>
  );
}

export function CancelEnrollmentForm({
  spaceSlug,
  courseId,
  enrollmentId,
}: {
  spaceSlug: string;
  courseId: string;
  enrollmentId: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    cancelEnrollment.bind(null, spaceSlug, courseId),
    {},
  );
  if (state.ok) return <FormMessage state={state} />;
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center font-semibold text-ink-muted">
        Prekliči
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <FormMessage state={state.message ? state : undefined} />
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <Field label="Razlog (kupec ga vidi)" htmlFor={`ce-${enrollmentId}`} error={state.errors?.reason}>
          <input id={`ce-${enrollmentId}`} name="reason" className={inputCls} />
        </Field>
        <SubmitButton size="sm" variant="secondary" pendingText="…">
          Prekliči dostop
        </SubmitButton>
      </form>
    </details>
  );
}

export function EnrollForm({ slug, courseId, paid }: { slug: string; courseId: string; paid: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(enrollCourse.bind(null, slug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="course_id" value={courseId} />
      <SubmitButton pendingText="…" className="w-full">
        {paid ? "Kupi tečaj" : "Začni brezplačno"}
      </SubmitButton>
    </form>
  );
}
