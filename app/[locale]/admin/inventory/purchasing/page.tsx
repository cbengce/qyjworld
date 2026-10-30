import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { readInventoryTable } from '@/lib/inventory/admin';
import { InventoryForm } from '@/components/admin/inventory-form';
import { FreightCalculator } from '@/components/admin/freight-calculator';
import { PURCHASE_PLATFORMS, displayMinor } from '@/lib/inventory/purchasing';
export const dynamic = 'force-dynamic';
const css='mt-1 block w-full rounded-lg border border-forest/20 px-3 py-2';
const field=(name:string,label:string,type='text')=><label className="block text-sm">{label}<input className={css} name={name} type={type} required maxLength={200}/></label>;
export default async function Purchasing({params}:{params:{locale:string}}){
 const locale=params.locale==='zh'?'zh':'en', zh=locale==='zh';
 await requireAdmin(locale);
 let ready=false; let suppliers:Record<string,unknown>[]=[],orders:Record<string,unknown>[]=[],materials:Record<string,unknown>[]=[],payments:Record<string,unknown>[]=[],brands:{id:string;name_en:string}[]=[];
 try{
  [suppliers,orders,materials,payments]=await Promise.all([readInventoryTable('inventory_suppliers'),readInventoryTable('inventory_purchase_orders'),readInventoryTable('inventory_materials'),readInventoryTable('inventory_purchase_payments','id,order_id,paid_on,order_currency_amount_minor::text,actual_sgd_minor::text,fee_sgd_minor::text,reference')]);
  const db=createClient();const {data,error}=await db.from('brands').select('id,name_en').eq('status','active').is('deleted_at',null).limit(500);if(error)throw error;
  for(const b of data??[]){const p=await db.rpc('inventory_has_permission',{p_permission:'inventory.manage',p_brand_id:b.id});if(p.error)throw p.error;if(p.data===true)brands.push(b);}
  ready=true;
 }catch{ready=false;}
 const form=(operation:string,children:React.ReactNode)=><InventoryForm locale={locale} operation={operation} initialKey={randomUUID()}>{children}</InventoryForm>;
 const select=(name:string,label:string,rows:Record<string,unknown>[],nameKey:string)=><label className="text-sm">{label}<select className={css} name={name} required defaultValue=""><option value="" disabled>{zh?'请选择':'Choose'}</option>{rows.map(r=><option key={String(r.id)} value={String(r.id)}>{String(r[nameKey])}</option>)}</select></label>;
 const box='rounded-xl bg-white p-5 shadow-soft';
 return <main className="min-h-screen bg-paper p-5"><div className="mx-auto max-w-6xl"><Link href={`/${locale}/admin/inventory`}>{zh?'← 库存后台':'← Inventory'}</Link><Link className="ml-5 underline" href={`/${locale}/admin/inventory/purchasing/receipts`}>{zh?"分批收货":"Partial deliveries"}</Link><h1 className="my-6 text-3xl font-bold text-forest">{zh?'供应商与采购记录':'Suppliers & purchasing'}</h1>
 {!ready?<p role="alert">{zh?'采购模块尚未启用或暂时无法读取。':'Purchasing is not enabled or cannot be read.'}</p>:<>
 <p className="mb-6">{zh?'当前为采购与付款记录，登记采购不会增加库存。到货后另做收货确认。':'Purchase/payment records do not increase stock. Confirm receipt separately when goods arrive.'}</p>
 <div className="grid gap-6 lg:grid-cols-2">
 <section className={box}><h2 className="mb-4 text-xl">{zh?'新增供应商':'New supplier'}</h2>{form('supplier',<>
 {select('brandId',zh?'品牌':'Brand',brands,'name_en')}
 <label>{zh?'购买平台':'Platform'}<select className={css} name="platform">{Object.entries(PURCHASE_PLATFORMS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 {field('countryName',zh?'国家或地区（例如 China / Malaysia / Singapore）':'Country or region')}<label>{zh?'供应商常用币种（每笔采购可另选）':'Usual currency (each purchase may differ)'}<select className={css} name="defaultCurrency"><option>CNY</option><option>MYR</option><option>SGD</option></select></label>
 {field('companyName',zh?'公司名称':'Company name')}{field('supplierName',zh?'店铺／供应商名称':'Shop / supplier name')}
 </>)}</section>
 <section className={box}><h2 className="mb-4 text-xl">{zh?'登记采购':'Record purchase'}</h2><p className="mb-3 text-sm">{zh?'初版按物料逐项登记；同一平台订单的不同物料，请在订单号后加行号。':'Initial entry records one material at a time. Add a line suffix to the platform reference for different materials in the same order.'}</p>{form('purchase',<>
 {select('supplierId',zh?'供应商':'Supplier',suppliers.filter(s=>s.active),'supplier_name')}{field('reference',zh?'平台订单号／行号':'Platform order / line reference')}{field('orderedOn',zh?'下单日期':'Order date','date')}
 <label>{zh?'货款币种':'Currency'}<select className={css} name="currency"><option>CNY</option><option>MYR</option><option>SGD</option></select></label>
 {select('materialId',zh?'物料':'Material',materials.filter(m=>m.active),'name')}{field('packageLabel',zh?'包装单位，例如箱／袋':'Package unit, e.g. box / bag')}{field('packageQuantity',zh?'购买包装数量':'Number of packages')}{field('conversion',zh?'每包装含多少基本单位（个／g／ml）':'Base units per package (each / g / ml)')}{field('goodsAmount',zh?'该项货款总额（不含运费）':'Total goods amount (excluding freight)')}
 </>)}</section>
 <section className={box}><h2 className="mb-4 text-xl">{zh?'登记实际付款':'Record actual payment'}</h2><p className="mb-3 text-sm">{zh?'每次付款独立记录原币货款及实际新币扣款，不使用固定汇率。换汇手续费单列；已包含在扣款内的费用不要重复计入。':'Record original goods paid and the actual SGD debit for each payment; no fixed exchange rate is applied. Enter separately charged fees only once.'}</p>{form('payment',<>
 {select('orderId',zh?'采购单':'Purchase record',orders,'platform_order_reference')}{field('paidOn',zh?'付款日期':'Payment date','date')}{field('originalAmount',zh?'本次支付货款（采购单币种）':'Goods paid this time (order currency)')}{field('actualSgd',zh?'实际新币扣款（不含下项手续费）':'Actual SGD debit (excluding fee below)')}{field('feeSgd',zh?'另收手续费（SGD；没有填0）':'Separate fee (SGD; enter 0 if none)')}{field('reference',zh?'付款参考号':'Payment reference')}
 </>)}</section>
 <section className={box}><h2 className="mb-4 text-xl">{zh?'运费分摊试算':'Freight allocation preview'}</h2><FreightCalculator zh={zh}/></section>
 </div>
 <section className={`${box} mt-6`}><h2 className="text-xl">{zh?'供应商清单':'Suppliers'}</h2>{suppliers.map(s=><p key={String(s.id)} className="my-3">{PURCHASE_PLATFORMS[s.platform as keyof typeof PURCHASE_PLATFORMS]} · <strong>{String(s.company_name)}</strong> · {String(s.supplier_name)} · {String(s.country_name??(zh?'国家待补录':'Country not entered'))} · {String(s.default_currency??'—')}</p>)}</section>
 <section className={`${box} mt-6`}><h2 className="text-xl">{zh?'采购与付款记录':'Purchases & payments'}</h2>{orders.map(o=><article key={String(o.id)} className="my-4 border-t p-3"><strong>{String(o.platform_order_reference)}</strong> · {String(o.currency)} · {String(o.ordered_on)}<p>{String((o.supplier_snapshot as Record<string,unknown>)?.company_name??'')} / {String((o.supplier_snapshot as Record<string,unknown>)?.supplier_name??'')}</p>{payments.filter(p=>p.order_id===o.id).map(p=><p key={String(p.id)}>{String(p.paid_on)} · {String(p.reference)} · {zh?'原币／新币／手续费':'Original / SGD / fee'}: {displayMinor(String(p.order_currency_amount_minor))} / {displayMinor(String(p.actual_sgd_minor))} / {displayMinor(String(p.fee_sgd_minor))}</p>)}</article>)}</section>
 </> }</div></main>;
}
