import { createHash } from "node:crypto";
import { parseAppzposSingaporeTimestamp } from "./time";
import { APPZPOS_PROVIDER, type AppzposGetOrdersRequest, type AppzposOrder } from "./types";

export type AppzposOrderWrite = {
  provider: typeof APPZPOS_PROVIDER;
  providerStoreId: string;
  orderReference: string;
  referralCode: string | null;
  orderStatus: AppzposOrder["orderDetails"]["orderStatus"];
  orderCreatedAt: string;
  orderCreatedRaw: string;
  subtotalMinor: number;
  discountMinor: number;
  itemDiscountMinor: number;
  couponDiscountMinor: number;
  totalPayableMinor: number;
  cupQuantity: number;
  payloadHash: string;
  paymentInfo: Array<{ paymentType: string; paymentAmount: number }>;
  itemList: Array<{
    id: string; itemName: string; quantity: number; discountAmount: number; unitPrice: number;
    modifiers: Array<{ id: string; modifierName: string; quantity: number; additionalPrice: number }>;
  }>;
};

export type AppzposPollDependencies = {
  fetchOrders: (request: AppzposGetOrdersRequest) => Promise<AppzposOrder[]>;
  upsertOrder: (order: AppzposOrderWrite) => Promise<void>;
};

export async function pollAppzposOrders(
  request: AppzposGetOrdersRequest,
  dependencies: AppzposPollDependencies
) {
  const orders = await dependencies.fetchOrders(request);
  let processed = 0;
  for (const order of orders) {
    if (order.orderDetails.storeID !== request.storeID) {
      throw new Error("APPZPOS returned an order for a different storeID.");
    }
    await dependencies.upsertOrder({
      provider: APPZPOS_PROVIDER,
      providerStoreId: order.orderDetails.storeID,
      orderReference: order.orderDetails.orderReference,
      referralCode: order.orderDetails.referralCode,
      orderStatus: order.orderDetails.orderStatus,
      orderCreatedAt: parseAppzposSingaporeTimestamp(order.orderDetails.createdDateTime).toISOString(),
      orderCreatedRaw: order.orderDetails.createdDateTime,
      subtotalMinor: order.orderDetails.subTotal,
      discountMinor: order.orderDetails.discountAmount,
      itemDiscountMinor: order.itemList.reduce((sum, item) => sum + item.discountAmount, 0),
      couponDiscountMinor: order.orderDetails.couponDiscountAmount,
      totalPayableMinor: order.orderDetails.totalPayableAmount,
      cupQuantity: order.itemList.reduce((sum, item) => sum + item.quantity, 0),
      payloadHash: createHash("sha256").update(JSON.stringify(order.raw)).digest("hex"),
      paymentInfo: order.paymentInfo.map(({ paymentType, paymentAmount }) => ({ paymentType, paymentAmount })),
      itemList: order.itemList.map(({ id, itemName, quantity, discountAmount, unitPrice, modifiers }) => ({
        id, itemName, quantity, discountAmount, unitPrice,
        modifiers: modifiers.map(({ id, modifierName, quantity, additionalPrice }) => ({ id, modifierName, quantity, additionalPrice }))
      }))
    });
    processed += 1;
  }
  return { processed };
}

