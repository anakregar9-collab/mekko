import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listInterests() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interests")
    .select("id, label_sl")
    .eq("is_active", true)
    .order("sort");
  return data ?? [];
}

export async function myInterestIds(profileId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profile_interests").select("interest_id").eq("profile_id", profileId);
  return (data ?? []).map((r) => r.interest_id);
}

/** Latest consent state per kind (append-only log). */
export async function myConsents(
  profileId: string,
): Promise<{ approx_location: boolean; marketing_email: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_consents")
    .select("kind, granted, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  const latest = (kind: string) => data?.find((r) => r.kind === kind)?.granted ?? false;
  return { approx_location: latest("approx_location"), marketing_email: latest("marketing_email") };
}
