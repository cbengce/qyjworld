import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/data';
import { readInventoryTable } from '@/lib/inventory/admin';
import { InventoryForm } from '@/components/admin/inventory-form';
import { quantityMicro, displayQuantity } from '@/lib/inventory/purchasing';
export const dynamic='force-dynamic';
const css='mt-1 block w-full rounded-lg border border-forest/20 bg-white p-2';
export default async function Receipts({params}:{params:{locale:string}}){
 const locale=params.locale==='zh'?'zh':'en',zh=locale==='zh';await requireAdmin(locale);
 let ready=false,lines:Record<string,unknown>[]=[],orders:Record<string,unknown>[]=[],materials:Record<string,unknown>[]=[],locations:Record<string,unknown>[]=[],receipts:Record<string,unknown>[]=[];
 try{
 [lines,orders,materials,locations,receipts]=await Promise.all([
 readInventoryTable('inventory_purchase_lines','id,brand_id,order_id,material_id,package_label,package_quantity::text,base_units_per_package::text'),
 readInventoryTable('inventory_purchase_orders'),readInventoryTable('inventory_materials'),readInventoryTable('inventory_locations'),
 readInventoryTable('inventory_purchase_receipts','id,brand_id,purchase_line_id,location_id,expected_delivery::text,accepted_quantity::text,damaged_quantity::text,short_quantity::text,delivery_reference,received_on,notes,movement_id,created_at')]);ready=true;
 }catch{ready=false;}
 const materialName=(id:unknown)=>String(materials.find(m=>m.id===id)?.name??id);
 const field=(name:string,label:string,type='text',initial?:string)=><label className="block text-sm">{label}<input name={name} type={type} defaultValue={initial} className={css} required maxLength={200}/></label>;
 return <main className="min-h-screen bg-paper p-5"><div className="mx-auto max-w-5xl"><Link href={`/${locale}/admin/inventory/purchasing`}>{zh?'← 采购记录':'← Purchasing'}</Link><h1 className="my-6 text-3xl font-bold text-forest">{zh?'分批收货':'Partial deliveries'}</h1>
 {!ready?<p role="alert">{zh?'收货模块尚未启用或暂时无法读取。':'Receiving is not enabled or cannot be read.'}</p>:<>
 <p className="mb-6">{zh?'全部数量使用物料的基本单位（个／g／ml）。只有验收合格数量入库；破损和短缺继续待补，不自动结清。到货后再确认，确认后不可直接改写；同一批货不要再从手动收货表重复入库。':'Use material base units (each / g / ml). Only accepted goods enter stock. Damage and shortages remain outstanding for replacement. Confirm after delivery; posted receipts cannot be overwritten. Do not also enter the same goods through the manual receipt form.'}</p>
 {!lines.length&&<p>{zh?'还没有可收货的采购明细。':'No accessible purchase lines.'}</p>}
 <div className="grid gap-6 md:grid-cols-2">{lines.map(line=>{
 const own=receipts.filter(r=>r.purchase_line_id===line.id);
 const ordered=quantityMicro(String(line.package_quantity))*quantityMicro(String(line.base_units_per_package))/1000000n;
 const received=own.reduce((sum,r)=>sum+quantityMicro(String(r.accepted_quantity)),0n);
 const remaining=ordered-received;
 const order=orders.find(o=>o.id===line.order_id),material=materials.find(m=>m.id===line.material_id);
 return <section key={String(line.id)} className="rounded-xl bg-white p-5 shadow-soft"><h2 className="text-xl font-bold">{String(order?.platform_order_reference??line.order_id)} · {materialName(line.material_id)}</h2>
 <p className="my-3">{zh?'订购／已验收／待收':'Ordered / accepted / outstanding'}: {displayQuantity(ordered)} / {displayQuantity(received)} / {displayQuantity(remaining)} {String(material?.base_unit??'')}</p>
 {remaining>0n&&<InventoryForm locale={locale} operation="receipt" initialKey={randomUUID()}>
 <input type="hidden" name="lineId" value={String(line.id)}/>
 <label>{zh?'入库位置':'Receiving location'}<select className={css} name="locationId" required defaultValue=""><option value="" disabled>{zh?'请选择':'Choose'}</option>{locations.filter(l=>l.brand_id===line.brand_id&&l.active).map(l=><option key={String(l.id)} value={String(l.id)}>{String(l.name)}</option>)}</select></label>
 {field('reference',zh?'本次送货单／包裹编号（每次不同）':'Delivery / parcel reference (unique per delivery)')}{field('receivedOn',zh?'实际收货日期':'Date received','date')}
 {field('expected',zh?'本批应到数量':'Expected in this delivery')}{field('accepted',zh?'验收合格数量':'Accepted quantity')}{field('damaged',zh?'破损／不合格数量':'Damaged / rejected quantity','text','0')}{field('short',zh?'本批短缺数量':'Short quantity in this delivery','text','0')}
 <p className="text-xs">{zh?'合格＋破损＋短缺必须等于本批应到数量，且不得超过待收数量。':'Accepted + damaged + short must equal the expected delivery, within the outstanding quantity.'}</p>
 <label>{zh?'备注':'Notes'}<textarea className={css} name="notes" maxLength={1000}/></label>
 </InventoryForm>}
 {remaining===0n&&<p className="text-forest">{zh?'已全部验收':'Fully accepted'}</p>}
 </section>;
 })}</div>
 <section className="mt-6 rounded-xl bg-white p-5"><h2 className="text-xl font-bold">{zh?'收货记录':'Delivery records'}</h2>{receipts.map(r=><p key={String(r.id)} className="my-3 border-t pt-3">{String(r.received_on)} · {String(r.delivery_reference)} · {zh?'合格／破损／短缺':'Accepted / damaged / short'}: {String(r.accepted_quantity)} / {String(r.damaged_quantity)} / {String(r.short_quantity)}<br/>{String(r.notes)}</p>)}</section>
 </> }</div></main>;
}
