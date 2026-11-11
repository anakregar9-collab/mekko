"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { codeSchema, emailSchema, safeNext } from "@/lib/validation";
import type { FormState } from "@/components/forms";

export interface LoginState extends FormState {
  step?: "email" | "code";
  email?: string;
}

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      step: "email",
      errors: { email: parsed.error.issues[0].message },
      values: { email: String(formData.get("email") ?? "") },
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    const rateLimited = error.status === 429;
    return {
      step: "email",
      values: { email: parsed.data.email },
      message: rateLimited
        ? "Preveč poskusov. Počakaj minuto in poskusi znova."
        : "Kode ni bilo mogoče poslati. Poskusi znova.",
    };
  }
  return { step: "code", email: parsed.data.email };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = codeSchema.safeParse({ email: formData.get("email"), code: formData.get("code") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    return {
      step: "code",
      email,
      errors: { code: parsed.error.issues.find((i) => i.path[0] === "code")?.message ?? "Neveljavna koda." },
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error || !data.user) {
    return { step: "code", email, errors: { code: "Koda ni pravilna ali je potekla." } };
  }
  const next = safeNext(String(formData.get("naprej") ?? ""));
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.onboarded_at) redirect(`/onboarding?naprej=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava?odjava=1");
}
