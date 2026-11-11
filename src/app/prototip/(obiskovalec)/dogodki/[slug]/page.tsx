import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/visitor/event-detail";
import { events, getCategoryLabel, getEventBySlug, getPolicy, getSpace, seatsTaken } from "@/lib/demo/data";

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/prototip/dogodki/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getEventBySlug(slug)?.title ?? "Dogodek" };
}

export default async function EventPage({ params }: PageProps<"/prototip/dogodki/[slug]">) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  const space = getSpace(event.spaceId);
  if (!space) notFound();

  return (
    <EventDetail
      event={event}
      space={space}
      policy={getPolicy(event.cancellationPolicyCode)}
      categoryLabel={getCategoryLabel(event.categorySlug)}
      seatsTaken={seatsTaken(event)}
    />
  );
}
