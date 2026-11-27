"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { deleteMyAccount, requestData } from "@/lib/actions/profile";
import { buttonClasses } from "@/components/ui/button";

export function DataRequestForms({
  exportOpen,
  ownedSpaces,
}: {
  exportOpen: boolean;
  ownedSpaces: string[];
}) {
  const [exportState, exportAction] = useActionState<FormState, FormData>(requestData, {});
  const [deleteState, deleteAction] = useActionState<FormState, FormData>(deleteMyAccount, {});

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        action={exportAction}
        className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      >
        <h2 className="font-display text-lg font-bold">Izvoz podatkov</h2>
        <p className="text-sm text-ink-muted">
          Takoj prenesi datoteko z vsemi svojimi podatki: profil, soglasja, prijave, karte, tečaji, ideje,
          objave, komentarji, poslana sporočila, sledenja in obvestila.
        </p>
        <a
          href="/moj-mekko/podatki/izvoz.json"
          download
          className={buttonClasses("primary", "md")}
          data-testid="export-download"
        >
          Prenesi moje podatke
        </a>
        <FormMessage state={exportState} />
        <input type="hidden" name="kind" value="export" />
        {exportOpen ? (
          <p className="text-sm font-semibold">Zahteva za izvoz je že oddana.</p>
        ) : (
          <p className="text-sm text-ink-muted">
            Potrebuješ pomoč ali drugačno obliko?{" "}
            <SubmitButton variant="ghost" size="sm" pendingText="Oddajam …">
              Oddaj zahtevo ekipi
            </SubmitButton>
          </p>
        )}
      </form>

      <form
        action={deleteAction}
        className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
        data-testid="delete-account-form"
      >
        <h2 className="font-display text-lg font-bold">Izbris računa</h2>
        {ownedSpaces.length > 0 ? (
          <p className="text-sm">
            Imaš v lasti prostore: <strong>{ownedSpaces.join(", ")}</strong>. Pred izbrisom računa jih predaj
            drugemu članu ekipe ali zapri (Organizator → Ekipa).
          </p>
        ) : (
          <>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              <li>Račun se takoj skrije, prihodnje prijave na dogodke se odjavijo.</li>
              <li>30 dni se lahko še prijaviš in izbris prekličeš.</li>
              <li>
                Po 30 dneh izbrišemo profil, ideje, objave, komentarje in sporočila. Prijave in plačila
                ostanejo organizatorjem kot »Izbrisan uporabnik« (brez imena).
              </li>
            </ul>
            <FormMessage state={deleteState} />
            <Field
              label="Za potrditev vpiši IZBRIŠI"
              htmlFor="confirm_text"
              error={deleteState.errors?.confirm_text}
            >
              <input id="confirm_text" name="confirm_text" autoComplete="off" className={inputCls} />
            </Field>
            <SubmitButton variant="secondary" pendingText="Brišem …">
              Izbriši moj račun
            </SubmitButton>
          </>
        )}
      </form>
    </div>
  );
}
