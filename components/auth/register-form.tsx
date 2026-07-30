"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerMember } from "@/app/actions";
import { Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Field, SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function RegisterSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Creating account...">{label}</SubmitButton>;
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [state, action] = useFormState(registerMember, initialState);

  return (
    <form action={action} className="grid gap-5 bg-white p-6 shadow-soft">
      <Field label={t.register.fullName} name="fullName" required />
      <Field label={t.register.mobile} name="mobile" required />
      <Field label={t.register.email} name="email" type="email" required />
      <Field label={t.register.password} name="password" type="password" required />
      <Field label={t.register.dob} name="dateOfBirth" type="date" />
      <Field label={t.register.referral} name="referralCode" />
      <label className="flex gap-3 text-sm font-semibold leading-6 text-forest">
        <input className="focus-ring mt-1 h-4 w-4 accent-forest" name="termsConsent" required type="checkbox" />
        {t.register.terms}
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-forest">
        <input className="focus-ring mt-1 h-4 w-4 accent-forest" name="privacyConsent" required type="checkbox" />
        {t.register.privacy}
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-forest">
        <input className="focus-ring mt-1 h-4 w-4 accent-forest" name="marketingConsent" type="checkbox" />
        {t.register.marketing}
      </label>
      {state.message ? (
        <p className={state.ok ? "font-semibold text-forest" : "font-semibold text-red-700"}>{state.message}</p>
      ) : null}
      <RegisterSubmitButton label={t.register.submit} />
    </form>
  );
}
