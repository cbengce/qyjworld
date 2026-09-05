import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function MenuAdminPage({ params, searchParams }: { params: { locale: string }; searchParams: { archived?: string } }) {
  await requireAdmin(params.locale);
  const supabase = createClient();
  const showArchived = searchParams.archived === "1";
  const [{ data: brands }, { data: stores }, productsResult] = await Promise.all([
    supabase.from("brands").select("id, name_en").eq("status", "active").limit(1),
    supabase.from("stores").select("id, name, brand_id, is_primary").is("deleted_at", null).order("name"),
    supabase.from("products").select("id, brand_id, sku, name_en, name_zh, status, is_signature, archived_at, product_categories(name_en)").in("status", showArchived ? ["archived"] : ["active", "inactive"]).is("deleted_at", null).order("name_en")
  ]);
  const brand = brands?.[0]; const products = productsResult.data ?? [];
  const activeProducts = products.filter((product) => product.status === "active");
  const inactiveProducts = products.filter((product) => product.status === "inactive");
  const productList = (items: typeof products) => <div className="mt-4 grid gap-3">{items.map((product: any) => <Link className="flex items-center justify-between bg-white p-5 shadow-soft" href={`/${params.locale}/admin/menu/products/${product.id}`} key={product.id}><span><strong>{product.name_en}</strong><span className="ml-3 text-sm text-forest/50">{product.sku}</span></span>{product.is_signature && <span className="text-xs font-bold uppercase text-gold">Signature</span>}</Link>)}</div>;
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">QYJ Admin</p><h1 className="mt-3 font-serif text-5xl text-forest">Menu CMS</h1><AdminNavigation locale={params.locale as "en" | "zh"} />
    <div className="mt-8 flex flex-wrap gap-3"><Link className="bg-forest px-5 py-3 font-bold text-white" href={`/${params.locale}/admin/menu/categories`}>Categories</Link>{brand && <Link className="bg-forest px-5 py-3 font-bold text-white" href={`/${params.locale}/admin/menu/products/new?brand=${brand.id}`}>Add product</Link>}<Link className="border border-forest px-5 py-3 font-bold text-forest" href={`/${params.locale}/admin/menu?archived=${showArchived ? "0" : "1"}`}>{showArchived ? "Show current" : "Show archived"}</Link></div>
    <section className="mt-8"><h2 className="font-serif text-3xl text-forest">Outlet menus</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{(stores ?? []).map((store) => <Link className="bg-white p-5 shadow-soft" href={`/${params.locale}/admin/menu/outlets/${store.id}`} key={store.id}>{store.name}{store.is_primary ? " · Primary" : ""}</Link>)}</div></section>
    {showArchived ? <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Archived products</h2>{productList(products)}</section> : <>
      <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Active products</h2>{productList(activeProducts)}</section>
      <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Inactive products</h2>{productList(inactiveProducts)}</section>
    </>}
  </div></main>;
}
