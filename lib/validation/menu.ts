import { z } from "zod";

const optionalPrice = z.preprocess((value) => value === "" || value === undefined ? null : Number(value), z.number().finite().min(0).nullable());

export const categorySchema = z.object({ locale: z.string(), id: z.string().uuid().optional().or(z.literal("")), brandId: z.string().uuid(), nameEn: z.string().trim().min(2), nameZh: z.string().trim().optional(), displayOrder: z.coerce.number().int() });
export const productSchema = z.object({
  locale: z.string(), id: z.string().uuid().optional().or(z.literal("")), brandId: z.string().uuid(), categoryId: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().trim().min(2).max(80), nameEn: z.string().trim().min(2), nameZh: z.string().trim().optional(),
  descriptionEn: z.string().trim().optional(), descriptionZh: z.string().trim().optional(), isSignature: z.string().optional()
});
export const menuItemSchema = z.object({
  locale: z.string(), menuItemId: z.string().uuid(), menuId: z.string().uuid(), brandId: z.string().uuid(), storeId: z.string().uuid(),
  regularPrice: optionalPrice, memberPrice: optionalPrice, displayOrder: z.coerce.number().int(), isFeatured: z.string().optional(),
  availabilityStatus: z.enum(["available", "unavailable", "coming_soon"]), onlineOrderingEnabled: z.string().optional()
}).refine((value) => value.memberPrice === null || value.regularPrice === null || value.memberPrice <= value.regularPrice, { message: "Member price cannot exceed regular price.", path: ["memberPrice"] });
