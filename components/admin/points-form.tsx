"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitPointsAdjustment } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

const initialState = { ok: false, message: "" };

function PointsSubmitButton() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending} pendingLabel="Recording transaction...">Record Points Transaction</SubmitButton>;
}

export function PointsForm({ pointsAccountId }: { pointsAccountId: string }) {
  const [state, action] = useFormState(submitPointsAdjustment, initialState);

  return (
    <form action={action} className="mt-4 grid gap-3 border border-forest/10 bg-paper p-4">
      <input name="pointsAccountId" type="hidden" value={pointsAccountId} />
      <select className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 hover:border-forest/30" name="transactionType" required>
        <option value="manual_adjustment">Manual adjustment</option>
        <option value="purchase_reward">Purchase reward</option>
        <option value="referral_reward">Referral reward</option>
        <option value="redemption">Redemption</option>
        <option value="membership_renewal">Membership renewal</option>
        <option value="promotional_reward">Promotional reward</option>
        <option value="reversal">Reversal</option>
      </select>
      <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="points" placeholder="Points, e.g. 20 or -20" required type="number" />
      <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="description" placeholder="Description" required />
      <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="referenceNumber" placeholder="Reference number, optional" />
      {state.message ? (
        <p className={state.ok ? "font-semibold text-forest" : "font-semibold text-red-700"}>{state.message}</p>
      ) : null}
      <PointsSubmitButton />
    </form>
  );
}
