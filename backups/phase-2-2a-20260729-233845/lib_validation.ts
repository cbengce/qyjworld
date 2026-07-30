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
