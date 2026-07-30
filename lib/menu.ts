import { createClient } from "@/lib/supabase/server";
import { finalMenuItems } from "@/lib/final-menu-items";
import type { MenuItem } from "@/lib/menu-types";

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
    return fallbackItems;
  }

  const supabase = createClient();
  let query = supabase
    .from("menu_items")
    .select("id, regular_price, member_price, is_featured, products(name_en, name_zh, description_en, description_zh, product_images(image_url), product_categories(name_en, name_zh)), menus!inner(status)")
    .eq("status", "active")
    .eq("menus.status", "active")
    .order("display_order", { ascending: true });

  if (featuredOnly) query = query.eq("is_featured", true);

  const { data, error } = await query;
  if (error || !data?.length) return fallbackItems;

  const items = data.map((item: any) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const image = Array.isArray(product?.product_images) ? product.product_images[0] : product?.product_images;
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
      menu_categories: category ?? null
    };
  });

  return hasDevelopmentMenuCopy(items) ? fallbackItems : items;
}
