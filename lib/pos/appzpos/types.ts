export const APPZPOS_PROVIDER = "appzpos" as const;

export type AppzposOrderStatus = "PENDING" | "PAID" | "COMPLETED" | "CANCELLED";

export type AppzposGetOrdersRequest = {
  storeID: string;
  fromDateTime: string;
  toDateTime: string;
};

export type AppzposModifier = {
  id: string;
  modifierName: string;
  quantity: number;
  additionalPrice: number;
};

export type AppzposItem = {
  id: string;
  itemName: string;
  quantity: number;
  discountAmount: number;
  unitPrice: number;
  remarks: string;
  modifiers: AppzposModifier[];
};

export type AppzposPayment = {
  paymentType: string;
  paymentAmount: number;
  remarks: string;
};

export type AppzposOrder = {
  orderDetails: {
    orderReference: string;
    referralCode: string | null;
    storeID: string;
    createdDateTime: string;
    orderStatus: AppzposOrderStatus;
    subTotal: number;
    discountAmount: number;
    couponDiscountAmount: number;
    totalPayableAmount: number;
    [key: string]: unknown;
  };
  customerInfo: Record<string, unknown>;
  paymentInfo: AppzposPayment[];
  itemList: AppzposItem[];
  raw: unknown;
};

export type AppzposTokenRequest = {
  store_id: string;
  client_id: string;
  client_secret: string;
};

export type AppzposTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type AppzposPollWindow = { from: Date; to: Date };

