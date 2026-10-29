import { createClient } from "@/lib/supabase/server";

// Paginate rather than accepting PostgREST's default 1,000-row truncation.
export async function readInventoryTable(table: string, columns = "*", order = "id") {
  const db = createClient();
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; start < 10000; start += 500) {
    let query = db.from(table).select(columns).order(order);
    if (order === "location_id") query = query.order("material_id");
    const { data, error } = await query.range(start, start + 499);
    if (error) throw new Error("Inventory data unavailable");
    rows.push(...(data as unknown as Record<string, unknown>[] ?? []));
    if (!data || data.length < 500) return rows;
  }
  throw new Error("Inventory result limit reached; use a narrower report");
}

export type InventoryFormState = { ok?: boolean; error?: string; key?: string; noChange?: boolean };
