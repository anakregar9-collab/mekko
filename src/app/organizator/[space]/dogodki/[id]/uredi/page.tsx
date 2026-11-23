import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSpaceRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { listInterestsForFilter } from "@/lib/data/events";
import { coverUrl } from "@/lib/media";
import { BackLink } from "@/components/back-link";
import { PageSkeleton } from "@/components/page-skeleton";
import { EventEditForm } from "./event-edit-form";

export const metadata: Metadata = { title: "Uredi dogodek" };

export default function Page({ params }: PageProps<"/organizator/[space]/dogodki/[id]/uredi">) {
  return (
    <div className="max-w-2xl space-y-4">
      <Suspense fallback={<PageSkeleton title="Uredi dogodek" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/organizator/[space]/dogodki/[id]/uredi">["params"];
}) {
  const { space: slug, id } = await params;
  const { space } = await requireSpaceRole(slug, "admin");
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select(
      "id, space_id, status, title, summary, description, interest_id, is_online, registration_mode, city, address, external_url, capacity, max_per_booking, materials, cover, cover_image_path, beginner_friendly, family_friendly, visibility, booking_scope, payment_mode, payment_link, accepts_passes",
    )
    .eq("id", id)
    .maybeSingle();
  if (!ev || ev.space_id !== space.id || ev.status === "cancelled") notFound();
  // online_url is never directly selectable; the team reads it through event_online_url().
  const [interests, { data: bookings }, { data: onlineUrl }] = await Promise.all([
    listInterestsForFilter(),
    supabase.from("bookings").select("quantity, occurrence_id").eq("event_id", id).eq("status", "confirmed"),
    ev.is_online ? supabase.rpc("event_online_url", { p_event: id }) : Promise.resolve({ data: null }),
  ]);
  const perSession = new Map<string, number>();
  for (const b of bookings ?? []) {
    const k = b.occurrence_id ?? "series";
    perSession.set(k, (perSession.get(k) ?? 0) + b.quantity);
  }
  const booked = Math.max(0, ...perSession.values());

  return (
    <>
      <BackLink href={`/organizator/${slug}/dogodki/${id}`}>Nazaj na dogodek</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Uredi dogodek</h1>
      <EventEditForm
        spaceSlug={slug}
        eventId={id}
        interests={interests}
        membersAllowed={space.membership_mode !== "none" || ev.visibility === "members"}
        passesAllowed={ev.booking_scope === "occurrence" && ev.registration_mode === "native"}
        paid={ev.payment_mode === "manual"}
        initial={{
          isOnline: ev.is_online,
          external: ev.registration_mode === "external",
          photoUrl: coverUrl(ev.cover_image_path),
          booked,
          values: {
            title: ev.title,
            summary: ev.summary ?? "",
            description: ev.description ?? "",
            interest_id: ev.interest_id ? String(ev.interest_id) : "",
            city: ev.city ?? "",
            address: ev.address ?? "",
            online_url: onlineUrl ?? "",
            external_url: ev.external_url ?? "",
            capacity: ev.capacity ? String(ev.capacity) : "",
            max_per_booking: String(ev.max_per_booking),
            materials: ev.materials ?? "",
            cover: ev.cover,
            beginner_friendly: String(ev.beginner_friendly),
            family_friendly: String(ev.family_friendly),
            members_only: String(ev.visibility === "members"),
            accepts_passes: String(ev.accepts_passes),
            payment_link: ev.payment_link ?? "",
          },
        }}
      />
    </>
  );
}
