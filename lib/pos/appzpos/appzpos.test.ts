import { describe, expect, it } from "vitest";
import { buildAppzposGetOrdersRequest, buildAppzposTokenRequest, getAppzposAccessToken, getAppzposOrders } from "./client";
import { parseAppzposGetOrdersResponse, parseAppzposTokenResponse } from "./schema";
import { pollAppzposOrders } from "./poller";
import { appzposTransactionId } from "./identity";
import { decryptAppzposToken, encryptAppzposToken } from "./token-crypto";
import { formatAppzposSingaporeDateTime, parseAppzposSingaporeTimestamp, splitAppzposWindows } from "./time";

const baseOrder = {
  orderDetails: {
    orderReference: "OR10364",
    storeID: "STORE-A",
    createdDateTime: "2026-06-19T14:20:14Z",
    orderStatus: "PAID",
    referralCode: " ABC001 ",
    subTotal: 4500,
    discountAmount: 0,
    couponDiscountAmount: 0,
    totalPayableAmount: 4500
  },
  customerInfo: {},
  paymentInfo: [{ paymentType: "CARD", paymentAmount: 4500, remarks: "" }],
  itemList: [{ id: "6387", itemName: "Tea", quantity: 1, discountAmount: 0, unitPrice: 4500, remarks: "", modifiers: [] }]
};

