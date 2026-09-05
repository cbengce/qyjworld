"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, menuItemSchema, productSchema } from "@/lib/validation/menu";

function refreshMenu(locale: string) {
  revalidatePath(`/${locale}/menu`);
  revalidatePath(`/${locale}/admin/menu`);
}

export async function saveCategory(formData: FormData) {
  const values = categorySchema.parse(Object.fromEntries(formData));
  const { user } = await requireAdminPermission(values.locale, "menu.manage", { brandId: values.brandId });
  const supabase = createClient();
  const record = { brand_id: values.brandId, name_en: values.nameEn, name_zh: values.nameZh || null, display_order: values.displayOrder, updated_by: user.id };
  const result = values.id ? await supabase.from("product_categories").update(record).eq("id", values.id) : await supabase.from("product_categories").insert({ ...record, created_by: user.id });
  if (result.error) throw new Error(result.error.message);
  refreshMenu(values.locale);
}

export async function saveProduct(formData: FormData) {
  const values = productSchema.parse(Object.fromEntries(formData));
  const { user } = await requireAdminPermission(values.locale, "menu.manage", { brandId: values.brandId });
  const supabase = createClient();
  const record = {
    brand_id: values.brandId, category_id: values.categoryId || null, sku: values.sku, name_en: values.nameEn,
    name_zh: values.nameZh || null, description_en: values.descriptionEn || null, description_zh: values.descriptionZh || null,
    is_signature: values.isSignature === "on", updated_by: user.id
  };
  const result = values.id
    ? await supabase.from("products").update(record).eq("id", values.id).select("id").single()
    : await supabase.from("products").insert({ ...record, status: "inactive", created_by: user.id }).select("id").single();
  if (result.error) throw new Error(result.error.message);
  refreshMenu(values.locale);
  redirect(`/${values.locale}/admin/menu/products/${result.data.id}?saved=product`);
}

export async function changeProductLifecycle(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const productId = String(formData.get("productId") || "");
  const brandId = String(formData.get("brandId") || "");
  const action = String(formData.get("lifecycle") || "");
  await requireAdminPermission(locale, "menu.manage", { brandId });
  const supabase = createClient();
  const result = action === "restore"
    ? await supabase.rpc("restore_product", { p_product_id: productId })
    : await supabase.rpc("set_product_lifecycle", { p_product_id: productId, p_status: action });
  if (result.error) throw new Error(result.error.message);
  refreshMenu(locale);
  redirect(`/${locale}/admin/menu/products/${productId}?saved=lifecycle`);
}

export async function uploadProductImage(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const productId = String(formData.get("productId") || "");
  const brandId = String(formData.get("brandId") || "");
  const altTextEn = String(formData.get("altTextEn") || "").trim();
  const file = formData.get("image");
  if (!(file instanceof File) || !file.size) throw new Error("Choose an image to upload.");
  if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a JPG, PNG or WebP image up to 5MB.");
  const { user } = await requireAdminPermission(locale, "menu.manage", { brandId });
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${brandId}/${productId}/${randomUUID()}.${extension}`;
  const supabase = createClient();
  const upload = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw new Error(upload.error.message);
  const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
  const { data: imageRecord, error } = await supabase.from("product_images").insert({ product_id: productId, image_url: publicUrl.publicUrl, alt_text_en: altTextEn || null, is_primary: false, created_by: user.id, updated_by: user.id }).select("id").single();
  if (error) { await supabase.storage.from("product-images").remove([path]); throw new Error(error.message); }
  if (formData.get("isPrimary") === "on") {
    const primaryUpdate = await supabase.rpc("set_primary_product_image", { p_product_id: productId, p_image_id: imageRecord.id });
    if (primaryUpdate.error) throw new Error(primaryUpdate.error.message);
  }
  refreshMenu(locale);
  redirect(`/${locale}/admin/menu/products/${productId}?saved=image`);
}

export async function archiveProductImage(formData: FormData) {
  const locale = String(formData.get("locale") || "en"); const productId = String(formData.get("productId") || "");
  const brandId = String(formData.get("brandId") || ""); const imageId = String(formData.get("imageId") || "");
  const { user } = await requireAdminPermission(locale, "menu.manage", { brandId }); const supabase = createClient();
  const { error } = await supabase.from("product_images").update({ status: "archived", deleted_at: new Date().toISOString(), deleted_by: user.id, updated_by: user.id }).eq("id", imageId).eq("product_id", productId);
  if (error) throw new Error(error.message); refreshMenu(locale); redirect(`/${locale}/admin/menu/products/${productId}?saved=image`);
}

export async function saveMenuItem(formData: FormData) {
  const values = menuItemSchema.parse(Object.fromEntries(formData));
  const { user } = await requireAdminPermission(values.locale, "menu.manage", { brandId: values.brandId, storeId: values.storeId });
  const supabase = createClient();
  const { error } = await supabase.from("menu_items").update({
    regular_price: values.regularPrice, member_price: values.memberPrice, display_order: values.displayOrder,
    is_featured: values.isFeatured === "on", availability_status: values.availabilityStatus,
    online_ordering_enabled: values.onlineOrderingEnabled === "on", updated_by: user.id
  }).eq("id", values.menuItemId).eq("menu_id", values.menuId);
  if (error) throw new Error(error.message);
  refreshMenu(values.locale);
  redirect(`/${values.locale}/admin/menu/outlets/${values.storeId}?saved=item`);
}

export async function createOutletMenu(formData: FormData) {
  const locale = String(formData.get("locale") || "en"); const brandId = String(formData.get("brandId")); const storeId = String(formData.get("storeId"));
  const { user } = await requireAdminPermission(locale, "menu.manage", { brandId, storeId });
  const supabase = createClient();
  const { data, error } = await supabase.from("menus").insert({ brand_id: brandId, store_id: storeId, name: "Public Menu", status: "inactive", created_by: user.id, updated_by: user.id }).select("id").single();
  if (error) throw new Error(error.message);
  const activation = await supabase.rpc("activate_store_menu", { p_menu_id: data.id });
  if (activation.error) throw new Error(activation.error.message);
  refreshMenu(locale); redirect(`/${locale}/admin/menu/outlets/${storeId}`);
}

export async function addProductToMenu(formData: FormData) {
  const locale = String(formData.get("locale") || "en"); const menuId = String(formData.get("menuId")); const productId = String(formData.get("productId"));
  const brandId = String(formData.get("brandId")); const storeId = String(formData.get("storeId"));
  const { user } = await requireAdminPermission(locale, "menu.manage", { brandId, storeId });
  const supabase = createClient();
  const { error } = await supabase.from("menu_items").insert({ menu_id: menuId, product_id: productId, product_brand_id: brandId, status: "active", created_by: user.id, updated_by: user.id });
  if (error) throw new Error(error.message);
  refreshMenu(locale); redirect(`/${locale}/admin/menu/outlets/${storeId}?saved=added`);
}
