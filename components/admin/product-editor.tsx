import { changeProductLifecycle, saveProduct } from "@/app/[locale]/admin/menu/actions";

const field = "mt-2 min-h-12 w-full border border-forest/15 px-4";
export function ProductEditor({ brandId, categories, locale, product }: { brandId: string; categories: any[]; locale: string; product?: any }) {
  return <div className="grid gap-6">
    <form action={saveProduct} className="grid gap-5 bg-white p-6 shadow-soft md:grid-cols-2">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="id" type="hidden" value={product?.id ?? ""} />
      <label>SKU<input className={field} name="sku" required defaultValue={product?.sku ?? ""} /></label>
      <label>Category<select className={field} name="categoryId" defaultValue={product?.category_id ?? ""}><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_en}</option>)}</select></label>
      <label>English name<input className={field} name="nameEn" required defaultValue={product?.name_en ?? ""} /></label>
      <label>Chinese name<input className={field} name="nameZh" defaultValue={product?.name_zh ?? ""} /></label>
      <label className="md:col-span-2">English description<textarea className={`${field} min-h-28 py-3`} name="descriptionEn" defaultValue={product?.description_en ?? ""} /></label>
      <label className="md:col-span-2">Chinese description<textarea className={`${field} min-h-28 py-3`} name="descriptionZh" defaultValue={product?.description_zh ?? ""} /></label>
      <label className="flex items-center gap-3"><input name="isSignature" type="checkbox" defaultChecked={product?.is_signature ?? false} /> Signature product</label>
      <button className="min-h-12 bg-forest px-6 font-bold text-white md:col-span-2" type="submit">Save product</button>
    </form>
    {product && <form action={changeProductLifecycle} className="flex flex-wrap gap-3 bg-white p-6">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="productId" type="hidden" value={product.id} />
      {product.status === "archived" ? <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="restore">Restore as inactive</button> : <>
        <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="active">Activate</button>
        <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="inactive">Deactivate</button>
        <button className="min-h-11 bg-ink px-5 font-bold text-white" name="lifecycle" value="archived">Archive</button>
      </>}
    </form>}
  </div>;
}
