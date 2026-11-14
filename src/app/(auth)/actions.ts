"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, safeNext } from "@/lib/validation";
import type { FormState } from "@/components/forms";

export interface AuthState extends FormState {
  mode?: "login" | "register";
}

function read(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

/** After a successful sign-in/up: new accounts go to onboarding, others to where they were going. */
async function continueAfterAuth(userId: string, formData: FormData): Promise<never> {
  const next = safeNext(String(formData.get("naprej") ?? ""));
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.onboarded_at) redirect(`/onboarding?naprej=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = read(formData);
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    const e = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { mode: "login", errors: e, values: { email: raw.email } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return {
      mode: "login",
      values: { email: raw.email },
      message:
        error?.status === 429
          ? "Preveč poskusov. Počakaj minuto in poskusi znova."
          : "E-pošta ali geslo ni pravilno.",
    };
  }
  return continueAfterAuth(data.user.id, formData);
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = read(formData);
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) {
    const e = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { mode: "register", errors: e, values: { email: raw.email } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return {
      mode: "register",
      values: { email: raw.email },
      message: exists
        ? "Račun s tem e-poštnim naslovom že obstaja. Prijavi se."
        : error.status === 429
          ? "Preveč poskusov. Počakaj minuto in poskusi znova."
          : "Registracija ni uspela. Poskusi znova.",
    };
  }
  if (!data.session || !data.user) {
    // Only happens if e-mail confirmation is switched on in Supabase.
    return {
      mode: "register",
      ok: true,
      message: "Račun je ustvarjen. Potrdi ga s povezavo, ki smo ti jo poslali po e-pošti.",
    };
  }
  return continueAfterAuth(data.user.id, formData);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prijava?odjava=1");
}
