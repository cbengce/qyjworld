"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { GROUP_ORDER_PROVIDER, reviseGroupOrder, orderStatuses, type GroupOrderRecord, type OrderStatus } from "@/lib/group-orders";
export async function updateGroupOrder(form: FormData) {
  const locale = form.get("locale") === "zh" ? "zh" : "en";
  const { role, user } = await requireAdmin(locale);
  if (role !== "super_admin" && role !== "manager") redirect(`/${locale}/admin`);
  const id = String(form.get("id") || "");
  const version = Number(form.get("version"));
  const status = String(form.get("status")) as OrderStatus;
  let errorMessage = "";
  try {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !Number.isInteger(version) || !orderStatuses.includes(status)) throw new Error("Invalid update.");
    const service = createServiceClient();
    const { data, error } = await service.from("webhook_events").select("payload_json").eq("id", id).eq("provider", GROUP_ORDER_PROVIDER).single();
    if (error || !data) throw new Error("Order record could not be loaded.");
    const record = data.payload_json as GroupOrderRecord;
    if (record.version !== version) throw new Error("Someone else changed this order. Reload it before saving.");
    const revised = reviseGroupOrder(record, status, Number(form.get("drinks")), Number(form.get("delivery")), String(form.get("notes") || "").trim(), user.id);
    const { data: updated, error: updateError } = await service.from("webhook_events").update({ payload_json: revised }).eq("id", id).eq("provider", GROUP_ORDER_PROVIDER).eq("payload_json->>version", String(version)).select("id");
    if (updateError) throw new Error("The update could not be saved.");
    if (!updated?.length) throw new Error("Someone else changed this order. Reload it before saving.");
    revalidatePath(`/${locale}/admin/group-orders`);
  } catch (error) { errorMessage = error instanceof Error ? error.message : "The update could not be saved."; }
  redirect(`/${locale}/admin/group-orders?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
