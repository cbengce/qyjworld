"use server";

import { moneyMinor } from "@/lib/inventory/purchasing";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { inventoryInput, inventoryErrorCode } from "@/lib/inventory/validation";
import type { InventoryFormState } from "@/lib/inventory/admin";

export async function saveInventory(previous: InventoryFormState, form: FormData): Promise<InventoryFormState> {
  const locale = form.get("locale") === "zh" ? "zh" : "en";
  await requireAdmin(locale);
  const parsed = inventoryInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid", key: previous.key };
  const v = parsed.data;
  const db = createClient();
  let noChange = false;
  try {
    // Inserts use a stable form UUID so an uncertain response can be retried safely.
    async function insertOnce(table: string, row: Record<string, unknown>) {
      const { error } = await db.from(table).insert(row);
      if (!error) return;
      if (error.code === "23505") {
        const { data, error: readError } = await db.from(table).select("*").eq("id", row.id).maybeSingle();
        if (!readError && data && Object.entries(row).every(([key, value]) =>
          JSON.stringify(data[key]) === JSON.stringify(value))) return;
      }
      throw new Error(error.message);
    }
    if (v.operation === "supplier") {
      await insertOnce("inventory_suppliers", { id: v.key, brand_id: v.brandId, platform: v.platform,
        company_name: v.companyName, supplier_name: v.supplierName });
    } else if (v.operation === "purchase") {
      const { error } = await db.rpc("create_inventory_purchase", { p_id: v.key, p_supplier: v.supplierId,
        p_reference: v.reference, p_currency: v.currency, p_ordered_on: v.orderedOn,
        p_material: v.materialId, p_package_label: v.packageLabel, p_package_quantity: v.packageQuantity,
        p_conversion: v.conversion, p_goods_minor: moneyMinor(v.goodsAmount).toString() });
      if (error) throw new Error(error.message);
    } else if (v.operation === "payment") {
      const { data: order, error: orderError } = await db.from("inventory_purchase_orders").select("brand_id").eq("id", v.orderId).single();
      if (orderError || !order) throw new Error("Insufficient inventory permission");
      const row = { id: v.key, brand_id: order.brand_id, order_id: v.orderId, paid_on: v.paidOn,
        order_currency_amount_minor: moneyMinor(v.originalAmount).toString(), actual_sgd_minor: moneyMinor(v.actualSgd).toString(),
        fee_sgd_minor: moneyMinor(v.feeSgd).toString(), reference: v.reference };
      const { error } = await db.from("inventory_purchase_payments").insert(row);
      if (error) {
        const { data: old } = await db.from("inventory_purchase_payments").select("id,brand_id,order_id,paid_on,order_currency_amount_minor::text,actual_sgd_minor::text,fee_sgd_minor::text,reference").eq("id", v.key).maybeSingle();
        if (error.code !== "23505" || !old || !Object.entries(row).every(([k,value]) => String((old as Record<string, unknown>)[k]) === String(value))) throw new Error(error.message);
      }
    } else if (v.operation === "material") {
      await insertOnce("inventory_materials", { id: v.key, brand_id: v.brandId,
        name: v.name, category: v.category, base_unit: v.baseUnit,
        attributes: v.colour ? { colour: v.colour } : {} });
    } else if (v.operation === "location") {
      await insertOnce("inventory_locations", { id: v.key, brand_id: v.brandId,
        name: v.name, location_code: v.code, store_id: v.storeId || null,
        kind: v.storeId ? "store" : "warehouse" });
    } else if (v.operation === "unit") {
      const { data: material, error } = await db.from("inventory_materials").select("brand_id,base_unit").eq("id", v.materialId).single();
      if (error || !material) throw new Error("Insufficient inventory permission");
      if (material.base_unit === "each" && /\.\d*[1-9]/.test(v.quantity)) return { error: "whole", key: v.key };
      // Read exact decimal text for safe retry comparison.
      const { error: insertError } = await db.from("inventory_material_units").insert({
        id: v.key, brand_id: material.brand_id, material_id: v.materialId,
        unit_label: v.label, base_quantity: v.quantity
      });
      if (insertError) {
        const { data: existing } = await db.from("inventory_material_units")
          .select("material_id,unit_label,base_quantity::text").eq("id", v.key).maybeSingle();
        const normalise = (value: string) => value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
        if (insertError.code !== "23505" || !existing || existing.material_id !== v.materialId
          || existing.unit_label !== v.label || normalise(String(existing.base_quantity)) !== normalise(v.quantity)) {
          throw new Error(insertError.message);
        }
      }
    } else if (v.operation === "movement") {
      const negative = ["consumption", "wastage", "issue"].includes(v.kind);
      const { error } = await db.rpc("post_inventory_movement", {
        p_location_id: v.locationId, p_material_id: v.materialId, p_kind: v.kind,
        p_quantity_delta: negative ? `-${v.quantity}` : v.quantity,
        p_reason: v.reason, p_idempotency_key: v.key
      });
      if (error) throw new Error(error.message);
    } else if (v.operation === "stocktake") {
      const { data, error } = await db.rpc("post_inventory_stocktake", {
        p_location_id: v.locationId, p_material_id: v.materialId,
        p_counted_quantity: v.counted, p_expected_quantity: v.expected,
        p_reason: v.reason, p_idempotency_key: v.key
      });
      if (error) throw new Error(error.message);
      noChange = data === null;
    } else {
      const { data: location, error: locationError } = await db.from("inventory_locations").select("brand_id").eq("id", v.locationId).single();
      if (locationError || !location) throw new Error("Insufficient inventory permission");
      const { error } = await db.from("inventory_reorder_settings").upsert({
        brand_id: location.brand_id, location_id: v.locationId, material_id: v.materialId,
        minimum_quantity: v.minimum, lead_time_days: Number(v.leadDays)
      }, { onConflict: "location_id,material_id" });
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    return { error: inventoryErrorCode(error instanceof Error ? error.message : ""), key: v.key };
  }
  revalidatePath(`/${locale}/admin/inventory`);
  revalidatePath(`/${locale}/admin/inventory/purchasing`);
  return { ok: true, key: randomUUID(), noChange };
}
