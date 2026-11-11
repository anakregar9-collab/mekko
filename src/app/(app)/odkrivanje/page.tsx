import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Odkrivanje" };

/** Public. Real events arrive in M2; until then this is an honest empty state. */
export default function OdkrivanjePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Odkrivanje</h1>
      <EmptyState title="Prvi dogodki prihajajo kmalu">
        <p>Organizatorji že ustvarjajo svoje prostore. Objava dogodkov bo na voljo v naslednji fazi.</p>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/ustvari" className="font-semibold text-brand-strong underline">
            Ustvari svoj prostor
          </Link>
          <Link href="/prototip/odkrivanje" className="font-semibold text-brand-strong underline">
            Poglej prototip odkrivanja
          </Link>
        </p>
      </EmptyState>
    </div>
  );
}
