import { notFound } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { OutletMenuEditor } from "@/components/admin/outlet-menu-editor";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { createClient } from "@/lib/supabase/server";

export default async function OutletMenuPage({ params, searchParams }: { params: { locale: string; storeId: string }; searchParams: { saved?: string } }) {
  const supabase = createClient(); const { data: store } = await supabase.from("stores").select("id, brand_id, name").eq("id", params.storeId).is("deleted_at", null).maybeSingle(); if (!store) notFound();
  await requireAdminPermission(params.locale, "menu.manage", { brandId: store.brand_id, storeId: store.id });
  const [{ data: menus }, { data: products }] = await Promise.all([
    supabase.from("menus").select("id, name, status, menu_items(*, products(name_en))").eq("store_id", store.id).eq("status", "active").is("deleted_at", null).limit(1),
    supabase.from("products").select("id, name_en, status").eq("brand_id", store.brand_id).is("deleted_at", null).order("name_en")
  ]);
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Outlet menu</p><h1 className="mt-3 font-serif text-5xl text-forest">{store.name}</h1><AdminNavigation locale={params.locale as "en" | "zh"} />{searchParams.saved && <p className="mt-6 bg-forest p-4 font-bold text-white">Menu updated successfully.</p>}<div className="mt-8"><OutletMenuEditor brandId={store.brand_id} locale={params.locale} menu={menus?.[0] ?? null} products={products ?? []} storeId={store.id} /></div></div></main>;
}
