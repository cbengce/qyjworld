import { z } from "zod";
import type { AppzposOrder, AppzposTokenResponse } from "./types";

const minorUnits = z.number().int().nonnegative().safe();
const quantity = z.number().int().nonnegative().safe();

const modifierSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  modifierName: z.string(),
  quantity,
  additionalPrice: minorUnits
}).passthrough();

const itemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  itemName: z.string(),
  quantity,
  discountAmount: minorUnits,
  unitPrice: minorUnits,
  remarks: z.string().default(""),
  modifiers: z.array(modifierSchema).default([])
}).passthrough();

const paymentSchema = z.object({
  paymentType: z.string(),
  paymentAmount: minorUnits,
  remarks: z.string().default("")
}).passthrough();

const orderSchema = z.object({
  orderDetails: z.object({
    orderReference: z.string().trim().min(1),
    referralCode: z.string().nullable().optional(),
    storeID: z.string().trim().min(1),
    createdDateTime: z.string().datetime({ offset: true }),
    orderStatus: z.enum(["PENDING", "PAID", "COMPLETED", "CANCELLED"]),
    subTotal: minorUnits,
    discountAmount: minorUnits,
    couponDiscountAmount: minorUnits,
    totalPayableAmount: minorUnits
  }).passthrough(),
  customerInfo: z.record(z.unknown()).default({}),
  paymentInfo: z.array(paymentSchema).default([]),
  itemList: z.array(itemSchema).default([])
}).passthrough();

const responseSchema = z.object({ orders: z.array(orderSchema) }).passthrough();

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive().safe()
}).passthrough();

export function parseAppzposTokenResponse(payload: unknown): AppzposTokenResponse {
  return tokenResponseSchema.parse(payload);
}

export function parseAppzposGetOrdersResponse(payload: unknown): AppzposOrder[] {
  const parsed = responseSchema.parse(payload);
  return parsed.orders.map((order) => ({
    orderDetails: {
      ...order.orderDetails,
      referralCode: order.orderDetails.referralCode?.trim() || null
    },
    customerInfo: order.customerInfo,
    paymentInfo: order.paymentInfo,
    itemList: order.itemList,
    raw: order
  })) as AppzposOrder[];
}

export function isPaidAppzposStatus(status: AppzposOrder["orderDetails"]["orderStatus"]) {
  return status === "PAID" || status === "COMPLETED";
}
