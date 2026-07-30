"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginMember } from "@/app/actions";
import { Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Field, SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function LoginSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Signing in...">{label}</SubmitButton>;
}

export function LoginForm({ locale, returnTo }: { locale: Locale; returnTo?: string }) {
  const t = getDictionary(locale);
  const [state, action] = useFormState(loginMember, initialState);

  return (
    <form action={action} className="grid gap-5 bg-white p-6 shadow-soft">
      <input name="locale" type="hidden" value={locale} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <Field label={t.register.email} name="email" type="email" required />
      <Field label={t.register.password} name="password" type="password" required />
      {state.message ? <p className="font-semibold text-red-700">{state.message}</p> : null}
      <LoginSubmitButton label={t.login.submit} />
    </form>
  );
}
