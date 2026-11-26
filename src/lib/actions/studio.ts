"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSpaceRole } from "@/lib/auth/dal";

const uuid = z.uuid();

/** Mark one booking present / absent (or clear) for one session. Authorized again in set_attendance(). */
export async function setAttendance(spaceSlug: string, eventId: string, fd: FormData): Promise<void> {
  await requireSpaceRole(spaceSlug, "staff");
  const booking = String(fd.get("booking_id"));
  const occurrence = String(fd.get("occurrence_id"));
  if (!uuid.safeParse(booking).success || !uuid.safeParse(occurrence).success) return;
  const mark = String(fd.get("mark"));
  const present = mark === "present" ? true : mark === "absent" ? false : null;
  const supabase = await createClient();
  await supabase.rpc("set_attendance", {
    p_booking: booking,
    p_occurrence: occurrence,
    p_present: present as boolean,
  });
  revalidatePath(`/organizator/${spaceSlug}/dogodki/${eventId}/prisotnost/${occurrence}`);
}
