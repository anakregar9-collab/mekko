"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { describedBy, Field, FormMessage, inputCls, SubmitButton } from "@/components/forms";
import { sendCode, verifyCode, type LoginState } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("naprej") ?? "";
  const signedOut = params.get("odjava") === "1";
  const [sendState, sendAction] = useActionState<LoginState, FormData>(sendCode, { step: "email" });
  const [verifyState, verifyAction] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  const codeStep = sendState.step === "code" && sendState !== dismissed;
  const email = sendState.email ?? "";

  if (!codeStep) {
    return (
      <form
        action={sendAction}
        noValidate
        className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        {signedOut && (
          <p role="status" className="rounded-2xl bg-sage-soft p-3 text-sm text-sage-ink">
            Odjava je uspela.
          </p>
        )}
        <FormMessage state={sendState} />
        <Field label="E-pošta" htmlFor="email" error={sendState.errors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={sendState.values?.email}
            className={inputCls}
            {...describedBy("email", sendState.errors?.email)}
          />
        </Field>
        <SubmitButton pendingText="Pošiljam …" className="w-full">
          Pošlji kodo
        </SubmitButton>
      </form>
    );
  }

  return (
    <form
      action={verifyAction}
      className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <p role="status" className="text-sm">
        Kodo smo poslali na <strong className="break-all">{email}</strong>.
      </p>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="naprej" value={next} />
      <Field label="Koda iz e-pošte" htmlFor="code" error={verifyState.errors?.code}>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
          {...describedBy("code", verifyState.errors?.code)}
        />
      </Field>
      <SubmitButton pendingText="Preverjam …" className="w-full">
        Prijava
      </SubmitButton>
      <button
        type="button"
        onClick={() => setDismissed(sendState)}
        className="min-h-11 w-full text-sm font-semibold text-brand-strong underline"
      >
        Uporabi drug e-poštni naslov
      </button>
    </form>
  );
}
