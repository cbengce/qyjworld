import { differenceInCalendarDays, parseISO } from "date-fns";

export function daysRemaining(expiryDate?: string | null) {
  if (!expiryDate) return 0;
  return Math.max(0, differenceInCalendarDays(parseISO(expiryDate), new Date()));
}

export function formatStatus(status?: string | null) {
  if (!status) return "Pending";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createReferralLink(siteUrl: string, referralCode: string) {
  return `${siteUrl.replace(/\/$/, "")}/en/register?ref=${encodeURIComponent(referralCode)}`;
}
