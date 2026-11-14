import { z } from "zod";
import { HANDLE_RE, SLUG_RE } from "@/lib/slug";

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Vpiši veljaven e-poštni naslov.").max(254),
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Vpiši veljaven e-poštni naslov.").max(254),
  password: z.string().min(8, "Geslo naj ima vsaj 8 znakov.").max(72, "Geslo je predolgo."),
});

export const visibilitySchema = z.enum(["public", "members", "private"]);

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Vpiši ime.").max(60, "Največ 60 znakov."),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, "3–30 znakov: male črke, številke, pika ali podčrtaj."),
  bio: z.string().trim().max(500, "Največ 500 znakov.").optional().default(""),
  approx_city: z.string().trim().max(80).optional().default(""),
  visibility: visibilitySchema,
});

export const onboardingSchema = profileSchema.extend({
  interests: z.array(z.coerce.number().int().positive()).max(20, "Izberi največ 20 zanimanj."),
  location_consent: z.boolean(),
});

export const spaceKindSchema = z.enum(["solo_creator", "community", "studio", "association"]);

/** Slugs that would collide with app routes under /organizator or /prostori. */
export const RESERVED_SLUGS = new Set([
  "nov-prostor",
  "novo",
  "admin",
  "nastavitve",
  "ekipa",
  "mekko",
  "podpora",
  "prijava",
]);

export const createSpaceSchema = z.object({
  kind: spaceKindSchema,
  name: z.string().trim().min(2, "Vsaj 2 znaka.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Samo male črke, številke in vezaji (2–50).")
    .refine((s) => !RESERVED_SLUGS.has(s), "Ta naslov je rezerviran."),
  city: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().max(140, "Največ 140 znakov.").optional().default(""),
});

export const updateSpaceSchema = z.object({
  name: z.string().trim().min(2, "Vsaj 2 znaka.").max(80),
  city: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().max(140, "Največ 140 znakov.").optional().default(""),
  bio: z.string().trim().max(2000, "Največ 2000 znakov.").optional().default(""),
});

export const inviteSchema = z.object({
  handle: z.string().trim().toLowerCase().regex(HANDLE_RE, "Neveljavno uporabniško ime."),
  role: z.enum(["admin", "staff"]),
});

export const reasonSchema = z.string().trim().min(3, "Vpiši razlog (vsaj 3 znaki).").max(500);

/** First error message per field, for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Only allow same-site relative redirects (prevents open redirects via ?naprej=). */
export function safeNext(next: string | null | undefined, fallback = "/moj-mekko"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
