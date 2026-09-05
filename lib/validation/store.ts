import { z } from "zod";

const optionalText = z.string().trim().optional().default("");
const optionalNumber = z.preprocess((value) => value === "" || value === undefined ? null : Number(value), z.number().finite().nullable());

export const storeIdentitySchema = z.object({
  locale: z.string().default("en"), storeId: z.string().uuid(), name: z.string().trim().min(2).max(160),
  publicSlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), addressLine1: z.string().trim().min(3).max(200),
  addressLine2: optionalText, city: z.string().trim().min(2).max(100), countryCode: z.string().trim().length(2),
  postalCode: optionalText, isPrimary: z.string().optional(), orderingUrl: z.string().trim().url().startsWith("https://").optional().or(z.literal(""))
});

export const storeOperationsSchema = z.object({
  locale: z.string().default("en"), storeId: z.string().uuid(), phone: optionalText,
  publicEmail: z.string().trim().email().optional().or(z.literal("")), latitude: optionalNumber,
  longitude: optionalNumber, mapUrl: z.string().trim().url().startsWith("https://").optional().or(z.literal(""))
}).refine((value) => (value.latitude === null) === (value.longitude === null), { message: "Latitude and longitude must be supplied together." });

export const weeklyHoursSchema = z.object({
  locale: z.string().default("en"), storeId: z.string().uuid(), hoursJson: z.string().transform((value, context) => {
    try { return JSON.parse(value); } catch { context.addIssue({ code: z.ZodIssueCode.custom, message: "Operating hours are invalid." }); return z.NEVER; }
  }).pipe(z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6), isClosed: z.boolean(),
    opensAt: z.string(), closesAt: z.string()
  })).max(7))
});
