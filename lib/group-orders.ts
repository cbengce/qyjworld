import { z } from "zod";
import type { MenuItem } from "@/lib/menu-types";
export const GROUP_ORDER_PROVIDER = "qyj_group_orders_v1";
export const groupOrderSchema = z.object({
  requestId: z.string().uuid(), locale: z.enum(["en", "zh"]), intent: z.enum(["order", "quote"]),
  name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/), organisation: z.string().trim().max(150),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  fulfilment: z.enum(["collection", "delivery"]), address: z.string().trim().max(500),
  notes: z.string().trim().max(1500), website: z.string().max(0),
  items: z.array(z.object({ id: z.string().min(1).max(100), quantity: z.number().int().min(1).max(300) })).min(1).max(30)
}).strict();
export type GroupOrderInput = z.infer<typeof groupOrderSchema>;
export const orderStatuses = ["requested", "quoted", "confirmed", "fulfilled", "cancelled"] as const;
export type OrderStatus = typeof orderStatuses[number];
export type GroupOrderRecord = Omit<GroupOrderInput, "website" | "items"> & {
  reference: string; storeId: string; storeName: string; createdAt: string; version: number; status: OrderStatus;
  items: { id: string; name: string; quantity: number }[]; totalCups: number;
  quote: { drinks: number; delivery: number; total: number; currency: "SGD" } | null;
  internalNotes: string; history: { at: string; actor: string; status: OrderStatus; note: string }[];
};
export function prepareGroupOrder(input: unknown, menu: MenuItem[], store: { id: string; name: string }, now = new Date()): GroupOrderRecord {
  const value = groupOrderSchema.parse(input);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const validDate = new Date(`${value.date}T00:00:00Z`);
  if (!Number.isFinite(validDate.getTime()) || validDate.toISOString().slice(0, 10) !== value.date || value.date <= today) throw new Error("Choose a valid date from tomorrow onwards (Singapore time).");
  if (value.fulfilment === "delivery" && value.address.length < 10) throw new Error("Please include the delivery address and postal code.");
  const ids = new Set<string>();
  const items = value.items.map(item => {
    if (ids.has(item.id)) throw new Error("A drink can only appear once.");
    ids.add(item.id);
    const product = menu.find(m => m.id === item.id && m.availability_status === "available");
    if (!product) throw new Error("A selected drink is no longer available. Please refresh the menu.");
    return { id: product.id, name: product.name_en, quantity: item.quantity };
  });
  const totalCups = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalCups > 500) throw new Error("Please contact us for orders above 500 cups.");
  const { website: _website, ...details } = value;
  return { ...details, items, reference: `QG-${value.requestId.replace(/-/g, "").toUpperCase()}`, storeId: store.id, storeName: store.name, createdAt: now.toISOString(), version: 1, status: "requested", totalCups, quote: null, internalNotes: "", history: [] };
}
export function reviseGroupOrder(record: GroupOrderRecord, status: OrderStatus, drinks: number, delivery: number, note: string, actor: string): GroupOrderRecord {
  const transitions: Record<OrderStatus, OrderStatus[]> = { requested: ["requested", "quoted", "cancelled"], quoted: ["quoted", "confirmed", "cancelled"], confirmed: ["confirmed", "fulfilled", "cancelled"], fulfilled: ["fulfilled"], cancelled: ["cancelled"] };
  if (!transitions[record.status]?.includes(status)) throw new Error("This status change is not allowed.");
  if (note.length > 2000) throw new Error("Notes must be no longer than 2,000 characters.");
  if (["quoted", "confirmed", "fulfilled"].includes(status) && (!Number.isFinite(drinks) || drinks <= 0 || !Number.isFinite(delivery) || delivery < 0 || drinks + delivery > 100000)) throw new Error("Enter a valid drinks amount and delivery fee in SGD.");
  if (status === "confirmed" && record.status !== "confirmed" && note.trim().length < 5) throw new Error("Record the customer's acceptance before confirming.");
  if (record.status !== "requested" && record.status !== "quoted" && record.quote && (drinks !== record.quote.drinks || delivery !== record.quote.delivery)) throw new Error("A confirmed quote cannot be changed.");
  const quote = ["quoted", "confirmed", "fulfilled"].includes(status) ? { drinks: Math.round(drinks * 100) / 100, delivery: Math.round(delivery * 100) / 100, total: Math.round((drinks + delivery) * 100) / 100, currency: "SGD" as const } : record.quote;
  return { ...record, version: record.version + 1, status, quote, internalNotes: note, history: [...record.history, { at: new Date().toISOString(), actor, status, note }].slice(-100) };
}
