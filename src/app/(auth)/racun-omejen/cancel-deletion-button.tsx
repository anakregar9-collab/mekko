"use client";

import { useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cancelMyAccountDeletion } from "@/lib/actions/profile";

export function CancelDeletionButton() {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={buttonClasses("primary", "md")}
        onClick={() =>
          start(async () => {
            const res = await cancelMyAccountDeletion();
            // Intentional full reload: the client router remembers that /moj-mekko redirected here.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            if (res.ok) window.location.assign("/moj-mekko?obnovljen=1");
            else setFailed(true);
          })
        }
      >
        {pending ? "Obnavljam …" : "Prekliči izbris in obnovi račun"}
      </button>
      {failed && (
        <p role="alert" className="text-sm text-brand-strong">
          Obnova ni uspela. Če je od izbrisa minilo več kot 30 dni, računa ni več mogoče obnoviti.
        </p>
      )}
    </div>
  );
}
