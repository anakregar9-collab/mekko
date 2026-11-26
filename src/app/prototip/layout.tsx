import type { Metadata } from "next";
import { DemoBanner } from "@/components/demo-banner";

export const metadata: Metadata = {
  title: "Prototip",
  robots: { index: false, follow: false },
};

export default function PrototypeLayout({ children }: LayoutProps<"/prototip">) {
  return (
    <>
      <DemoBanner />
      {children}
    </>
  );
}
