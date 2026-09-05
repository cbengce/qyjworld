import { AdminNavigation } from "@/components/admin/admin-navigation";
import { CategoryEditor } from "@/components/admin/category-editor";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage({ params }: { params: { locale: string } }) {
  const supabase = createClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([supabase.from("brands").select("id").eq("status", "active").limit(1), supabase.from("product_categories").select("*").is("deleted_at", null).order("display_order")]);
  const brandId = brands?.[0]?.id; if (!brandId) throw new Error("No active brand is configured.");
  await requireAdminPermission(params.locale, "menu.manage", { brandId });
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl"><h1 className="font-serif text-5xl text-forest">Categories</h1><AdminNavigation locale={params.locale as "en" | "zh"} /><div className="mt-8"><CategoryEditor brandId={brandId} locale={params.locale} />{(categories ?? []).map((category) => <CategoryEditor brandId={brandId} category={category} key={category.id} locale={params.locale} />)}</div></div></main>;
}
