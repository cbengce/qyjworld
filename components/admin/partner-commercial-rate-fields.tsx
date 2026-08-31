"use client";

import { useEffect, useRef, useState } from "react";
import { COMBINED_PARTNER_RATE_ERROR, validatePartnerCommercialRates } from "@/lib/partners/commercial-rates";

type PartnerCommercialRateFieldsProps = {
  customerBenefit: string;
  partnerCommission: string;
  inputClassName: string;
};

export function PartnerCommercialRateFields({ customerBenefit, partnerCommission, inputClassName }: PartnerCommercialRateFieldsProps) {
  const [customerValue, setCustomerValue] = useState(customerBenefit);
  const [commissionValue, setCommissionValue] = useState(partnerCommission);
  const customerInput = useRef<HTMLInputElement>(null);
  const commissionInput = useRef<HTMLInputElement>(null);
  const customerNumber = Number(customerValue);
  const commissionNumber = Number(commissionValue);
  const combinedInvalid =
    customerValue.trim() !== "" &&
    commissionValue.trim() !== "" &&
    Number.isFinite(customerNumber) &&
    Number.isFinite(commissionNumber) &&
    validatePartnerCommercialRates(customerNumber, commissionNumber) === "combined";

  useEffect(() => {
    const message = combinedInvalid ? COMBINED_PARTNER_RATE_ERROR : "";
    customerInput.current?.setCustomValidity(message);
    commissionInput.current?.setCustomValidity(message);
  }, [combinedInvalid]);

  return (
    <>
      <label>
        Customer Benefit (%)
        <input ref={customerInput} className={inputClassName} max="30" min="0" name="customerDiscountRate" onChange={(event) => setCustomerValue(event.target.value)} required step="0.01" type="number" value={customerValue} />
      </label>
      <label>
        Partner Commission (%)
        <input ref={commissionInput} className={inputClassName} max="30" min="0" name="partnerRewardRate" onChange={(event) => setCommissionValue(event.target.value)} required step="0.01" type="number" value={commissionValue} />
      </label>
      {combinedInvalid ? (
        <p className="border border-red-700/30 p-3 text-sm font-semibold text-red-800" role="alert">{COMBINED_PARTNER_RATE_ERROR}</p>
      ) : null}
    </>
  );
}
