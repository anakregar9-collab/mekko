"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/components/forms";
import { requestData } from "@/lib/actions/profile";

export function DataRequestForms({
  exportOpen,
  deletionOpen,
}: {
  exportOpen: boolean;
  deletionOpen: boolean;
}) {
  const [exportState, exportAction] = useActionState<FormState, FormData>(requestData, {});
  const [deleteState, deleteAction] = useActionState<FormState, FormData>(requestData, {});

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        action={exportAction}
        className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      >
        <h2 className="font-display text-lg font-bold">Izvoz podatkov</h2>
        <p className="text-sm text-ink-muted">
          Prejmeš datoteko s profilom, zanimanji, soglasji in prostori.
        </p>
        <FormMessage state={exportState} />
        <input type="hidden" name="kind" value="export" />
        {exportOpen ? (
          <p className="text-sm font-semibold">Zahteva za izvoz je že oddana.</p>
        ) : (
          <SubmitButton variant="secondary" pendingText="Oddajam …">
            Zahtevaj izvoz
          </SubmitButton>
        )}
      </form>

      <form
        action={deleteAction}
        className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      >
        <h2 className="font-display text-lg font-bold">Izbris računa</h2>
        <p className="text-sm text-ink-muted">
          Izbrišemo profil in osebne podatke. Prostori, ki jih imaš v lasti, morajo pred tem dobiti novega
          lastnika ali biti zaprti.
        </p>
        <FormMessage state={deleteState} />
        <input type="hidden" name="kind" value="deletion" />
        {deletionOpen ? (
          <p className="text-sm font-semibold">Zahteva za izbris je že oddana.</p>
        ) : (
          <>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="confirm"
                className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
              />
              <span className="text-sm">Razumem, da izbrisa ni mogoče razveljaviti.</span>
            </label>
            <SubmitButton variant="secondary" pendingText="Oddajam …">
              Zahtevaj izbris
            </SubmitButton>
          </>
        )}
      </form>
    </div>
  );
}
