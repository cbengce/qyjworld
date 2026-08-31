export const MAX_COMBINED_PARTNER_RATE_PERCENT = 30;
export const COMBINED_PARTNER_RATE_ERROR = "Customer Benefit and Partner Commission combined cannot exceed 30%.";

export type PartnerCommercialRateError = "invalid" | "combined" | null;

export function validatePartnerCommercialRates(
  customerBenefitPercent: number,
  partnerCommissionPercent: number
): PartnerCommercialRateError {
  if (
    !Number.isFinite(customerBenefitPercent) ||
    !Number.isFinite(partnerCommissionPercent) ||
    customerBenefitPercent < 0 ||
    partnerCommissionPercent < 0 ||
    customerBenefitPercent > 30 ||
    partnerCommissionPercent > 30
  ) {
    return "invalid";
  }
  return customerBenefitPercent + partnerCommissionPercent > MAX_COMBINED_PARTNER_RATE_PERCENT ? "combined" : null;
}
