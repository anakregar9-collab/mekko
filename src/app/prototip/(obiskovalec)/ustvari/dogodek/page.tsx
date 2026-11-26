import type { Metadata } from "next";
import { CreateEventFlow } from "@/components/visitor/create-event-flow";
import { cancellationPolicies } from "@/lib/demo/data";

export const metadata: Metadata = { title: "Nov dogodek" };

export default function NovDogodekPage() {
  return <CreateEventFlow policies={cancellationPolicies} />;
}
