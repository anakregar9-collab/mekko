"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted aria-invalid:border-brand";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echo of submitted values so fields keep their input after a failed submit. */
  values?: Record<string, string>;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-brand-strong">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props wiring an input to its hint/error. */
export function describedBy(id: string, error?: string, hint?: boolean) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function SubmitButton({
  children,
  pendingText = "Shranjujem …",
  variant = "primary",
  size = "md",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={buttonClasses(variant, size, className)}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (!state?.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-2xl p-3 text-sm",
        state.ok ? "bg-sage-soft text-sage-ink" : "bg-brand-soft text-brand-strong",
      )}
    >
      {state.message}
    </div>
  );
}
