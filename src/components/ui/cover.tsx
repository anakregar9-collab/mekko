import type { CoverTone } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/**
 * Decorative placeholder cover used instead of photos in the prototype.
 * Pure CSS shapes, aria-hidden — real covers will be uploaded images with alt text.
 */
const palettes: Record<CoverTone, { bg: string; a: string; b: string }> = {
  coral: { bg: "#fde6dc", a: "#f08a6e", b: "#f6b53b" },
  sun: { bg: "#fef0cf", a: "#f6b53b", b: "#f08a6e" },
  sage: { bg: "#ddefe3", a: "#7fb894", b: "#f6b53b" },
  lilac: { bg: "#ece5fa", a: "#a98bd6", b: "#f08a6e" },
  sky: { bg: "#dcebf8", a: "#7fb0e0", b: "#a98bd6" },
  clay: { bg: "#f6e2d3", a: "#d49a73", b: "#7fb894" },
};

export function Cover({ tone, className }: { tone: CoverTone; className?: string }) {
  const p = palettes[tone];
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{ background: p.bg }}
    >
      <div className="absolute -top-6 -left-4 size-28 rounded-full opacity-90" style={{ background: p.a }} />
      <div
        className="absolute right-6 bottom-[-2.5rem] size-36 rounded-[2.5rem] rotate-12 opacity-80"
        style={{ background: p.b }}
      />
      <div
        className="absolute top-1/3 right-1/3 size-10 rounded-full border-4 opacity-70"
        style={{ borderColor: p.a }}
      />
    </div>
  );
}
