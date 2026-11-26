"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { describedBy, Field, FormMessage, inputCls, SubmitButton } from "@/components/forms";
import { cn } from "@/lib/cn";
import { register, signIn, type AuthState } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("naprej") ?? "";
  const signedOut = params.get("odjava") === "1";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction] = useActionState<AuthState, FormData>(signIn, { mode: "login" });
  const [registerState, registerAction] = useActionState<AuthState, FormData>(register, { mode: "register" });
  const state = mode === "login" ? loginState : registerState;
  const e = state.errors ?? {};

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <div
        role="group"
        aria-label="Prijava ali registracija"
        className="grid grid-cols-2 rounded-full bg-cream p-1"
      >
        {(
          [
            ["login", "Prijava"],
            ["register", "Nov račun"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "min-h-10 rounded-full text-sm font-semibold",
              mode === m ? "bg-ink text-cream" : "text-ink-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {signedOut && mode === "login" && !state.message && (
        <p role="status" className="rounded-2xl bg-sage-soft p-3 text-sm text-sage-ink">
          Odjava je uspela.
        </p>
      )}
      <FormMessage state={state} />

      <form
        key={mode}
        action={mode === "login" ? loginAction : registerAction}
        noValidate
        className="space-y-4"
      >
        <input type="hidden" name="naprej" value={next} />
        <Field label="E-pošta" htmlFor="email" error={e.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            className={inputCls}
            {...describedBy("email", e.email)}
          />
        </Field>
        <Field
          label="Geslo"
          htmlFor="password"
          hint={mode === "register" ? "Vsaj 8 znakov." : undefined}
          error={e.password}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            className={inputCls}
            {...describedBy("password", e.password, mode === "register")}
          />
        </Field>
        <SubmitButton
          pendingText={mode === "login" ? "Prijavljam …" : "Ustvarjam račun …"}
          className="w-full"
        >
          {mode === "login" ? "Prijavi se" : "Ustvari račun"}
        </SubmitButton>
      </form>
    </div>
  );
}
