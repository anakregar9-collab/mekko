import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface PersonRef {
  id: string;
  handle: string;
  display_name: string;
}

export interface ConversationSummary {
  id: string;
  other: PersonRef;
  lastMessageAt: string;
  lastFromMe: boolean;
  unread: boolean;
  preview: string;
}

const UNKNOWN = (id: string): PersonRef => ({ id, handle: "", display_name: "Uporabnik Mekko" });

async function people(ids: string[]): Promise<Map<string, PersonRef>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, handle, display_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function listConversations(me: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, last_message_at, last_sender_id, a_read_at, b_read_at")
    .order("last_message_at", { ascending: false })
    .limit(100);
  const list = convs ?? [];
  if (list.length === 0) return [];
  const otherIds = list.map((c) => (c.user_a === me ? c.user_b : c.user_a));
  const [byId, { data: msgs }] = await Promise.all([
    people(otherIds),
    supabase
      .from("messages")
      .select("conversation_id, body, removed_at, created_at")
      .in(
        "conversation_id",
        list.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const lastBody = new Map<string, string>();
  for (const m of msgs ?? []) {
    if (!lastBody.has(m.conversation_id))
      lastBody.set(m.conversation_id, m.removed_at ? "Sporočilo je odstranjeno" : m.body);
  }
  return list.map((c, i) => {
    const readAt = c.user_a === me ? c.a_read_at : c.b_read_at;
    const lastFromMe = c.last_sender_id === me;
    return {
      id: c.id,
      other: byId.get(otherIds[i]) ?? UNKNOWN(otherIds[i]),
      lastMessageAt: c.last_message_at,
      lastFromMe,
      unread: !lastFromMe && !!c.last_sender_id && (!readAt || readAt < c.last_message_at),
      preview: lastBody.get(c.id) ?? "",
    };
  });
}

export interface ThreadMessage {
  id: number;
  mine: boolean;
  body: string;
  removed: boolean;
  createdAt: string;
}

export async function getConversation(id: string, me: string) {
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (!conv) return null;
  const otherId = conv.user_a === me ? conv.user_b : conv.user_a;
  const [byId, { data: msgs }, { data: blocked }, { data: canWrite }] = await Promise.all([
    people([otherId]),
    supabase
      .from("messages")
      .select("id, sender_id, body, removed_at, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me).eq("blocked_id", otherId),
    supabase.rpc("can_message", { p_to: otherId }),
  ]);
  const messages: ThreadMessage[] = (msgs ?? []).map((m) => ({
    id: m.id,
    mine: m.sender_id === me,
    body: m.body,
    removed: !!m.removed_at,
    createdAt: m.created_at,
  }));
  return {
    id: conv.id,
    other: byId.get(otherId) ?? UNKNOWN(otherId),
    messages,
    iBlocked: (blocked ?? []).length > 0,
    canWrite: !!canWrite,
  };
}