describe("APPZPOS GetOrders", () => {
  it("builds the documented GET-with-JSON-body request without exposing credentials in the URL", () => {
    const request = buildAppzposGetOrdersRequest("secret-token", { storeID: "STORE-A", fromDateTime: "2026-06-19 00:00:00.000", toDateTime: "2026-06-19 14:22:07.000" });
    expect(request.method).toBe("GET");
    expect(request.url.pathname).toBe("/api/OrderController/APPZPOS/GetOrders");
    expect(request.url.search).toBe("");
    expect(request.headers.authorization).toBe("Bearer secret-token");
    expect(JSON.parse(request.body)).toEqual({ storeID: "STORE-A", fromDateTime: "2026-06-19 00:00:00.000", toDateTime: "2026-06-19 14:22:07.000" });
  });

  it("builds the documented token request without hard-coded outlet credentials", () => {
    const request = buildAppzposTokenRequest({ store_id: "STORE-A", client_id: "client", client_secret: "secret" });
    expect(request.method).toBe("POST");
    expect(request.url.pathname).toBe("/api/UserAccountController/APPZPOS/Token");
    expect(JSON.parse(request.body)).toEqual({ store_id: "STORE-A", client_id: "client", client_secret: "secret" });
  });

  it("parses the verified Token endpoint success schema", async () => {
    const payload = { access_token: "redacted-token", token_type: "Bearer", expires_in: 259200 };
    expect(parseAppzposTokenResponse(payload)).toEqual(payload);
    await expect(getAppzposAccessToken(
      { store_id: "STORE-A", client_id: "client", client_secret: "secret" },
      async () => ({ status: 200, body: JSON.stringify(payload) })
    )).resolves.toEqual(payload);
  });

  it("rejects incomplete or invalid Token endpoint responses", () => {
    expect(() => parseAppzposTokenResponse({ token_type: "Bearer", expires_in: 259200 })).toThrow();
    expect(() => parseAppzposTokenResponse({ access_token: "token", token_type: "Bearer", expires_in: 0 })).toThrow();
  });

  it("parses paid/completed/cancelled/pending orders and preserves integer minor units", () => {
    const statuses = ["PAID", "COMPLETED", "CANCELLED", "PENDING"] as const;
    const orders = parseAppzposGetOrdersResponse({ orders: statuses.map((orderStatus, index) => ({ ...baseOrder, orderDetails: { ...baseOrder.orderDetails, orderReference: `OR-${index}`, orderStatus } })) });
    expect(orders.map((order) => order.orderDetails.orderStatus)).toEqual(statuses);
    expect(orders[0].orderDetails.subTotal).toBe(4500);
    expect(orders[0].orderDetails.referralCode).toBe("ABC001");
  });

  it("accepts an absent referralCode as unassigned rather than inventing a partner", () => {
    const order = structuredClone(baseOrder);
    delete (order.orderDetails as Partial<typeof order.orderDetails>).referralCode;
    expect(parseAppzposGetOrdersResponse({ orders: [order] })[0].orderDetails.referralCode).toBeNull();
  });

  it("rejects fractional monetary values", () => {
    expect(() => parseAppzposGetOrdersResponse({ orders: [{ ...baseOrder, orderDetails: { ...baseOrder.orderDetails, subTotal: 45.5 } }] })).toThrow();
  });

  it("uses an injected transport and never needs a live APPZPOS connection in tests", async () => {
    const orders = await getAppzposOrders("token", { storeID: "STORE-A", fromDateTime: "2026-06-19 00:00:00.000", toDateTime: "2026-06-19 14:22:07.000" }, async () => ({ status: 200, body: JSON.stringify({ orders: [baseOrder] }) }));
    expect(orders).toHaveLength(1);
  });

  it("encrypts cached access tokens and rejects the wrong key", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptAppzposToken("three-day-access-token", key);
    expect(encrypted.ciphertext).not.toContain("three-day-access-token");
    expect(decryptAppzposToken(encrypted, key)).toBe("three-day-access-token");
    expect(() => decryptAppzposToken(encrypted, Buffer.alloc(32, 8).toString("base64"))).toThrow();
  });

  it("fails closed when APPZPOS returns an order for another outlet", async () => {
    await expect(pollAppzposOrders(
      { storeID: "STORE-A", fromDateTime: "2026-06-19 00:00:00.000", toDateTime: "2026-06-19 14:22:07.000" },
      { fetchOrders: async () => [{ ...parseAppzposGetOrdersResponse({ orders: [baseOrder] })[0], orderDetails: { ...parseAppzposGetOrdersResponse({ orders: [baseOrder] })[0].orderDetails, storeID: "STORE-B" } }], upsertOrder: async () => undefined }
    )).rejects.toThrow("different storeID");
  });

  it("treats APPZPOS timestamps as Singapore wall time even when suffixed Z", () => {
    expect(parseAppzposSingaporeTimestamp("2026-09-27T14:20:14Z").toISOString()).toBe("2026-09-27T06:20:14.000Z");
    expect(formatAppzposSingaporeDateTime(new Date("2026-09-27T06:20:14.123Z"))).toBe("2026-09-27 14:20:14.123");
  });

  it("splits historical backfills into no more than five-day windows", () => {
    const windows = splitAppzposWindows(new Date("2026-09-01T00:00:00Z"), new Date("2026-09-13T00:00:00Z"));
    expect(windows).toHaveLength(3);
    expect(windows.map((window) => (window.to.getTime() - window.from.getTime()) / 86_400_000)).toEqual([5, 5, 2]);
  });

  it("maps verified partner-order discount facts without assuming five percent", async () => {
    const fixtures = [["OR822", "TEF001", 30], ["OR818", "IBISM2", 30], ["OR808", "IBISM2", 35], ["OR806", "TEF001", 30]] as const;
    const writes: Array<{ orderReference: string; referralCode: string | null; itemDiscountMinor: number }> = [];
    const orders = fixtures.map(([orderReference, referralCode, discountAmount]) => ({
      ...baseOrder,
      orderDetails: { ...baseOrder.orderDetails, orderReference, referralCode },
      itemList: [{ ...baseOrder.itemList[0], discountAmount }]
    }));
    await pollAppzposOrders(
      { storeID: "STORE-A", fromDateTime: "2026-09-27 00:00:00.000", toDateTime: "2026-09-28 00:00:00.000" },
      { fetchOrders: async () => parseAppzposGetOrdersResponse({ orders }), upsertOrder: async (write) => { writes.push(write); } }
    );
    expect(writes.map(({ orderReference, referralCode, itemDiscountMinor }) => [orderReference, referralCode, itemDiscountMinor])).toEqual(fixtures);
  });

  it("uses store and order together when matching commissions", () => {
    expect(appzposTransactionId("STORE-A", "OR822")).toBe("STORE-A:OR822");
    expect(appzposTransactionId("STORE-B", "OR822")).not.toBe(appzposTransactionId("STORE-A", "OR822"));
  });

  it("stores only approved item and payment fields, omitting customer notes and unknown payload fields", async () => {
    const order = parseAppzposGetOrdersResponse({ orders: [{
      ...baseOrder,
      customerInfo: { mobile: "99999999" },
      paymentInfo: [{ ...baseOrder.paymentInfo[0], remarks: "private payment note", cardNumber: "sensitive" }],
      itemList: [{ ...baseOrder.itemList[0], remarks: "private customer note", customerName: "sensitive", modifiers: [
        { id: "MOD-1", modifierName: "Pearls", quantity: 1, additionalPrice: 50, customerNote: "sensitive" }
      ] }]
    }] })[0];
    let persisted: unknown;
    await pollAppzposOrders(
      { storeID: "STORE-A", fromDateTime: "2026-06-19 00:00:00.000", toDateTime: "2026-06-19 23:59:59.999" },
      { fetchOrders: async () => [order], upsertOrder: async (write) => { persisted = write; } }
    );
    const text = JSON.stringify(persisted);
    expect(text).not.toContain("private");
    expect(text).not.toContain("sensitive");
    expect(text).not.toContain("99999999");
    expect(persisted).toMatchObject({
      paymentInfo: [{ paymentType: "CARD", paymentAmount: 4500 }],
      itemList: [{ itemName: "Tea", modifiers: [{ modifierName: "Pearls", additionalPrice: 50 }] }]
    });
  });
});

