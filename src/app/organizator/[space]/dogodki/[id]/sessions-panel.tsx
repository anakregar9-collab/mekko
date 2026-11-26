"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { addSession, cancelSession, rescheduleSession } from "@/lib/actions/community";

export interface SessionRow {
  id: string;
  label: string;
  date: string;
  start: string;
  end: string;
  editable: boolean;
  cancelled: boolean;
}

function SlotFields({ prefix, s }: { prefix: string; s?: { date: string; start: string; end: string } }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <Field label="Datum" htmlFor={`${prefix}-d`}>
        <input id={`${prefix}-d`} name="date" type="date" defaultValue={s?.date} className={inputCls} />
      </Field>
      <Field label="Od" htmlFor={`${prefix}-s`}>
        <input
          id={`${prefix}-s`}
          name="start"
          type="time"
          defaultValue={s?.start ?? "17:00"}
          className={inputCls}
        />
      </Field>
      <Field label="Do" htmlFor={`${prefix}-e`}>
        <input
          id={`${prefix}-e`}
          name="end"
          type="time"
          defaultValue={s?.end ?? "19:00"}
          className={inputCls}
        />
      </Field>
    </div>
  );
}

function SessionItem({
  spaceSlug,
  eventId,
  s,
  n,
}: {
  spaceSlug: string;
  eventId: string;
  s: SessionRow;
  n: number;
}) {
  const [mState, move] = useActionState<FormState, FormData>(
    rescheduleSession.bind(null, spaceSlug, eventId),
    {},
  );
  const [cState, cancel] = useActionState<FormState, FormData>(
    cancelSession.bind(null, spaceSlug, eventId),
    {},
  );
  return (
    <li className="space-y-2 py-3" data-testid="session">
      <p className={s.cancelled ? "text-ink-muted line-through" : "font-semibold"}>
        {n}. {s.label} {s.cancelled && <span className="no-underline">(odpovedan)</span>}
      </p>
      <FormMessage state={mState.message ? mState : cState.message ? cState : undefined} />
      {s.editable && (
        <div className="flex flex-wrap gap-3">
          <details className="w-full sm:w-auto">
            <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-brand-strong">
              Premakni termin<span className="sr-only"> {n}</span>
            </summary>
            <form action={move} className="mt-2 space-y-2">
              <input type="hidden" name="occurrence_id" value={s.id} />
              <SlotFields prefix={`mv-${s.id}`} s={s} />
              <p className="text-xs text-ink-muted">
                Prijave ostanejo, prijavljeni dobijo obvestilo z novim časom.
              </p>
              <SubmitButton size="sm" pendingText="…">
                Shrani nov termin
              </SubmitButton>
            </form>
          </details>
          <details className="w-full sm:w-auto">
            <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-ink-muted">
              Odpovej termin<span className="sr-only"> {n}</span>
            </summary>
            <form action={cancel} className="mt-2 space-y-2">
              <input type="hidden" name="occurrence_id" value={s.id} />
              <Field
                label="Razlog (vidijo ga prijavljeni)"
                htmlFor={`cx-${s.id}`}
                error={cState.errors?.reason}
              >
                <input id={`cx-${s.id}`} name="reason" className={inputCls} />
              </Field>
              <SubmitButton size="sm" variant="secondary" pendingText="…">
                Odpovej ta termin
              </SubmitButton>
            </form>
          </details>
        </div>
      )}
    </li>
  );
}

export function SessionsPanel({
  spaceSlug,
  eventId,
  sessions,
}: {
  spaceSlug: string;
  eventId: string;
  sessions: SessionRow[];
}) {
  const [aState, add] = useActionState<FormState, FormData>(addSession.bind(null, spaceSlug, eventId), {});
  return (
    <div className="space-y-3" data-testid="sessions-panel">
      <ul className="divide-y divide-line">
        {sessions.map((s, i) => (
          <SessionItem key={s.id} spaceSlug={spaceSlug} eventId={eventId} s={s} n={i + 1} />
        ))}
      </ul>
      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand-strong">
          + Dodaj termin
        </summary>
        <form action={add} className="mt-2 space-y-2" key={aState.ok ? aState.message : "add"}>
          <FormMessage state={aState} />
          <SlotFields prefix="new" />
          <SubmitButton size="sm" pendingText="…">
            Dodaj termin
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}
