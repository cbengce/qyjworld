import { saveCategory } from "@/app/[locale]/admin/menu/actions";

export function CategoryEditor({ brandId, category, locale }: { brandId: string; category?: any; locale: string }) {
  return <form action={saveCategory} className="grid gap-3 border-b border-forest/10 bg-white p-5 md:grid-cols-[1fr_1fr_7rem_auto]">
    <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="id" type="hidden" value={category?.id ?? ""} />
    <input aria-label="English category name" className="min-h-11 border border-forest/15 px-3" name="nameEn" placeholder="English name" required defaultValue={category?.name_en ?? ""} />
    <input aria-label="Chinese category name" className="min-h-11 border border-forest/15 px-3" name="nameZh" placeholder="Chinese name" defaultValue={category?.name_zh ?? ""} />
    <input aria-label="Display order" className="min-h-11 border border-forest/15 px-3" name="displayOrder" type="number" defaultValue={category?.display_order ?? 0} />
    <button className="min-h-11 bg-forest px-5 font-bold text-white" type="submit">{category ? "Save" : "Add category"}</button>
  </form>;
}
