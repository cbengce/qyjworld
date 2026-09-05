"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";
import { assessWeeklyHoursEditorSafety } from "@/lib/store-types";
import { storeIdentitySchema, storeOperationsSchema } from "@/lib/validation/store";

function refresh(locale: string, storeId: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/contact`);
  revalidatePath(`/${locale}/admin/stores/${storeId}`);
}

export async function saveStoreIdentity(formData: FormData) {
  const values = storeIdentitySchema.parse(Object.fromEntries(formData));
  await requireAdminPermission(values.locale, "store.identity.manage", { storeId: values.storeId });
  const supabase = createClient();
  const { error } = await supabase.rpc("update_store_identity", {
    p_store_id: values.storeId, p_name: values.name, p_public_slug: values.publicSlug,
    p_address_line_1: values.addressLine1, p_address_line_2: values.addressLine2,
    p_city: values.city, p_country_code: values.countryCode, p_postal_code: values.postalCode,
    p_is_primary: values.isPrimary === "on", p_ordering_url: values.orderingUrl || null
  });
  if (error) redirect(`/${values.locale}/admin/stores/${values.storeId}?error=${encodeURIComponent(error.message)}`);
  refresh(values.locale, values.storeId);
  redirect(`/${values.locale}/admin/stores/${values.storeId}?saved=identity`);
}

export async function saveStoreOperations(formData: FormData) {
  const values = storeOperationsSchema.parse(Object.fromEntries(formData));
  await requireAdminPermission(values.locale, "store.operations.manage", { storeId: values.storeId });
  const supabase = createClient();
  const { error } = await supabase.rpc("update_store_operations", {
    p_store_id: values.storeId, p_phone: values.phone, p_public_email: values.publicEmail || null,
    p_latitude: values.latitude, p_longitude: values.longitude, p_map_url: values.mapUrl || null
  });
  if (error) redirect(`/${values.locale}/admin/stores/${values.storeId}?error=${encodeURIComponent(error.message)}`);
  refresh(values.locale, values.storeId);
  redirect(`/${values.locale}/admin/stores/${values.storeId}?saved=contact`);
}

export async function saveWeeklyHours(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const storeId = String(formData.get("storeId") || "");
  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek, isClosed: formData.get(`closed-${dayOfWeek}`) === "on",
    opensAt: String(formData.get(`opens-${dayOfWeek}`) || ""), closesAt: String(formData.get(`closes-${dayOfWeek}`) || "")
  }));
  await requireAdminPermission(locale, "store.operations.manage", { storeId });
  const supabase = createClient();
  const { data: existingHours, error: readError } = await supabase
    .from("store_operating_hours")
    .select("id, store_id, day_of_week, interval_no, opens_at, closes_at, is_closed, status, deleted_at")
    .eq("store_id", storeId)
    .eq("status", "active")
    .is("deleted_at", null);
  if (readError) redirect(`/${locale}/admin/stores/${storeId}?error=${encodeURIComponent(readError.message)}`);
  const safety = assessWeeklyHoursEditorSafety(existingHours ?? [], storeId);
  if (!safety.safe) {
    redirect(`/${locale}/admin/stores/${storeId}?error=${encodeURIComponent("Advanced split or overnight schedule data exists. The basic weekly-hours editor cannot overwrite it.")}`);
  }
  const { error } = await supabase.rpc("replace_store_weekly_hours", { p_store_id: storeId, p_hours: hours });
  if (error) redirect(`/${locale}/admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  refresh(locale, storeId);
  redirect(`/${locale}/admin/stores/${storeId}?saved=hours`);
}

export async function saveHoursException(formData: FormData) {
  const locale = String(formData.get("locale") || "en"); const storeId = String(formData.get("storeId") || "");
  const exceptionDate = String(formData.get("exceptionDate") || ""); const isClosed = formData.get("isClosed") === "on";
  const opensAt = String(formData.get("opensAt") || ""); const closesAt = String(formData.get("closesAt") || "");
  if (!exceptionDate) throw new Error("Exception date is required.");
  if (!isClosed && (!opensAt || !closesAt || closesAt <= opensAt)) throw new Error("Phase 1A.1 exceptions require same-day opening and closing times.");
  const { user } = await requireAdminPermission(locale, "store.operations.manage", { storeId });
  const supabase = createClient();
  const { error } = await supabase.from("store_hours_exceptions").upsert({
    store_id: storeId, exception_date: exceptionDate, interval_no: 1, label: String(formData.get("label") || "").trim() || null,
    is_closed: isClosed, opens_at: isClosed ? null : opensAt, closes_at: isClosed ? null : closesAt, updated_by: user.id, created_by: user.id
  }, { onConflict: "store_id,exception_date,interval_no" });
  if (error) throw new Error(error.message); refresh(locale, storeId); redirect(`/${locale}/admin/stores/${storeId}?saved=exception`);
}

export async function deleteHoursException(formData: FormData) {
  const locale = String(formData.get("locale") || "en"); const storeId = String(formData.get("storeId") || ""); const id = String(formData.get("id") || "");
  await requireAdminPermission(locale, "store.operations.manage", { storeId }); const supabase = createClient();
  const { error } = await supabase.from("store_hours_exceptions").delete().eq("id", id).eq("store_id", storeId);
  if (error) throw new Error(error.message); refresh(locale, storeId); redirect(`/${locale}/admin/stores/${storeId}?saved=exception`);
}
