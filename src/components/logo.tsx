import Link from "next/link";

/** Placeholder wordmark — branding not yet approved (PRODUCT_SPEC §9.8). */
export function Logo({ href = "/prototip/odkrivanje" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="font-display inline-flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-ink"
    >
      <span aria-hidden="true" className="inline-block size-3.5 rounded-full bg-brand" />
      <span
        aria-hidden="true"
        className="-ml-2.5 inline-block size-3.5 rounded-full bg-sun mix-blend-multiply"
      />
      mekko
    </Link>
  );
}
