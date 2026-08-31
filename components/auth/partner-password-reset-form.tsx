"use client";

import { useFormState, useFormStatus } from "react-dom";
import { resetPartnerPassword } from "@/app/actions";
import type { Locale } from "@/lib/constants";
import { Field, SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function ResetSubmit() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Updating password...">Set New Password</SubmitButton>;
}

export function PartnerPasswordResetForm({ locale }: { locale: Locale }) {
  const [state, action] = useFormState(resetPartnerPassword, initialState);
  return <form action={action} className="grid gap-5 bg-white p-6 shadow-soft">
    <input name="locale" type="hidden" value={locale} />
    <Field label="New password" name="password" type="password" required />
    <Field label="Confirm new password" name="confirmPassword" type="password" required />
    {state.message ? <p aria-live="polite" className="font-semibold text-red-700">{state.message}</p> : null}
    <ResetSubmit />
  </form>;
}
