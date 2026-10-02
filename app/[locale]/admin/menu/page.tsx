import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { MenuCatalogueRecovery } from "@/components/admin/menu-catalogue-recovery";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function MenuAdminPage({ params, searchParams }: { params: { locale: string }; searchParams: { archived?: string } }) {
  await requireAdmin(params.locale);
  const supabase = createClient();
  const showArchived = searchParams.archived === "1";
  const [brandsResult, storesResult, productsResult] = await Promise.all([
    supabase.from("brands").select("id, name_en").eq("status", "active").limit(1),
    supabase.from("stores").select("id, name, brand_id, is_primary").is("deleted_at", null).order("name"),
    supabase.from("products").select("id, brand_id, sku, name_en, name_zh, status, is_signature, archived_at, product_categories(name_en)").in("status", showArchived ? ["archived"] : ["active", "inactive"]).is("deleted_at", null).order("name_en")
  ]);
  const { data: brands } = brandsResult;
  const { data: stores } = storesResult;
  const queryError = brandsResult.error || storesResult.error || productsResult.error;
  const primaryStore = stores?.find((store) => store.is_primary);
  let needsImport = false;
  if (!queryError && primaryStore && !showArchived) {
    const { count, error } = await createServiceClient().from("menu_items").select("id, menus!inner(store_id)", { count: "exact", head: true }).eq("menus.store_id", primaryStore.id);
    if (error) throw new Error("Menu setup status could not be checked. Please reload the page.");
    needsImport = count === 0;
  }
  const brand = brands?.[0]; const products = productsResult.data ?? [];
  const activeProducts = products.filter((product) => product.status === "active");
  const inactiveProducts = products.filter((product) => product.status === "inactive");
  const productList = (items: typeof products) => <div className="mt-4 grid gap-3">{items.map((product: any) => <Link className="flex items-center justify-between bg-white p-5 shadow-soft" href={`/${params.locale}/admin/menu/products/${product.id}`} key={product.id}><span><strong>{product.name_en}</strong><span className="ml-3 text-sm text-forest/50">{product.sku}</span></span>{product.is_signature && <span className="text-xs font-bold uppercase text-gold">Signature</span>}</Link>)}</div>;
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">QYJ Admin</p><h1 className="mt-3 font-serif text-5xl text-forest">Menu CMS</h1><AdminNavigation locale={params.locale as "en" | "zh"} />
    <p className="mt-6 text-forest/70">Manage drinks and images here. Open an outlet below to edit regular and member prices, display order and availability.</p>
    {queryError && <p className="mt-6 rounded-xl bg-white p-5 text-red-700" role="alert">The catalogue could not be loaded. Please reload or check database permissions; an empty list does not mean your products were deleted.</p>}
    {needsImport && <MenuCatalogueRecovery locale={params.locale} />}
    <div className="mt-8 flex flex-wrap gap-3"><Link className="bg-forest px-5 py-3 font-bold text-white" href={`/${params.locale}/admin/menu/categories`}>Categories</Link>{brand && <Link className="bg-forest px-5 py-3 font-bold text-white" href={`/${params.locale}/admin/menu/products/new?brand=${brand.id}`}>Add product</Link>}<Link className="border border-forest px-5 py-3 font-bold text-forest" href={`/${params.locale}/admin/menu?archived=${showArchived ? "0" : "1"}`}>{showArchived ? "Show current" : "Show archived"}</Link></div>
    <section className="mt-8"><h2 className="font-serif text-3xl text-forest">Outlet menus</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{(stores ?? []).map((store) => <Link className="bg-white p-5 shadow-soft" href={`/${params.locale}/admin/menu/outlets/${store.id}`} key={store.id}>{store.name}{store.is_primary ? " · Primary" : ""}</Link>)}</div></section>
    {showArchived ? <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Archived products</h2>{productList(products)}</section> : <>
      <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Active products</h2>{productList(activeProducts)}{!activeProducts.length && !queryError && <p className="mt-4 text-forest/70">No active products yet. The original catalogue setup appears above when this outlet has never been configured. You can also choose Add product.</p>}</section>
      <section className="mt-10"><h2 className="font-serif text-3xl text-forest">Inactive products</h2>{productList(inactiveProducts)}{!inactiveProducts.length && !queryError && <p className="mt-4 text-forest/70">No inactive products.</p>}</section>
    </>}
  </div></main>;
}
