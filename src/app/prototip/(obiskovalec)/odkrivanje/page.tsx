import type { Metadata } from "next";
import { DiscoveryFeed } from "@/components/visitor/discovery-feed";
import { categories, events, ideas, spaces } from "@/lib/demo/data";

export const metadata: Metadata = { title: "Odkrivanje" };

export default function OdkrivanjePage() {
  return <DiscoveryFeed events={events} ideas={ideas} spaces={spaces} categories={categories} />;
}
