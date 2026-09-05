import Link from "next/link";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/data";
import { getAdminStores } from "@/lib/stores";

export default async function StoresAdminPage({ params }: { params: { locale: string } }) {
  await requireAdmin(params.locale);
  const stores = await getAdminStores();
  return <main className="min-h-screen bg-paper px-5 py-12"><div className="mx-auto max-w-7xl">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">QYJ Admin</p><h1 className="mt-3 font-serif text-5xl text-forest">Stores</h1>
    <AdminNavigation locale={params.locale as "en" | "zh"} />
    <div className="mt-8 grid gap-4">{stores.map((store) => <Link className="bg-white p-6 shadow-soft" href={`/${params.locale}/admin/stores/${store.id}`} key={store.id}>
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-serif text-3xl text-forest">{store.name}</h2><p className="mt-2 text-sm text-forest/60">{store.store_code} · /{store.public_slug}</p></div>{store.is_primary && <span className="bg-gold px-3 py-2 text-xs font-bold uppercase">Primary</span>}</div>
    </Link>)}</div>
  </div></main>;
}
