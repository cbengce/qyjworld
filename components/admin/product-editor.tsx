import { changeProductLifecycle, saveProduct } from "@/app/[locale]/admin/menu/actions";

import Link from "next/link";

const field = "mt-2 min-h-12 w-full border border-forest/15 px-4";
export function ProductEditor({ brandId, categories, locale, product }: { brandId: string; categories: any[]; locale: string; product?: any }) {
  const zh = locale === "zh";
  const text = (en: string, cn: string) => zh ? cn : en;
  const missing = product ? [!product.name_zh?.trim() && text("Chinese name", "中文名称"), !product.description_en?.trim() && text("English description", "英文介绍"), !product.description_zh?.trim() && text("Chinese description", "中文介绍")].filter(Boolean) : [];
  return <div className="grid gap-6">
    <section className="rounded-2xl bg-white p-6"><h2 className="font-serif text-2xl">{text("Product publication checklist", "茶品上架资料检查")}</h2><p className="mt-3">{missing.length ? text("Still to complete: ", "待补资料：") + missing.join("、") : text("Review the product facts before saving.", "保存前请核对真实茶品资料。")}</p><p className="mt-3 text-sm leading-6">{text("In each description, record the approved serving size, tea base, main ingredients and available options. Include allergen information only from the current verified recipe. Images and descriptions should match the drink served.", "请在中英文介绍中记录已确认的容量、茶底、主要原料及可选调整。过敏原资料须依据当前确认配方；照片与介绍应对应实际供应茶品。")}</p><Link href={`/${locale}/admin/menu`} className="mt-4 inline-block underline">{text("Manage outlet prices and availability →", "进入门店菜单核对价格与供应状态 →")}</Link><p className="mt-2 text-xs">{text("Prices and availability belong to the outlet menu, not this shared product record.", "价格和供应状态在各门店菜单管理，不在共用产品记录中硬编码。")}</p></section>
    <form action={saveProduct} className="grid gap-5 bg-white p-6 shadow-soft md:grid-cols-2">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="id" type="hidden" value={product?.id ?? ""} />
      <label>SKU<input className={field} name="sku" required defaultValue={product?.sku ?? ""} /></label>
      <label>{text("Category", "分类")}<select className={field} name="categoryId" defaultValue={product?.category_id ?? ""}><option value="">{text("Uncategorised", "未分类")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_en}</option>)}</select></label>
      <label>{text("English name", "英文名称")}<input className={field} name="nameEn" required defaultValue={product?.name_en ?? ""} /></label>
      <label>{text("Chinese name", "中文名称")}<input className={field} name="nameZh" defaultValue={product?.name_zh ?? ""} /></label>
      <label className="md:col-span-2">{text("English description", "英文介绍")}<textarea className={`${field} min-h-28 py-3`} name="descriptionEn" defaultValue={product?.description_en ?? ""} /></label>
      <label className="md:col-span-2">{text("Chinese description", "中文介绍")}<textarea className={`${field} min-h-28 py-3`} name="descriptionZh" defaultValue={product?.description_zh ?? ""} /></label>
      <label className="flex items-center gap-3"><input name="isSignature" type="checkbox" defaultChecked={product?.is_signature ?? false} /> {text("Signature product", "招牌茶品")}</label>
      <button className="min-h-12 bg-forest px-6 font-bold text-white md:col-span-2" type="submit">{text("Save product", "保存茶品")}</button>
    </form>
    {product && <form action={changeProductLifecycle} className="flex flex-wrap gap-3 bg-white p-6">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="productId" type="hidden" value={product.id} />
      {product.status === "archived" ? <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="restore">{text("Restore as inactive", "恢复为未启用")}</button> : <>
        <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="active">{text("Activate", "启用")}</button>
        <button className="min-h-11 border border-forest px-5 font-bold text-forest" name="lifecycle" value="inactive">{text("Deactivate", "停用")}</button>
        <button className="min-h-11 bg-ink px-5 font-bold text-white" name="lifecycle" value="archived">{text("Archive", "归档")}</button>
      </>}
    </form>}
  </div>;
}
