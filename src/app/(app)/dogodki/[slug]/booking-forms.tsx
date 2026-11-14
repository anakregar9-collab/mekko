"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { bookEvent, cancelBooking } from "@/lib/actions/bookings";

export function BookingForm({
  slug,
  eventId,
  occurrences,
  maxPerBooking,
  series,
}: {
  slug: string;
  eventId: string;
  occurrences: { id: string; label: string; disabled: boolean }[];
  maxPerBooking: number;
  series: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(bookEvent.bind(null, slug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3" data-testid="booking-form">
      <FormMessage state={state} />
      <input type="hidden" name="event_id" value={eventId} />
      {!series && (
        <Field label="Termin" htmlFor="occurrence_id">
          <select id="occurrence_id" name="occurrence_id" className={inputCls}>
            {occurrences.map((o) => (
              <option key={o.id} value={o.id} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Število oseb" htmlFor="quantity">
        <select id="quantity" name="quantity" className={inputCls} defaultValue="1">
          {Array.from({ length: maxPerBooking }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sporočilo organizatorju (neobvezno)" htmlFor="note">
        <input id="note" name="note" maxLength={300} className={inputCls} />
      </Field>
      <SubmitButton pendingText="Prijavljam …" className="w-full">
        Prijavi se
      </SubmitButton>
    </form>
  );
}

export function CancelBookingForm({
  slug,
  bookingId,
  label,
}: {
  slug: string;
  bookingId: string;
  label: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(cancelBooking.bind(null, slug), {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Res se želiš odjaviti?")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <FormMessage state={state} />
      <input type="hidden" name="booking_id" value={bookingId} />
      <SubmitButton variant="secondary" size="sm" pendingText="…">
        {label}
      </SubmitButton>
    </form>
  );
}
