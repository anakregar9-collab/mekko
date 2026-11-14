import { getAuthUserId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** Live unread-notification count for the header bell (rendered inside <Suspense>). */
export async function UnreadNotificationsBadge() {
  const id = await getAuthUserId();
  if (!id) return null;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", id)
    .is("read_at", null);
  if (!count) return null;
  return (
    <span
      data-testid="unread-count"
      className="absolute top-1.5 right-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] leading-5 font-bold text-white"
    >
      <span className="sr-only">neprebrano: </span>
      {count}
    </span>
  );
}
