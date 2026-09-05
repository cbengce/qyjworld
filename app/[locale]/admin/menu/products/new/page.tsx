import { AdminNavigation } from "@/components/admin/admin-navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage({ params, searchParams }: { params: { locale: string }; searchParams: { brand?: string } }) {
  if (!searchParams.brand) throw new Error("A brand is required."); await requireAdminPermission(params.locale, "menu.manage", { brandId: searchParams.brand });
  const supabase = createClient(); const { data: categories } = await supabase.from("product_categories").select("id, name_en").eq("brand_id", searchParams.brand).eq("status", "active").order("display_order");
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-5xl"><h1 className="font-serif text-5xl text-forest">Add product</h1><AdminNavigation locale={params.locale as "en" | "zh"} /><div className="mt-8"><ProductEditor brandId={searchParams.brand} categories={categories ?? []} locale={params.locale} /></div></div></main>;
}
