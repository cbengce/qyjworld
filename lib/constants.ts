export const BRAND = {
  company: "TCM AND HEALTHCARE COLLEGE PTE LTD",
  nameEn: "QING YUN JIAN",
  nameZh: "青云间",
  tagline: "Born to Ascend",
  line: "Sparkling Tea Reimagined",
  address: "401 MacPherson Road, MacPherson Mall, Singapore 368125",
  domain: "https://www.qyjworld.com",
  membershipFee: "SGD 39.90",
  membershipDays: 60
} as const;

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const membershipStatuses = ["pending", "active", "expired", "suspended"] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export const adminRoles = ["super_admin", "manager", "staff"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const pointTransactionTypes = [
  "purchase_reward",
  "referral_reward",
  "manual_adjustment",
  "redemption",
  "membership_renewal",
  "promotional_reward",
  "reversal"
] as const;

export type PointTransactionType = (typeof pointTransactionTypes)[number];
