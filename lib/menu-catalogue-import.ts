import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalMenuItems } from "@/lib/final-menu-items";

function stableId(key: string) {
  const hex = createHash("sha256").update(`qyj-catalogue-v1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function checked(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

// Only initialise a never-configured outlet. All inserts are idempotent and leave
// existing descriptions, prices, images and lifecycle decisions untouched.
export async function importOriginalMenu(service: SupabaseClient, session: SupabaseClient, store: { id: string; brand_id: string }, userId: string) {
  const history = await service.from("menu_items").select("id, menus!inner(store_id)", { count: "exact", head: true }).eq("menus.store_id", store.id);
  checked(history);
  if (history.count !== 0) return { imported: false };
  const menus = await service.from("menus").select("id, status, deleted_at").eq("store_id", store.id);
  checked(menus);
  const active = menus.data?.find((menu) => menu.status === "active" && !menu.deleted_at);
  if (!active && menus.data?.length) throw new Error("This outlet has an existing inactive or archived menu. Open the outlet menu to review it before importing.");

  const categories = Array.from(new Map(finalMenuItems.map((item) => [item.menu_categories!.name_en, item.menu_categories!])).values());
  checked(await service.from("product_categories").upsert(categories.map((category, index) => ({
    id: stableId(`${store.brand_id}:category:${category.name_en}`), brand_id: store.brand_id,
    name_en: category.name_en, name_zh: category.name_zh, display_order: index, status: "active", created_by: userId, updated_by: userId
  })), { onConflict: "brand_id,name_en", ignoreDuplicates: true }));
  const savedCategories = await service.from("product_categories").select("id, name_en, status, deleted_at").eq("brand_id", store.brand_id).in("name_en", categories.map((category) => category.name_en));
  checked(savedCategories);
  if (savedCategories.data?.some((category) => category.status !== "active" || category.deleted_at)) throw new Error("An original category is inactive or archived. Review Categories before importing.");
  const categoryIds = new Map(savedCategories.data?.map((category) => [category.name_en, category.id]));

  checked(await service.from("products").upsert(finalMenuItems.map((item) => ({
    id: stableId(`${store.brand_id}:product:${item.id}`), brand_id: store.brand_id, sku: item.id.toUpperCase(),
    category_id: categoryIds.get(item.menu_categories!.name_en), name_en: item.name_en, name_zh: item.name_zh,
    description_en: item.description_en, description_zh: item.description_zh, status: "active", is_signature: item.is_signature,
    created_by: userId, updated_by: userId
  })), { onConflict: "brand_id,sku", ignoreDuplicates: true }));
  const products = await service.from("products").select("id, sku, status, deleted_at").eq("brand_id", store.brand_id).in("sku", finalMenuItems.map((item) => item.id.toUpperCase()));
  checked(products);
  if (products.data?.length !== finalMenuItems.length || products.data.some((product) => product.status !== "active" || product.deleted_at)) throw new Error("An original product is inactive or archived. Review the product before importing; its status has not been changed.");
  const productIds = new Map(products.data.map((product) => [product.sku, product.id]));
  const images = await service.from("product_images").select("product_id").in("product_id", products.data.map((product) => product.id));
  checked(images);
  const existingImages = new Set(images.data?.map((image) => image.product_id));
  const newImages = finalMenuItems.filter((item) => !existingImages.has(productIds.get(item.id.toUpperCase()))).map((item) => ({
    id: stableId(`${store.brand_id}:image:${item.id}`), product_id: productIds.get(item.id.toUpperCase()), image_url: item.image_url,
    alt_text_en: item.name_en, alt_text_zh: item.name_zh, is_primary: true, status: "active", created_by: userId, updated_by: userId
  }));
  if (newImages.length) checked(await service.from("product_images").upsert(newImages, { onConflict: "id", ignoreDuplicates: true }));
  let menuId = active?.id;
  if (!menuId) {
    const menu = await session.rpc("get_or_create_public_menu", { p_store_id: store.id });
    checked(menu);
    menuId = (Array.isArray(menu.data) ? menu.data[0] : menu.data)?.id;
    if (!menuId) throw new Error("The outlet menu could not be created.");
  }
  // Publish the nine menu entries together only after every product and image is ready.
  // Historical catalogue prices are deliberately not imported.
  checked(await service.from("menu_items").upsert(finalMenuItems.map((item, index) => ({
    menu_id: menuId, product_id: productIds.get(item.id.toUpperCase()), product_brand_id: store.brand_id,
    regular_price: null, member_price: null, display_order: index, is_featured: item.is_featured,
    availability_status: "available", online_ordering_enabled: false, status: "active", created_by: userId, updated_by: userId
  })), { onConflict: "menu_id,product_id", ignoreDuplicates: true }));
  return { imported: true };
}
