import { notFound } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { OperatingHoursEditor } from "@/components/admin/operating-hours-editor";
import { StoreIdentityEditor, StoreOperationsEditor } from "@/components/admin/store-editor";
import { HoursExceptionsEditor } from "@/components/admin/hours-exceptions-editor";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function StoreAdminPage({ params, searchParams }: { params: { locale: string; id: string }; searchParams: { saved?: string; error?: string } }) {
  await requireAdmin(params.locale);
  const supabase = createClient();
  const { data: store } = await supabase.from("stores").select("*, store_operating_hours(*), store_hours_exceptions(*)").eq("id", params.id).is("deleted_at", null).maybeSingle();
  if (!store) notFound();
  const [canIdentity, canOperations] = await Promise.all([
    hasAdminPermission("store.identity.manage", { brandId: store.brand_id, storeId: store.id }),
    hasAdminPermission("store.operations.manage", { brandId: store.brand_id, storeId: store.id })
  ]);
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Store Admin</p><h1 className="mt-3 font-serif text-5xl text-forest">{store.name}</h1>
    <AdminNavigation locale={params.locale as "en" | "zh"} />
    {searchParams.saved && <p className="mt-6 bg-forest px-5 py-4 font-bold text-white">Store settings updated successfully.</p>}
    {searchParams.error && <p className="mt-6 bg-red-50 px-5 py-4 font-bold text-red-800">{searchParams.error}</p>}
    <div className="mt-8 grid gap-8"><StoreIdentityEditor canEdit={canIdentity} locale={params.locale} store={store} /><StoreOperationsEditor canEdit={canOperations} locale={params.locale} store={store} /><OperatingHoursEditor canEdit={canOperations} hours={store.store_operating_hours ?? []} locale={params.locale} storeId={store.id} /><HoursExceptionsEditor canEdit={canOperations} exceptions={store.store_hours_exceptions ?? []} locale={params.locale} storeId={store.id} /></div>
  </div></main>;
}
