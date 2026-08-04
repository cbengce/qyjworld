import type { AscendProfileSlug } from "./profiles";

export const REFERRAL_CODE_PATTERN = /^[a-f0-9]{16}$/;

export type AscendReferralResponse = {
  referralCode?: string;
  completedTests?: number;
};

export type AscendReferralProgress = {
  completedTests: number;
  nextMilestone?: {
    remainingCount: number;
    rewardName: string;
  };
};

async function requestReferral(body: Record<string, unknown>): Promise<AscendReferralResponse> {
  const response = await fetch("/api/ascend/referrals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Referral services are temporarily unavailable.");
  return response.json() as Promise<AscendReferralResponse>;
}

export function createAscendReferral(profileId: AscendProfileSlug) {
  return requestReferral({ action: "create", profileId });
}

export function recordAscendReferral(action: "visit" | "complete" | "share", referralCode: string): Promise<AscendReferralResponse> {
  if (!REFERRAL_CODE_PATTERN.test(referralCode)) return Promise.resolve({});
  return requestReferral({ action, referralCode });
}

export async function getAscendReferralProgress(referralCode: string): Promise<AscendReferralProgress | null> {
  if (!REFERRAL_CODE_PATTERN.test(referralCode)) return null;
  const response = await fetch(`/api/ascend/referrals?code=${encodeURIComponent(referralCode)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Referral progress is temporarily unavailable.");
  return response.json() as Promise<AscendReferralProgress>;
}
