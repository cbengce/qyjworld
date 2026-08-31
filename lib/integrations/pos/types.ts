export const APPZGATE_PUBLIC_ENTRY_POINTS = {
  signUp: "https://order.qyjworld.com?PageMode=sign-up",
  signIn: "https://order.qyjworld.com?PageMode=sign-in",
  orderOnline: "https://order.qyjworld.com",
} as const;

export type PosEntryPoint = keyof typeof APPZGATE_PUBLIC_ENTRY_POINTS;

export type PosLinkVerificationStatus =
  | "unverified"
  | "pending_vendor_capability"
  | "verified"
  | "rejected"
  | "revoked";

export type AppzgateProductDeepLink = Readonly<{
  productKey: string;
  url: string;
  fallbackUrl: typeof APPZGATE_PUBLIC_ENTRY_POINTS.orderOnline;
  lastValidatedAt: string | null;
  status: "active" | "stale" | "disabled";
}>;

export type AppzgateWebhookCapability =
  | "new_order"
  | "new_member"
  | "payment_completed"
  | "points_updated";

export type AppzgateCapabilityStatus =
  | "confirmed_available"
  | "confirmed_unavailable"
  | "pending_vendor_clarification"
  | "future_opportunity";
