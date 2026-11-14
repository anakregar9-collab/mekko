"use client";

import { useActionState } from "react";
import { FormMessage, inputCls, SubmitButton, type FormState } from "@/components/forms";
import { resolveReport } from "@/lib/actions/messages";

export function ResolveReportForm({ reportId, messageId }: { reportId: string; messageId?: number }) {
  const [state, action] = useActionState<FormState, FormData>(resolveReport, {});
  if (state.ok) return <FormMessage state={state} />;
  const id = `note-${reportId}`;
  return (
    <form action={action} className="w-full space-y-2 lg:w-96">
      <input type="hidden" name="report_id" value={reportId} />
      {messageId !== undefined && <input type="hidden" name="message_id" value={messageId} />}
      <label htmlFor={id} className="sr-only">
        Opomba moderatorja
      </label>
      <input id={id} name="reason" placeholder="Opomba (obvezno)" className={inputCls} />
      {state.errors?.reason && <p className="text-sm text-brand-strong">{state.errors.reason}</p>}
      {messageId !== undefined && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_message" value="1" className="size-5" /> Odstrani sporočilo
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="status" value="actioned" size="sm" pendingText="…">
          Ukrepano
        </SubmitButton>
        <SubmitButton name="status" value="dismissed" variant="ghost" size="sm" pendingText="…">
          Zavrni prijavo
        </SubmitButton>
      </div>
      <FormMessage state={state.message ? state : undefined} />
    </form>
  );
}
