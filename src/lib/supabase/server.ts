import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/env";

/**
 * Per-request Supabase client acting as the signed-in user (RLS applies).
 * Reads cookies, so callers must render inside a <Suspense> boundary or run in a Server Action.
 */
export async function createClient() {
  // User-specific data is always request-time: never let it run during (runtime) prerendering/prefetch,
  // where the auth client's token-expiry checks (Date.now) are not allowed.
  await connection();
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = publicEnv();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes sessions.
        }
      },
    },
  });
}
