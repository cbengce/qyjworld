import { z } from "zod";

const singaporeOrInternationalMobile = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^(\+?\d[\d\s-]{7,18})$/, "Enter a valid mobile number.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("65")) {
      const local = digits.slice(2);
      return /^[689]\d{7}$/.test(local);
    }
    if (digits.length === 8) {
      return /^[689]\d{7}$/.test(digits);
    }
    return digits.length >= 8 && digits.length <= 15;
  }, "Enter a valid Singapore or international mobile number.");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: singaporeOrInternationalMobile,
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(128),
  dateOfBirth: z.string().optional(),
  referralCode: z.string().trim().max(24).optional(),
  termsConsent: z.literal(true),
  privacyConsent: z.literal(true),
  marketingConsent: z.boolean().default(false)
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const bootstrapSuperAdminSchema = z.object({
  password: z.string().min(8).max(128)
});

export const pointsAdjustmentSchema = z.object({
  pointsAccountId: z.string().uuid(),
  transactionType: z.enum([
    "purchase_reward",
    "referral_reward",
    "manual_adjustment",
    "redemption",
    "membership_renewal",
    "promotional_reward",
    "reversal"
  ]),
  points: z.coerce.number().int().refine((value) => value !== 0),
  description: z.string().trim().min(3).max(300),
  referenceNumber: z.string().trim().max(80).optional()
});

export const memberSearchSchema = z.object({
  query: z.string().trim().min(2).max(120)
});

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

const optionalCtaUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid relative path or http(s) URL.")
  .transform((value) => value || null);

export const promotionSchema = z
  .object({
    id: optionalText(80),
    locale: z.enum(["en", "zh"]).default("en"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug such as student-month."),
    title: z.string().trim().min(2).max(180),
    subtitle: optionalText(180),
    description: optionalText(700),
    coverImageUrl: optionalCtaUrl,
    imageUrl: optionalCtaUrl,
    imageDisplayMode: z.enum(["auto", "portrait", "landscape"]).default("auto"),
    ctaLabel: optionalText(80),
    ctaUrl: optionalCtaUrl,
    startDate: optionalDateTime,
    endDate: optionalDateTime,
    displayOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
    showOnHomepage: z.boolean().default(false),
    showAscendCommunityCta: z.boolean().default(false),
    status: z.enum(["draft", "scheduled", "active", "ended"])
  })
  .refine((value) => !value.endDate || !value.startDate || new Date(value.endDate) >= new Date(value.startDate), {
    message: "End date must be after start date.",
    path: ["endDate"]
  });

export const promotionStatusSchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  id: z.string().uuid(),
  status: z.enum(["draft", "scheduled", "active", "ended"])
});

export const deletePromotionSchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  id: z.string().uuid(),
  confirmDelete: z.literal(true)
});

export const leaderboardEntrySchema = z.object({
  id: optionalText(80),
  locale: z.enum(["en", "zh"]).default("en"),
  campaignSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe campaign slug."),
  schoolName: z.string().trim().min(2).max(180),
  internalParticipantCount: z.coerce.number().int().min(0).max(100000).default(0),
  shortNote: optionalText(220),
  status: z.enum(["draft", "ready", "published", "archived"]).default("draft")
});

export const deleteLeaderboardEntrySchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  id: z.string().uuid(),
  confirmDelete: z.literal(true)
});

export const clearLeaderboardSchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  campaignSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  confirmClear: z.literal(true)
});

export const leaderboardPublicationSchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  id: z.string().uuid(),
  status: z.enum(["draft", "ready", "published", "archived"])
});

export const leaderboardMoveSchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
  id: z.string().uuid(),
  direction: z.enum(["up", "down"])
});
