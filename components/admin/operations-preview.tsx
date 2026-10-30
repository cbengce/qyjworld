'use client';
import { useEffect, useState } from 'react';

type Material = { sku: string; name: string; specification: string; unit: string; pack: string };
type Supplier = { company: string; name: string; country: string; currency: string; platform: string };
export function OperationsPreview({ zh }: { zh: boolean }) {
  const [tab, setTab] = useState('sku');
  const [materials, setMaterials] = useState<Material[]>([{ sku: 'DEMO-CUP-L', name: '大杯 / Large cup', specification: '透明 · 700 ml / Clear', unit: '个 / each', pack: '1 箱 = 1,000 个' }, { sku: 'DEMO-TEA-01', name: '茶叶 / Tea leaves', specification: '示例规格 / Sample', unit: 'g', pack: '1 袋 = 500 g' }]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([{ company: '示例中国供应商 / Sample China supplier', name: '示例店铺 / Sample shop', country: 'China', currency: 'CNY', platform: '淘宝 / Taobao' }]);
  const [currency, setCurrency] = useState('CNY');
  const [foreign, setForeign] = useState('1000');
  const [sgd, setSgd] = useState('190');
  const [freight, setFreight] = useState('30');
  const [fee, setFee] = useState('2');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qyj-operations-preview-v1');
      if (raw) {
        const draft = JSON.parse(raw);
        const rowsValid = (rows: unknown, keys: string[]) => Array.isArray(rows) && rows.every(row => row && typeof row === 'object' && Object.keys(row).length === keys.length && keys.every(key => typeof row[key] === 'string'));
        if (!rowsValid(draft.materials, ['sku', 'name', 'specification', 'unit', 'pack']) || !rowsValid(draft.suppliers, ['company', 'name', 'country', 'currency', 'platform']) || !['CNY', 'MYR', 'SGD'].includes(draft.currency) || !['foreign', 'sgd', 'freight', 'fee'].every(key => typeof draft[key] === 'string')) throw new Error('Invalid saved preview');
        setMaterials(draft.materials); setSuppliers(draft.suppliers); setCurrency(draft.currency);
        setForeign(draft.foreign); setSgd(draft.sgd); setFreight(draft.freight); setFee(draft.fee);
      }
      setReady(true);
    } catch { setStorageError(true); }
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('qyj-operations-preview-v1', JSON.stringify({ materials, suppliers, currency, foreign, sgd, freight, fee }));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [ready, materials, suppliers, currency, foreign, sgd, freight, fee]);
  const field = 'mt-1 w-full rounded-lg border border-forest/20 bg-white p-3 text-ink';
  const label = (title: string, name: string, placeholder = '') => <label className="block text-sm font-bold">{title}<input required name={name} maxLength={200} placeholder={placeholder} className={field} /></label>;
  const choose = (title: string, name: string, options: string[]) => <label className="block text-sm font-bold">{title}<select name={name} className={field}>{options.map(o => <option key={o}>{o}</option>)}</select></label>;
  const added = () => setNotice(zh ? '已加入预览。自动保存在当前浏览器；尚未写入正式库存数据库。' : 'Added to the preview. Automatically saved in this browser; not saved to the live inventory database.');
  const valid = [foreign, sgd, freight, fee].every(v => /^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(v));
  const cents = (v: string) => { const [a, b = ''] = v.split('.'); return Number(a) * 100 + Number(b.padEnd(2, '0')); };
  return <section className="mt-6 space-y-6 text-forest">
    <div className="rounded-xl border border-amber-400 bg-amber-50 p-4"><strong>{zh ? '操作预览 · 全部为示例资料' : 'Interactive preview · Sample data only'}</strong><p className="mt-2 text-sm">{zh ? '正式库存数据库尚未接通。预览物料、供应商与计算金额自动保存在当前浏览器，刷新或重新打开可保留；换设备不会同步，清除浏览器资料会丢失。请勿当作正式采购记录。' : 'The live inventory database is not connected. Preview materials, suppliers and calculator amounts are saved in this browser across refreshes and visits. They do not sync across devices and are lost if browser data is cleared. These are not official purchasing records.'}</p></div>
    <nav className="flex flex-wrap gap-3" aria-label={zh ? '采购预览步骤' : 'Purchasing preview steps'}>{[['sku', '1 · SKU / 物料'], ['supplier', '2 · 供应商 / Suppliers'], ['payment', '3 · 付款与汇率 / Payment & FX']].map(([id, title]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setNotice(''); }} className={`rounded-xl border px-4 py-3 font-bold ${tab === id ? 'bg-forest text-white' : 'bg-white'}`}>{title}</button>)}</nav>
    {storageError && <p role="alert" className="rounded-lg border border-red-400 bg-red-50 p-4">{zh ? '当前浏览器无法保存或读取预览资料。请先不要关闭页面；本次输入可能无法保留。' : 'This browser could not save or restore the preview. Keep this page open; your changes may not be retained.'}</p>}
    {notice && <p role="status" className="rounded-lg bg-white p-4">{notice}</p>}
    {tab === 'sku' && <div className="space-y-5"><h2 className="text-xl font-bold">{zh ? '先建立物料，再在采购单选择' : 'Create materials before selecting them on a purchase order'}</h2><form className="grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setMaterials([...materials, { sku: `DEMO-${materials.length + 1}`, name: String(f.get('name')), specification: String(f.get('specification')), unit: String(f.get('unit')), pack: String(f.get('pack')) }]); e.currentTarget.reset(); added(); }}>{label('物料名称 / Material name', 'name', '例如：700 ml 透明杯')}{label('规格、颜色 / Specification & colour', 'specification')}{choose('库存基本单位 / Stock unit', 'unit', ['个 / each', 'g', 'ml'])}{label('采购包装换算 / Pack conversion', 'pack', '例如：1 箱 = 1,000 个')}<p className="text-sm sm:col-span-2">{zh ? 'SKU 编号由系统生成。箱、袋等采购单位需明确换算；期初库存另行盘点录入。' : 'SKU codes are generated. Define pack conversions; opening stock is entered separately after a count.'}</p><button className="rounded-lg bg-forest p-3 font-bold text-white" type="submit">{zh ? '加入预览物料' : 'Add preview material'}</button></form><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['SKU', '物料 / Material', '规格 / Specification', '单位 / Unit', '换算 / Conversion'].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{materials.map(m => <tr key={m.sku} className="border-t bg-white">{Object.values(m).map((v, i) => <td key={i} className="p-3">{v}</td>)}</tr>)}</tbody></table></div></div>}
    {tab === 'supplier' && <div className="space-y-5"><h2 className="text-xl font-bold">{zh ? '供应商不限国家；公司与店铺分别记录' : 'Suppliers from any country; company and shop recorded separately'}</h2><form className="grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setSuppliers([...suppliers, Object.fromEntries(f) as Supplier]); e.currentTarget.reset(); added(); }}>{label('公司名称 / Company', 'company')}{label('供应商、店铺名称 / Supplier or shop', 'name')}{label('国家或地区 / Country or region', 'country', 'China / Malaysia / Singapore / …')}{choose('交易币种 / Transaction currency', 'currency', ['CNY', 'MYR', 'SGD'])}{choose('采购平台 / Platform', 'platform', ['拼多多 / Pinduoduo', '抖音 / Douyin', '淘宝 / Taobao', '微信 / WeChat', '直接采购 / Direct', '其他 / Other'])}<button className="rounded-lg bg-forest p-3 font-bold text-white" type="submit">{zh ? '加入预览供应商' : 'Add preview supplier'}</button></form>{suppliers.map((s, i) => <article key={i} className="rounded-xl bg-white p-4"><strong>{s.company}</strong><p>{s.name}</p><p className="mt-2 text-sm">{s.country} · {s.currency} · {s.platform}</p></article>)}<p className="text-sm">{zh ? '预览先列 CNY、MYR、SGD；其他币种需要扩展币种设置。报表本位币为 SGD。' : 'This preview lists CNY, MYR and SGD. Further currencies need currency setup. Reporting currency is SGD.'}</p></div>}
    {tab === 'payment' && <div className="space-y-5"><h2 className="text-xl font-bold">{zh ? '每次付款保留原币与实际新币金额' : 'Record original currency and actual SGD for each payment'}</h2><div className="grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2"><label>原币 / Currency<select className={field} value={currency} onChange={e => setCurrency(e.target.value)}>{['CNY', 'MYR', 'SGD'].map(c => <option key={c}>{c}</option>)}</select></label>{[[`货款 / Goods (${currency})`, foreign, setForeign], ['货款实际扣款 / Goods paid (SGD)', sgd, setSgd], ['运费 / Freight (SGD)', freight, setFreight], ['另收手续费 / Separate fee (SGD)', fee, setFee]].map(([title, value, setter], i) => <label key={i}>{String(title)}<input className={field} inputMode="decimal" value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)} /></label>)}</div>{valid && Number(foreign) > 0 ? <div className="rounded-xl bg-white p-5"><p>1 {currency} = {(cents(sgd) / cents(foreign)).toFixed(6)} SGD</p><p className="mt-2 text-xl font-bold">{zh ? '示例到岸成本' : 'Illustrative landed cost'}: S${((cents(sgd) + cents(freight) + cents(fee)) / 100).toFixed(2)}</p></div> : <p role="alert">{zh ? '请输入有效金额，原币货款须大于零。' : 'Enter valid amounts; original goods amount must exceed zero.'}</p>}<p className="text-sm leading-7">{zh ? '这里演示已付款的实际成本。未付款时可先填暂估汇率；付款后按每笔实际新币扣款结算。若扣款已包含手续费，就不要重复填手续费。运费保留独立记录，再分摊到物料。此处仅保存浏览器中的试算金额，不产生正式付款或分摊记录。' : 'This illustrates paid costs. Unpaid orders use an estimated rate; settlement uses each actual SGD debit. Do not add fees again if already included in that debit. Freight remains a separate record before allocation. Only calculator inputs are kept in this browser; no official payments or allocations are created.'}</p></div>}
  </section>;
}
