import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { StartConversationForm } from "@/components/messages/forms";

export const metadata: Metadata = { title: "Novo sporočilo" };

export default function Page({ searchParams }: PageProps<"/sporocila/nov">) {
  return (
    <div className="space-y-4">
      <BackLink href="/sporocila">Sporočila</BackLink>
      <Suspense fallback={<PageSkeleton title="Novo sporočilo" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ searchParams }: { searchParams: PageProps<"/sporocila/nov">["searchParams"] }) {
  const { komu } = await searchParams;
  const to = typeof komu === "string" ? komu : "";
  const me = await requireUser({ next: `/sporocila/nov?komu=${encodeURIComponent(to)}` });
  if (!UUID.test(to) || to === me.id) notFound();
  const supabase = await createClient();
  const [{ data: person }, { data: existing }, { data: allowed }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, handle").eq("id", to).maybeSingle(),
    supabase
      .from("conversations")
      .select("id")
      .or(`and(user_a.eq.${me.id},user_b.eq.${to}),and(user_a.eq.${to},user_b.eq.${me.id})`)
      .maybeSingle(),
    supabase.rpc("can_message", { p_to: to }),
  ]);
  if (existing) redirect(`/sporocila/${existing.id}`);
  if (!person) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight break-words">
        Sporočilo za {person.display_name}
      </h1>
      {allowed ? (
        <StartConversationForm target={{ kind: "person", profileId: person.id }} label="Sporočilo" />
      ) : (
        <p role="status" className="rounded-2xl bg-surface p-3 text-ink-muted ring-1 ring-line">
          Tej osebi trenutno ne moreš pisati.
        </p>
      )}
    </div>
  );
}
