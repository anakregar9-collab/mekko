"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import type { FormState } from "@/components/forms";

const errors: Record<string, string> = {
  sold_out: "Ni več dovolj prostih mest.",
  already_booked: "Na ta termin si že prijavljen/-a.",
  invalid_quantity: "Neveljavno število oseb.",
  event_not_bookable: "Na ta dogodek se trenutno ni mogoče prijaviti.",
  external_registration: "Prijava poteka na strani organizatorja.",
  series_booking: "Prijava velja za cel tečaj.",
  not_allowed: "Za to nimaš dovoljenja.",
  booking_not_found: "Prijave ni bilo mogoče najti.",
};

export async function bookEvent(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser({ next: `/dogodki/${slug}` });
  const quantity = Number(formData.get("quantity") ?? 1);
  const occurrence = String(formData.get("occurrence_id") ?? "") || null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_event", {
    p_event: String(formData.get("event_id")),
    p_occurrence: occurrence as string,
    p_quantity: Number.isInteger(quantity) ? quantity : 1,
    p_note: String(formData.get("note") ?? "").slice(0, 300),
  });
  if (error) return { message: errors[error.message] ?? "Prijava ni uspela. Poskusi znova." };
  revalidatePath(`/dogodki/${slug}`);
  revalidatePath("/moje-aktivnosti");
  return { ok: true, message: "Prijava je potrjena. Najdeš jo v Mojih aktivnostih." };
}

export async function cancelBooking(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking: String(formData.get("booking_id")) });
  if (error) return { message: errors[error.message] ?? "Odjave ni bilo mogoče izvesti." };
  revalidatePath(`/dogodki/${slug}`);
  revalidatePath("/moje-aktivnosti");
  return { ok: true, message: "Odjava je uspela." };
}

export async function toggleSave(formData: FormData): Promise<void> {
  const profile = await requireUser();
  const eventId = String(formData.get("event_id"));
  const slug = String(formData.get("slug"));
  const supabase = await createClient();
  if (formData.get("saved") === "1") {
    await supabase.from("saved_events").delete().eq("profile_id", profile.id).eq("event_id", eventId);
  } else {
    await supabase.from("saved_events").insert({ profile_id: profile.id, event_id: eventId });
  }
  revalidatePath(`/dogodki/${slug}`);
  revalidatePath("/moj-mekko/shranjeno");
}

export async function markNotificationsRead(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read");
  revalidatePath("/obvestila");
}
