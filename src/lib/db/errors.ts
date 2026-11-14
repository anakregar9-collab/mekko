/** Map database/RPC error codes and messages to user-facing Slovene text. Never leak raw DB errors. */
const messages: Record<string, string> = {
  not_allowed: "Za to nimaš dovoljenja.",
  space_limit_reached: "Doseženo je največje število prostorov (20).",
  invalid_role: "Neveljavna vloga.",
  user_not_found: "Uporabnika s tem uporabniškim imenom ni.",
  cannot_invite_self: "Sebe ne moreš povabiti.",
  already_member: "Ta oseba je že v ekipi ali ima odprto povabilo.",
  invite_not_found: "Povabila ni več.",
  member_not_found: "Član ni bil najden.",
  cannot_remove_owner: "Lastnika ni mogoče odstraniti.",
  cannot_change_self: "Svojega računa ne moreš spremeniti na ta način.",
  reason_required: "Vpiši razlog.",
  request_not_found: "Zahteva ni bila najdena.",
  too_many_interests: "Izberi največ 20 zanimanj.",
  needs_occurrence: "Dogodek potrebuje vsaj en termin.",
  not_draft: "Dogodek je že objavljen.",
  already_cancelled: "Dogodek je že odpovedan.",
  invalid_message: "Sporočilo naj ima od 3 do 1000 znakov.",
};

export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

export function friendlyDbError(
  err: DbErrorLike | null | undefined,
  fallback = "Nekaj je šlo narobe. Poskusi znova.",
): string {
  if (!err) return fallback;
  if (err.message && messages[err.message]) return messages[err.message];
  if (err.code === "23505") {
    if (err.message?.includes("handle")) return "To uporabniško ime je že zasedeno.";
    if (err.message?.includes("slug")) return "Ta spletni naslov prostora je že zaseden.";
    if (err.message?.includes("data_requests")) return "Zahteva te vrste je že odprta.";
    return "Ta vrednost je že zasedena.";
  }
  if (err.code === "23514") return "Vnos ni v pravilni obliki.";
  if (err.code === "42501") return messages.not_allowed;
  return fallback;
}
