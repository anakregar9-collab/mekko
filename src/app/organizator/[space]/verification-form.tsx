"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/components/forms";
import { requestVerification } from "@/lib/actions/messages";

export function RequestVerificationForm({ spaceId, slug }: { spaceId: string; slug: string }) {
  const [state, action] = useActionState<FormState, FormData>(requestVerification.bind(null, slug), {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="space_id" value={spaceId} />
      <FormMessage state={state} />
      <SubmitButton size="sm" variant="secondary" pendingText="Pošiljam …">
        Zaprosi za preverjanje
      </SubmitButton>
    </form>
  );
}
