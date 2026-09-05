import { addProductToMenu, createOutletMenu, saveMenuItem } from "@/app/[locale]/admin/menu/actions";

export function OutletMenuEditor({ brandId, locale, menu, products, storeId }: { brandId: string; locale: string; menu: any; products: any[]; storeId: string }) {
  if (!menu) return <form action={createOutletMenu} className="bg-white p-8 shadow-soft"><input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="storeId" type="hidden" value={storeId} /><p>No outlet menu exists yet.</p><button className="mt-5 min-h-12 bg-forest px-6 font-bold text-white" type="submit">Create public menu</button></form>;
  const existing = new Set((menu.menu_items ?? []).map((item: any) => item.product_id));
  return <div className="grid gap-5">
    <form action={addProductToMenu} className="flex flex-col gap-3 bg-white p-5 sm:flex-row">
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="storeId" type="hidden" value={storeId} /><input name="menuId" type="hidden" value={menu.id} />
      <select className="min-h-12 flex-1 border border-forest/15 px-4" name="productId" required><option value="">Select product</option>{products.filter((product) => !existing.has(product.id) && product.status !== "archived").map((product) => <option key={product.id} value={product.id}>{product.name_en}</option>)}</select>
      <button className="min-h-12 bg-forest px-6 font-bold text-white" type="submit">Add to menu</button>
    </form>
    {(menu.menu_items ?? []).sort((a: any, b: any) => a.display_order - b.display_order).map((item: any) => <form action={saveMenuItem} className="grid gap-4 bg-white p-5 shadow-soft lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))_auto] lg:items-end" key={item.id}>
      <input name="locale" type="hidden" value={locale} /><input name="brandId" type="hidden" value={brandId} /><input name="storeId" type="hidden" value={storeId} /><input name="menuId" type="hidden" value={menu.id} /><input name="menuItemId" type="hidden" value={item.id} />
      <strong className="font-serif text-2xl text-forest">{item.products?.name_en}</strong>
      <label className="text-xs">Regular<input className="mt-2 min-h-11 w-full border px-2" name="regularPrice" type="number" min="0" step="0.01" defaultValue={item.regular_price ?? ""} /></label>
      <label className="text-xs">Member<input className="mt-2 min-h-11 w-full border px-2" name="memberPrice" type="number" min="0" step="0.01" defaultValue={item.member_price ?? ""} /></label>
      <label className="text-xs">Order<input className="mt-2 min-h-11 w-full border px-2" name="displayOrder" type="number" defaultValue={item.display_order} /></label>
      <label className="text-xs">Availability<select className="mt-2 min-h-11 w-full border px-2" name="availabilityStatus" defaultValue={item.availability_status}><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="coming_soon">Coming soon</option></select></label>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input name="isFeatured" type="checkbox" defaultChecked={item.is_featured} /> Featured</label>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input name="onlineOrderingEnabled" type="checkbox" defaultChecked={item.online_ordering_enabled} /> Online</label>
      <button className="min-h-11 bg-forest px-4 font-bold text-white" type="submit">Save</button>
    </form>)}
  </div>;
}
