"use client";

import { useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * A button for an action that is NOT implemented in the prototype.
 * Clicking it honestly explains what will happen and when, instead of a dead button.
 */
export function PrototypeAction({
  children,
  explanation,
  variant = "primary",
  size = "md",
  className,
  asLink = false,
}: {
  children: ReactNode;
  explanation: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render as an inline text button. */
  asLink?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span className={cn("inline-flex flex-col gap-1", !asLink && "w-full sm:w-auto", className)}>
      <button
        type="button"
        onClick={() => setShown(true)}
        className={
          asLink
            ? "font-semibold text-brand-strong underline underline-offset-2"
            : buttonClasses(variant, size, "w-full sm:w-auto")
        }
      >
        {children}
      </button>
      <span role="status" className={cn("text-xs text-ink-muted", !shown && "sr-only")}>
        {shown ? `Prototip: ${explanation}` : ""}
      </span>
    </span>
  );
}
