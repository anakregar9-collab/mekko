import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prijava" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Prijava v Mekko</h1>
        <p className="mt-1 text-ink-muted">Prijavi se z e-pošto in geslom ali ustvari nov račun.</p>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <LoginForm />
      </Suspense>
      <p className="text-xs text-ink-muted">
        Prijava z Google računom bo na voljo kmalu. Tvojega e-poštnega naslova nikoli ne prikažemo drugim.
      </p>
    </div>
  );
}
