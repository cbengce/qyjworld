"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPartnerPasswordRecovery } from "@/app/actions";
import type { Locale } from "@/lib/constants";
import { Field, SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function RecoverySubmit() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Sending recovery email...">Send Recovery Email</SubmitButton>;
}

export function PartnerPasswordRecoveryForm({ locale }: { locale: Locale }) {
  const [state, action] = useFormState(requestPartnerPasswordRecovery, initialState);
  return <form action={action} className="grid gap-5 bg-white p-6 shadow-soft">
    <input name="locale" type="hidden" value={locale} />
    <Field label="Partner account email" name="email" type="email" required />
    {state.message ? <p aria-live="polite" className={`font-semibold ${state.ok ? "text-forest" : "text-red-700"}`}>{state.message}</p> : null}
    <RecoverySubmit />
  </form>;
}
