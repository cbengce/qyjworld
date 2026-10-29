import { z } from "zod";
import { supplierInput, paymentInput, purchaseInput } from "./purchase-validation";

const id = z.string().uuid();
// Decimal strings are kept exact. Reject exponent notation, NaN, negatives and excess precision.
export const inventoryQuantity = z.string().trim().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/);
const positiveQuantity = inventoryQuantity.refine(value => /[1-9]/.test(value), "Quantity must be positive");
const text = z.string().trim().min(1).max(200);
const common = { locale: z.enum(["en", "zh"]), key: id };
export const materialInput = z.object({
  ...common, operation: z.literal("material"), brandId: id, name: text,
  category: z.enum(["ingredient", "packaging", "gift", "consumable"]),
  baseUnit: z.enum(["each", "g", "ml"]), colour: z.string().trim().max(80).default("")
});
export const locationInput = z.object({
  ...common, operation: z.literal("location"), brandId: id, name: text,
  code: z.string().trim().min(1).max(50), storeId: z.union([id, z.literal("")])
});
export const unitInput = z.object({
  ...common, operation: z.literal("unit"), materialId: id, label: text, quantity: positiveQuantity
});
export const movementInput = z.object({
  ...common, operation: z.literal("movement"), locationId: id, materialId: id,
  kind: z.enum(["opening", "receipt", "consumption", "wastage", "issue"]),
  quantity: positiveQuantity, reason: text
});
export const stocktakeInput = z.object({
  ...common, operation: z.literal("stocktake"), locationId: id, materialId: id,
  counted: inventoryQuantity, expected: inventoryQuantity, reason: text
});
export const reorderInput = z.object({
  ...common, operation: z.literal("reorder"), locationId: id, materialId: id,
  minimum: inventoryQuantity, leadDays: z.string().regex(/^\d{1,4}$/)
});
export const inventoryInput = z.discriminatedUnion("operation", [
  materialInput, locationInput, unitInput, movementInput, stocktakeInput, reorderInput, supplierInput, paymentInput, purchaseInput
]);

export function inventoryErrorCode(message: string): "stale" | "stock" | "permission" | "whole" | "duplicate" | "unavailable" | "save" {
  if (message.includes("changed since")) return "stale";
  if (message.includes("Insufficient inventory stock")) return "stock";
  if (/permission|row-level security|authenticated staff/i.test(message)) return "permission";
  if (message.includes("whole units")) return "whole";
  if (/duplicate key|idempotency key reused/i.test(message)) return "duplicate";
  if (/schema cache|does not exist|Could not find/i.test(message)) return "unavailable";
  return "save";
}
