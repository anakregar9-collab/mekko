"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { joinWaitlist } from "@/lib/actions/community";

/** "Obvesti me, ko se sprosti mesto" for full sessions (or a full series). */
export function WaitlistForm({
  slug,
  eventId,
  options,
  maxPerBooking,
}: {
  slug: string;
  eventId: string;
  /** Full sessions; empty list = whole series. */
  options: { id: string; label: string }[];
  maxPerBooking: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(joinWaitlist.bind(null, slug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2 rounded-2xl bg-lilac-soft p-3" data-testid="waitlist-form">
      <p className="text-sm font-semibold text-lilac-ink">Zasedeno? Pridruži se čakalni listi.</p>
      <FormMessage state={state} />
      <input type="hidden" name="event_id" value={eventId} />
      {options.length > 0 && (
        <Field label="Termin za čakalno listo" htmlFor="wl-occ">
          <select id="wl-occ" name="occurrence_id" className={inputCls}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Število oseb (čakalna lista)" htmlFor="wl-qty">
        <select id="wl-qty" name="quantity" className={inputCls} defaultValue="1">
          {Array.from({ length: maxPerBooking }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <SubmitButton size="sm" variant="secondary" pendingText="…">
        Obvesti me, ko se sprosti mesto
      </SubmitButton>
    </form>
  );
}
