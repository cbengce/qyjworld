import { request as httpsRequest } from "node:https";
import { z } from "zod";
import { parseAppzposGetOrdersResponse, parseAppzposTokenResponse } from "./schema";
import type { AppzposGetOrdersRequest, AppzposOrder, AppzposTokenRequest, AppzposTokenResponse } from "./types";

export const APPZPOS_BASE_URL = "https://appzpos-fnb-server.dynalias.com";
export const APPZPOS_TOKEN_PATH = "/api/UserAccountController/APPZPOS/Token";
export const APPZPOS_GET_ORDERS_PATH = "/api/OrderController/APPZPOS/GetOrders";

const dateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
const getOrdersRequestSchema = z.object({
  storeID: z.string().trim().min(1),
  fromDateTime: dateTimeSchema,
  toDateTime: dateTimeSchema
});
const tokenRequestSchema = z.object({
  store_id: z.string().trim().min(1),
  client_id: z.string().trim().min(1),
  client_secret: z.string().trim().min(1)
});

export type AppzposHttpRequest = {
  method: "GET" | "POST";
  url: URL;
  headers: Record<string, string>;
  body: string;
};

export type AppzposHttpResponse = { status: number; body: string };
export type AppzposTransport = (request: AppzposHttpRequest) => Promise<AppzposHttpResponse>;

export function nodeAppzposTransport(input: AppzposHttpRequest, timeoutMs = 15_000): Promise<AppzposHttpResponse> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(input.url, { method: input.method, headers: input.headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("APPZPOS request timed out.")));
    request.on("error", reject);
    request.write(input.body);
    request.end();
  });
}

export async function withAppzposRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function jsonRequest(method: "GET" | "POST", path: string, body: unknown, authorization?: string): AppzposHttpRequest {
  const serialized = JSON.stringify(body);
  return {
    method,
    url: new URL(path, APPZPOS_BASE_URL),
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(serialized).toString(),
      ...(authorization ? { authorization: `Bearer ${authorization}` } : {})
    },
    body: serialized
  };
}

export function buildAppzposTokenRequest(input: AppzposTokenRequest) {
  return jsonRequest("POST", APPZPOS_TOKEN_PATH, tokenRequestSchema.parse(input));
}

export async function getAppzposAccessToken(
  input: AppzposTokenRequest,
  transport: AppzposTransport = nodeAppzposTransport
): Promise<AppzposTokenResponse> {
  const response = await transport(buildAppzposTokenRequest(input));
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`APPZPOS Token endpoint returned HTTP ${response.status}.`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("APPZPOS Token endpoint returned invalid JSON.");
  }
  return parseAppzposTokenResponse(payload);
}

export function buildAppzposGetOrdersRequest(accessToken: string, input: AppzposGetOrdersRequest) {
  if (!accessToken.trim()) throw new Error("APPZPOS access token is required.");
  return jsonRequest("GET", APPZPOS_GET_ORDERS_PATH, getOrdersRequestSchema.parse(input), accessToken);
}

export async function getAppzposOrders(
  accessToken: string,
  input: AppzposGetOrdersRequest,
  transport: AppzposTransport = nodeAppzposTransport
): Promise<AppzposOrder[]> {
  const response = await transport(buildAppzposGetOrdersRequest(accessToken, input));
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`APPZPOS GetOrders returned HTTP ${response.status}.`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error("APPZPOS GetOrders returned invalid JSON.");
  }
  return parseAppzposGetOrdersResponse(payload);
}

