import Link from "next/link";

/**
 * Mekko mark: a hand-drawn "m" whose tail curls like a loose thread,
 * with a sun-yellow sparkle. First pass — branding not yet final.
 */
export function LogoMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 36" className={className} aria-hidden="true" focusable="false">
      <path
        d="M5 31 V16 C5 4 22 4 22 16 V31 M22 16 C22 4 39 4 39 16 V24 C39 31 45 32 47 27"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 1 Q46.8 4.7 50.5 5.5 Q46.8 6.3 46 10 Q45.2 6.3 41.5 5.5 Q45.2 4.7 46 1 Z"
        fill="var(--color-sun)"
      />
    </svg>
  );
}

export function Logo({ href = "/prototip/odkrivanje" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Mekko"
      className="font-display inline-flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-ink"
    >
      <LogoMark />
      <span aria-hidden="true">mekko</span>
    </Link>
  );
}
