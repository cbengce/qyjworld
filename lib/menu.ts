import { createClient } from "@/lib/supabase/server";
import { finalMenuItems } from "@/lib/final-menu-items";
import type { MenuItem } from "@/lib/menu-types";
import { getPrimaryStore } from "@/lib/stores";

export type { MenuItem } from "@/lib/menu-types";

const blockedDevelopmentCopy = ["sam" + "ple", "place" + "holder", "tb" + "c", "replace before " + "launch"];

function containsDevelopmentCopy(value: unknown) {
  return typeof value === "string" && blockedDevelopmentCopy.some((word) => value.toLowerCase().includes(word));
}

function hasDevelopmentMenuCopy(items: MenuItem[]) {
  return items.some((item) =>
    [
      item.id,
      item.name_en,
      item.name_zh,
      item.description_en,
      item.description_zh,
      item.menu_categories?.name_en,
      item.menu_categories?.name_zh
    ].some(containsDevelopmentCopy)
  );
}

export async function getMenuItems({ featuredOnly = false } = {}) {
  const fallbackItems = featuredOnly ? finalMenuItems.filter((item) => item.is_featured) : finalMenuItems;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("Menu database configuration is missing.");
    console.error("[QYJ_MENU_FALLBACK_ACTIVE] Supabase is not configured; using development menu data.");
    return fallbackItems;
  }

  const supabase = createClient();
  const primaryStore = await getPrimaryStore();
  if (!primaryStore) {
    if (process.env.NODE_ENV === "production") throw new Error("No primary outlet is configured for the public menu.");
    console.error("[QYJ_MENU_FALLBACK_ACTIVE] No primary outlet is configured; using development menu data.");
    return fallbackItems;
  }
  let query = supabase
    .from("menu_items")
    .select("id, regular_price, member_price, is_featured, availability_status, online_ordering_enabled, products!inner(name_en, name_zh, description_en, description_zh, status, is_signature, product_images(image_url, is_primary, display_order, status), product_categories(name_en, name_zh)), menus!inner(status)")
    .eq("status", "active")
    .eq("menus.status", "active")
    .eq("menus.store_id", primaryStore.id)
    .eq("products.status", "active")
    .neq("availability_status", "unavailable")
    .order("display_order", { ascending: true });

  if (featuredOnly) query = query.eq("is_featured", true);

  const { data, error } = await query;
  if (error) {
    if (process.env.NODE_ENV === "production") throw new Error(`Menu database query failed: ${error.message}`);
    console.error(`[QYJ_MENU_FALLBACK_ACTIVE] Menu query failed: ${error.message}`);
    return fallbackItems;
  }
  if (!data?.length) return [];

  const items = data.map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const images = Array.isArray(product?.product_images) ? product.product_images : product?.product_images ? [product.product_images] : [];
    const image = images.filter((candidate: any) => candidate.status === "active").sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)[0];
    const category = Array.isArray(product?.product_categories) ? product.product_categories[0] : product?.product_categories;
    return {
      id: item.id,
      name_en: product?.name_en ?? "Unnamed item",
      name_zh: product?.name_zh ?? product?.name_en ?? "未命名饮品",
      description_en: product?.description_en ?? null,
      description_zh: product?.description_zh ?? null,
      regular_price: item.regular_price,
      member_price: item.member_price,
      image_url: image?.image_url ?? null,
      is_featured: item.is_featured,
      is_signature: Boolean(product?.is_signature),
      availability_status: item.availability_status,
      online_ordering_enabled: Boolean(item.online_ordering_enabled),
      menu_categories: category ?? null
    };
  });

  if (hasDevelopmentMenuCopy(items)) {
    if (process.env.NODE_ENV === "production") throw new Error("Menu database contains blocked development copy.");
    console.error("[QYJ_MENU_FALLBACK_ACTIVE] Blocked development copy was found in the database menu.");
    return fallbackItems;
  }
  return items;
}
