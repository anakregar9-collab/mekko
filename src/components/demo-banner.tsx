import Link from "next/link";

/** Compact, always-visible marker that the screen uses demo data and is not wired to any backend. */
export function DemoBanner() {
  return (
    <div
      role="note"
      aria-label="Prototip z demo podatki"
      data-testid="demo-banner"
      className="relative z-40 bg-ink px-4 py-1.5 text-center text-xs leading-4 font-medium text-cream"
    >
      PROTOTIP · demo podatki, nič se ne shrani ·{" "}
      <Link href="/prototip" className="underline underline-offset-2">
        pregled prototipa
      </Link>
    </div>
  );
}
