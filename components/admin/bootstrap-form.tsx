"use client";

import { useFormState, useFormStatus } from "react-dom";
import { bootstrapSuperAdmin } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function BootstrapSubmitButton() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Creating Super Admin...">Create Super Admin</SubmitButton>;
}

export function BootstrapForm() {
  const [state, action] = useFormState(bootstrapSuperAdmin, initialState);

  return (
    <form action={action} className="grid gap-5 bg-white p-6 shadow-soft">
      <label className="grid gap-2 text-sm font-semibold text-forest">
        Temporary password
        <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 hover:border-forest/30" name="password" required type="password" />
      </label>
      {state.message ? (
        <p className={state.ok ? "font-semibold text-forest" : "font-semibold text-red-700"}>{state.message}</p>
      ) : null}
      <BootstrapSubmitButton />
    </form>
  );
}
