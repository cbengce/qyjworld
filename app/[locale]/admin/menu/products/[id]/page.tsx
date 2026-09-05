import { notFound } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";

export default async function EditProductPage({ params, searchParams }: { params: { locale: string; id: string }; searchParams: { saved?: string } }) {
  const supabase = createClient(); const { data: product } = await supabase.from("products").select("*, product_images(*)").eq("id", params.id).is("deleted_at", null).maybeSingle(); if (!product) notFound();
  await requireAdminPermission(params.locale, "menu.manage", { brandId: product.brand_id });
  const { data: categories } = await supabase.from("product_categories").select("id, name_en").eq("brand_id", product.brand_id).eq("status", "active").order("display_order");
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-5xl"><h1 className="font-serif text-5xl text-forest">{product.name_en}</h1><AdminNavigation locale={params.locale as "en" | "zh"} />{searchParams.saved && <p className="mt-6 bg-forest p-4 font-bold text-white">Product updated successfully.</p>}<div className="mt-8 grid gap-8"><ProductEditor brandId={product.brand_id} categories={categories ?? []} locale={params.locale} product={product} /><ProductImageManager brandId={product.brand_id} images={(product.product_images ?? []).filter((image: any) => image.status === "active")} locale={params.locale} productId={product.id} /></div></div></main>;
}
