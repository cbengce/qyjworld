import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { InventoryForm } from "@/components/admin/inventory-form";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { readInventoryTable } from "@/lib/inventory/admin";
import type { InventoryMaterial, InventoryLocation, InventoryBalance, InventoryMovement, InventoryMaterialUnit, InventoryReorderSetting } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";
const input = "mt-1 block w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-forest">{label}{children}</label>;
}
function Quantity({ name = "quantity", initial, required = true }: { name?: string; initial?: string; required?: boolean }) {
  return <input className={input} name={name} type="text" inputMode="decimal" required={required} defaultValue={initial} pattern="(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,6})?" maxLength={21} />;
}

export default async function InventoryAdminPage({ params }: { params: { locale: string } }) {
  const locale = params.locale === "zh" ? "zh" : "en";
  const zh = locale === "zh";
  await requireAdmin(locale);
  const db = createClient();
  let ready = false;
  let materials: InventoryMaterial[] = [], locations: InventoryLocation[] = [], balances: InventoryBalance[] = [];
  let movements: InventoryMovement[] = [], units: InventoryMaterialUnit[] = [], settings: InventoryReorderSetting[] = [];
  let brands: { id: string; name_en: string }[] = [];
  let stores: { id: string; name: string; brand_id: string }[] = [];
  const manageable: string[] = [], postable: string[] = [];
  try {
    const results = await Promise.all([
      readInventoryTable("inventory_materials"), readInventoryTable("inventory_locations"),
      readInventoryTable("inventory_balances", "brand_id,location_id,material_id,quantity::text,updated_at", "location_id"),
      readInventoryTable("inventory_material_units", "id,brand_id,material_id,unit_label,base_quantity::text,active,created_at,updated_at"),
      readInventoryTable("inventory_reorder_settings", "brand_id,location_id,material_id,minimum_quantity::text,lead_time_days,updated_at", "location_id")
    ]);
    [materials, locations, balances, units, settings] = results as unknown as [InventoryMaterial[], InventoryLocation[], InventoryBalance[], InventoryMaterialUnit[], InventoryReorderSetting[]];
    const { data: history, error } = await db.from("inventory_movements")
      .select("id,brand_id,location_id,material_id,movement_kind,quantity_delta::text,base_unit,reason,idempotency_key,actor_user_id,occurred_at,created_at")
      .order("created_at", { ascending: false }).order("id").limit(50);
    if (error) throw error;
    movements = history as unknown as InventoryMovement[];
    const { data: brandRows, error: brandError } = await db.from("brands").select("id,name_en").eq("status", "active").is("deleted_at", null).order("id").limit(500);
    if (brandError) throw brandError;
    for (const brand of brandRows ?? []) {
      const { data, error: permissionError } = await db.rpc("inventory_has_permission", { p_permission: "inventory.manage", p_brand_id: brand.id });
      if (permissionError) throw permissionError;
      if (data === true) { brands.push(brand); manageable.push(brand.id); }
    }
    const { data: storeRows, error: storeError } = await db.from("stores").select("id,name,brand_id").eq("status", "active").is("deleted_at", null).order("id").limit(1000);
    if (storeError) throw storeError;
    if ((brandRows?.length ?? 0) >= 500 || (storeRows?.length ?? 0) >= 1000) throw new Error("Inventory identity result limit reached");
    stores = storeRows ?? [];
    for (const location of locations.filter(l => l.active)) {
      const { data, error: permissionError } = await db.rpc("inventory_can_access_location", { p_permission: "inventory.post", p_location_id: location.id });
      if (permissionError) throw permissionError;
      if (data === true) postable.push(location.id);
    }
    ready = true;
  } catch { ready = false; }
  const materialName = (id: string) => materials.find(m => m.id === id)?.name ?? id;
  const locationName = (id: string) => locations.find(l => l.id === id)?.name ?? id;
  const materialSelect = <select className={input} name="materialId" required defaultValue=""><option value="" disabled>{zh ? "选择物料" : "Choose material"}</option>{materials.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name} ({m.base_unit})</option>)}</select>;
  const locationSelect = <select className={input} name="locationId" required defaultValue=""><option value="" disabled>{zh ? "选择位置" : "Choose location"}</option>{locations.filter(l => l.active && postable.includes(l.id)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>;
  const brandSelect = <select className={input} name="brandId" required defaultValue=""><option value="" disabled>{zh ? "选择品牌" : "Choose brand"}</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name_en}</option>)}</select>;
  const reason = <Field label={zh ? "原因／单据参考" : "Reason / document reference"}><input className={input} name="reason" required maxLength={200} /></Field>;
  const form = (operation: string, children: React.ReactNode) => <InventoryForm locale={locale} operation={operation} initialKey={randomUUID()}>{children}</InventoryForm>;
  const box = "rounded-xl bg-white p-5 shadow-soft";
  const kinds: Record<string, string> = zh ? { opening: "期初盘点", receipt: "收货入库", consumption: "日常耗用", wastage: "损耗", issue: "领用出库", adjustment: "盘点调整" } : { opening: "Opening count", receipt: "Receipt", consumption: "Consumption", wastage: "Wastage", issue: "Issue", adjustment: "Stocktake adjustment" };
  return <main className="min-h-screen bg-paper px-5 py-10"><div className="mx-auto max-w-7xl">
    <h1 className="font-serif text-4xl text-forest">{zh ? "物料与库存" : "Materials & inventory"}</h1>
    <AdminNavigation locale={locale} />
    <Link className="my-5 inline-block rounded-full bg-forest px-5 py-3 text-white" href={`/${locale}/admin/inventory/purchasing`}>{zh ? "供应商与采购" : "Suppliers & purchasing"}</Link>
    {!ready ? <p role="alert" className={`${box} mt-6`}>{zh ? "库存尚未启用或暂时无法读取。没有显示估算库存；请联系管理员完成数据库配置。" : "Inventory is not enabled or cannot be read. No estimated balances are shown. Ask the administrator to check database configuration."}</p> : <>
      <p className="my-6 text-sm text-forest/80">{zh ? "以下为手动记录的库存，尚未启用POS自动扣料。空白表示尚未建档，不代表已完成盘点。" : "These are manually recorded quantities. Automatic POS deductions are not enabled. Missing records mean not yet entered, not a completed stocktake."}</p>
      {!brands.length && !locations.length && <p role="status" className={`${box} mb-6`}>{zh ? "当前账号没有可访问的库存位置；请由管理员核对库存权限与位置配置。" : "This account has no accessible inventory locations. Ask the administrator to check inventory permissions and location setup."}</p>}
      <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "库存与盘点" : "Stock & counts"}</h2>
        {!balances.length && <p>{zh ? "尚未录入库存。先建立物料和位置，再录入期初数量。" : "No stock entered. Create materials and locations, then enter opening quantities."}</p>}
        <div className="grid gap-4 md:grid-cols-2">{balances.map(b => {
          const material = materials.find(m => m.id === b.material_id);
          const setting = settings.find(s => s.location_id === b.location_id && s.material_id === b.material_id);
          return <article key={`${b.location_id}-${b.material_id}`} className="rounded-lg border border-forest/15 p-4">
            <h3 className="font-bold">{materialName(b.material_id)} · {locationName(b.location_id)}</h3>
            <p className="my-2 text-lg">{b.quantity} {material?.base_unit}</p>
            {setting && <p className="mb-2 text-sm">{zh ? "补货门槛／提前期" : "Reorder threshold / lead time"}: {setting.minimum_quantity} {material?.base_unit} / {setting.lead_time_days} {zh ? "天" : "days"}</p>}
            {postable.includes(b.location_id) && material?.active && <details><summary className="cursor-pointer text-sm font-bold">{zh ? "录入实际盘点数量" : "Enter physical count"}</summary><div className="mt-3">{form("stocktake", <>
              <input type="hidden" name="locationId" value={b.location_id} /><input type="hidden" name="materialId" value={b.material_id} /><input type="hidden" name="expected" value={b.quantity} />
              <Field label={zh ? "实际剩余（基本单位）" : "Actual remaining (base unit)"}><Quantity name="counted" /></Field>{reason}
            </>)}</div></details>}
          </article>;
        })}</div>
      </section>
      <div className="my-6 grid gap-6 lg:grid-cols-2">
        {postable.length > 0 && <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "期初／收货／耗用／损耗" : "Opening / receipts / usage / wastage"}</h2>
          <p className="mb-4 text-sm">{zh ? "数量使用物料的基本单位（个、g、ml），填正数。领用出库不是分店调拨；调拨流程另行接入。" : "Enter positive quantities in the material's base unit (each, g, ml). An issue is not an inter-store transfer; dispatch and receipt tracking will be added separately."}</p>
          {form("movement", <><Field label={zh ? "位置" : "Location"}>{locationSelect}</Field><Field label={zh ? "物料" : "Material"}>{materialSelect}</Field><Field label={zh ? "类型" : "Type"}><select className={input} name="kind">{Object.entries(kinds).filter(([k]) => k !== "adjustment").map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></Field><Field label={zh ? "数量（基本单位）" : "Quantity (base unit)"}><Quantity /></Field>{reason}</>)}
        </section>}
        {brands.length > 0 && <>
          <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "新增物料" : "New material"}</h2>{form("material", <>
            <Field label={zh ? "品牌" : "Brand"}>{brandSelect}</Field><Field label={zh ? "名称" : "Name"}><input className={input} name="name" required maxLength={200} /></Field>
            <Field label={zh ? "类别" : "Category"}><select className={input} name="category">{["ingredient", "packaging", "gift", "consumable"].map((v, i) => <option key={v} value={v}>{zh ? ["原料", "包装", "赠品", "杂项耗材"][i] : v}</option>)}</select></Field>
            <Field label={zh ? "基本单位（建立后不可更改）" : "Base unit (cannot be changed later)"}><select className={input} name="baseUnit"><option value="each">{zh ? "个" : "each"}</option><option value="g">g</option><option value="ml">ml</option></select></Field>
            <Field label={zh ? "颜色（可留空，仅资料）" : "Colour (optional information)"}><input className={input} name="colour" maxLength={80} /></Field>
          </>)}</section>
          <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "新增仓库／门店库存位置" : "New warehouse / outlet stock location"}</h2>{form("location", <>
            <Field label={zh ? "品牌" : "Brand"}>{brandSelect}</Field><Field label={zh ? "位置名称" : "Location name"}><input className={input} name="name" required maxLength={200} /></Field><Field label={zh ? "内部编号" : "Internal code"}><input className={input} name="code" required maxLength={50} /></Field>
            <Field label={zh ? "所属门店（必须与品牌一致）" : "Outlet (must match the selected brand)"}><select className={input} name="storeId"><option value="">{zh ? "独立总仓" : "Central warehouse"}</option>{stores.filter(s => manageable.includes(s.brand_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          </>)}</section>
          {materials.length > 0 && <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "包装单位换算" : "Package conversion"}</h2>{form("unit", <>
            <Field label={zh ? "物料" : "Material"}>{materialSelect}</Field><Field label={zh ? "包装名称，例如箱／瓶／袋" : "Package name, e.g. box / bottle / bag"}><input className={input} name="label" required maxLength={200} /></Field><Field label={zh ? "每包装包含的基本单位数量" : "Base units per package"}><Quantity /></Field>
          </>)}</section>}
          {postable.length > 0 && <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "补货参数" : "Reorder settings"}</h2><p className="mb-4 text-sm">{zh ? "先保存门槛与运输提前期；自动通知尚未启用。" : "Save thresholds and shipping lead time. Automatic notifications are not enabled yet."}</p>{form("reorder", <>
            <Field label={zh ? "位置" : "Location"}>{locationSelect}</Field><Field label={zh ? "物料" : "Material"}>{materialSelect}</Field><Field label={zh ? "最低数量" : "Minimum quantity"}><Quantity name="minimum" /></Field><Field label={zh ? "采购及运输提前天数" : "Purchase and delivery lead time (days)"}><input className={input} type="number" name="leadDays" min={0} max={9999} required defaultValue="0" /></Field>
          </>)}</section>}
        </>}
      </div>
      <section className={box}><h2 className="mb-4 text-xl font-bold">{zh ? "物料清单" : "Material catalogue"}</h2><div className="grid gap-3 sm:grid-cols-2">{materials.map(m => <p key={m.id} className="break-words text-sm"><strong>{m.name}</strong> · {m.base_unit} · {m.category}<br /><span className="text-xs">{m.sku}</span>{!m.active && <span> · {zh ? "停用" : "Inactive"}</span>}<br />{units.filter(u => u.material_id === m.id && u.active).map(u => <span key={u.id} className="mr-3">1 {u.unit_label} = {u.base_quantity} {m.base_unit}</span>)}</p>)}</div></section>
      <section className={`${box} mt-6`}><h2 className="mb-4 text-xl font-bold">{zh ? "最近50笔库存流水" : "Latest 50 inventory movements"}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{(zh ? ["时间（新加坡）", "位置", "物料", "类型", "数量变化", "原因"] : ["Time (Singapore)", "Location", "Material", "Type", "Change", "Reason"]).map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{movements.map(m => <tr key={m.id} className="border-t border-forest/10"><td className="p-2">{new Date(m.occurred_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td><td className="p-2">{locationName(m.location_id)}</td><td className="p-2">{materialName(m.material_id)}</td><td className="p-2">{kinds[m.movement_kind]}</td><td className="p-2">{m.quantity_delta} {m.base_unit}</td><td className="p-2">{m.reason}</td></tr>)}</tbody></table></div></section>
    </>}
  </div></main>;
}
