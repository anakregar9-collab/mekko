import { createClient } from "@/lib/supabase/server";

/** Self-service GDPR export: the signed-in person's own data as JSON (audited and rate limited in the database). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Prijava je obvezna.", { status: 401 });
  const { data, error } = await supabase.rpc("export_my_data_logged");
  if (error) {
    const limited = error.message === "rate_limited";
    return new Response(limited ? "Preveč izvozov v kratkem času. Poskusi čez eno uro." : "Izvoz ni uspel.", {
      status: limited ? 429 : 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mekko-moji-podatki-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
