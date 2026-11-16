import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { legalFormLabel, type LegalForm } from "@/lib/spaces";

/**
 * "Ponudnik" box on event and space pages (marketplace information duty, ZVPot-1 / Omnibus).
 * Legal form is public; name, address, number and e-mail only for signed-in users.
 * Consumer-notice wording is pending legal review (DECISIONS 2026-11-16).
 */
export async function ProviderInfo({
  spaceId,
  legalForm,
  signedIn,
}: {
  spaceId: string;
  legalForm: string | null;
  signedIn: boolean;
}) {
  const form = legalForm as LegalForm | null;
  if (!form) {
    return (
      <section
        className="rounded-2xl bg-surface p-4 text-sm text-ink-muted ring-1 ring-line"
        data-testid="provider-info"
      >
        Organizator še ni navedel pravnega statusa.
      </section>
    );
  }
  const details =
    signedIn && form !== "private"
      ? (
          await (
            await createClient()
          )
            .from("space_legal_info")
            .select("legal_name, address, registration_number, contact_email")
            .eq("space_id", spaceId)
            .maybeSingle()
        ).data
      : null;

  return (
    <section
      className="space-y-1 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line"
      data-testid="provider-info"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <Building2 aria-hidden="true" className="size-4 text-ink-muted" /> Ponudnik: {legalFormLabel[form]}
      </h2>
      {form === "private" ? (
        <p className="text-ink-muted">
          Organizator nastopa kot zasebnik in ne kot podjetje, zato pravice potrošnikov po zakonu o varstvu
          potrošnikov za ta dogovor ne veljajo. Mekko ni stranka dogovora med tabo in organizatorjem.
        </p>
      ) : details ? (
        <>
          <p>{details.legal_name}</p>
          <p className="text-ink-muted">{details.address}</p>
          {details.registration_number && (
            <p className="text-ink-muted">Št.: {details.registration_number}</p>
          )}
          <p>
            <a
              href={`mailto:${details.contact_email}`}
              className="font-semibold text-brand-strong underline break-all"
            >
              {details.contact_email}
            </a>
          </p>
          <p className="pt-1 text-xs text-ink-muted">
            Pogodbo skleneš z organizatorjem, ki odgovarja za izvedbo, račun in vračila. Mekko ni stranka te
            pogodbe.
          </p>
        </>
      ) : (
        <p className="text-ink-muted">Podatke o ponudniku vidijo prijavljeni uporabniki.</p>
      )}
    </section>
  );
}
