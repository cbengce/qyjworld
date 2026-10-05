import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/constants";
import { getMenuItems } from "@/lib/menu";
import { getPrimaryStore } from "@/lib/stores";
import { storeAddressLines, storeDirectionsUrl } from "@/lib/store-types";

export async function CurrentTeaSelection({ locale, showMenu, showStore }: { locale: Locale; showMenu?: boolean; showStore?: boolean }) {
  const zh = locale === "zh";
  const [menu, store] = await Promise.all([showMenu ? getMenuItems() : Promise.resolve([]), showStore ? getPrimaryStore() : Promise.resolve(null)]);
  const selection = menu.filter(item => item.availability_status === "available").slice(0, 4);
  return <div className="mt-12 grid gap-8">
    {showMenu && <section aria-labelledby="current-tea-title" className="rounded-2xl bg-[#edf3e7] p-6">
      <h2 id="current-tea-title" className="font-serif text-3xl text-forest">{zh ? "从现行菜单选一杯" : "Choose from the current menu"}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{selection.map(item => <Link key={item.id} href={`/${locale}/menu/${encodeURIComponent(item.id)}`} className="flex items-center gap-4 rounded-xl bg-white p-4">
        {item.image_url && <div className="relative h-24 w-20 shrink-0"><Image src={item.image_url} alt={zh ? item.name_zh || item.name_en : item.name_en} fill sizes="80px" unoptimized={item.image_url.startsWith("http")} className="object-contain" /></div>}
        <div><h3 className="font-serif text-2xl text-forest">{zh ? item.name_zh || item.name_en : item.name_en}</h3><p className="mt-2 text-sm text-forest/65">{zh ? "价格区间见完整菜单" : "See the full menu for price ranges"}</p><span className="mt-2 block text-sm font-bold text-forest">{zh ? "茶品详情 →" : "Drink details →"}</span></div>
      </Link>)}</div>
      <Link className="mt-6 inline-block font-bold text-forest underline" href={`/${locale}/menu`}>{zh ? "查看完整菜单" : "View the full menu"}</Link>
    </section>}
    {store && <section className="rounded-2xl border border-forest/10 p-6"><h2 className="font-serif text-3xl text-forest">{zh ? "到店资料" : "Plan your visit"}</h2><p className="mt-4 font-semibold">{store.name}</p><address className="mt-2 not-italic text-forest/70">{storeAddressLines(store).join(", ")}</address><div className="mt-4 flex flex-wrap gap-6 font-bold text-forest underline"><Link href={`/${locale}/contact`}>{zh ? "营业信息与到店指南" : "Opening information & visit details"}</Link><a href={storeDirectionsUrl(store)}>{zh ? "查看地图" : "Get directions"}</a></div></section>}
  </div>;
}
