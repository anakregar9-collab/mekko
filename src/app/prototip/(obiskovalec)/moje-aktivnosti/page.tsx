import type { Metadata } from "next";
import { MyActivities } from "@/components/visitor/my-activities";
import { expandBookings } from "@/lib/calendar";
import { DEMO_TODAY, getEventById, myBookings } from "@/lib/demo/data";

export const metadata: Metadata = { title: "Moje aktivnosti" };

export default function MojeAktivnostiPage() {
  return <MyActivities items={expandBookings(myBookings, getEventById)} today={DEMO_TODAY} />;
}
