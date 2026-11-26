import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "brand" | "sun" | "sage" | "lilac" | "sky" | "clay" | "neutral";

const tones: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-strong",
  sun: "bg-sun-soft text-sun-ink",
  sage: "bg-sage-soft text-sage-ink",
  lilac: "bg-lilac-soft text-lilac-ink",
  sky: "bg-sky-soft text-sky-ink",
  clay: "bg-clay-soft text-clay-ink",
  neutral: "bg-surface text-ink-muted ring-1 ring-line",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
