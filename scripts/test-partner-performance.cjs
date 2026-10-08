const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}) {
  const filename = path.resolve(file), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(process.cwd());
  mod.require = name => name in mocks ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { appzposTransactionId } = load('lib/pos/appzpos/identity.ts');
const performance = load('lib/partners/performance.ts', { '../pos/appzpos/identity': { appzposTransactionId } });
const { PartnerPerformanceSummary } = load('components/partner/partner-performance.tsx');
const partners = [{ id:'a', partner_name:'Partner A', partner_code:'AAA' }, { id:'b', partner_name:'Partner B', partner_code:'BBB' }, { id:'c', partner_name:'Partner C', partner_code:'CCC' }];
function order(partner_id, provider_store_id, order_reference, order_status='PAID', cup_quantity=1, total_payable_minor=690, date='2026-10-08T15:59:59Z') { return { id: provider_store_id+order_reference, partner_id, provider_store_id, store_id:provider_store_id, order_reference, order_status, cup_quantity, total_payable_minor, order_created_at:date, item_list:[], partners:partners.find(p=>p.id===partner_id) }; }
const rows = [order('a','store1','OR1'), order('b','store1','OR2','COMPLETED',2,1200), order('a','store2','OR1','PAID',3,1500), order('b','store1','PENDING','PENDING'), order('a','store1','CANCELLED','CANCELLED'), order(null,'store1','NO-PARTNER')];
const commission = new Map([['store1:OR1',0.35],['store2:OR1',0.75],['store1:OR2',0.60]]);
const totals = performance.summarisePartnerPerformance(rows, partners, commission);
assert.deepEqual(totals.map(p=>[p.id,p.orders,p.cups,p.paidMinor]), [['a',2,4,2190],['b',1,2,1200],['c',0,0,0]]);
assert.equal(totals[0].commission,1.10); assert.equal(totals[1].commission,0.60);
assert.equal(totals.reduce((n,p)=>n+p.orders,0),3);
assert.equal(performance.summarisePartnerPerformance([order('a','s','x')], [partners[0]], new Map())[0].commission,0);
assert.equal(performance.summarisePartnerPerformance([order('missing','s','x')], partners, new Map()).reduce((n,p)=>n+p.orders,0),1);
assert.equal(performance.summarisePartnerPerformance(rows.filter(r=>r.partner_id==='b'), [partners[1]], commission).length,1);
const render = props => renderToStaticMarkup(React.createElement(PartnerPerformanceSummary, props));
let html = render({ partners:totals, from:'2026-10-01', to:'2026-10-08', locale:'en' });
assert.match(html,/66.7%/); assert.match(html,/33.3%/); assert.match(html,/Partner C/); assert.match(html,/S\$21.90/); assert.match(html,/S\$1.10/); assert.match(html,/2026-10-01 – 2026-10-08/); assert.match(html,/bar chart/);
html = render({ partners:performance.summarisePartnerPerformance([],partners,new Map()), locale:'zh', truncated:true });
assert.match(html,/合作伙伴业绩汇总/); assert.match(html,/1,000/); assert.doesNotMatch(html,/NaN|Infinity/); assert.match(html,/0.0%/);

let role='super_admin', serviceCalls=0;
function client() { serviceCalls++; return { from(table) {
  const filters=[]; const q={select(){return this},order(){return this},limit(){return this},not(k,op,v){filters.push(r=>r[k]!==v);return this},eq(k,v){filters.push(r=>r[k]===v);return this},in(){return this},ilike(k,v){filters.push(r=>r[k].includes(v.replaceAll('%','')));return this},gte(k,v){filters.push(r=>Date.parse(r[k])>=Date.parse(v));return this},lt(k,v){filters.push(r=>Date.parse(r[k])<Date.parse(v));return this},then(resolve,reject){
    let data=table==='partners'?partners:table==='stores'?[]:table==='pos_provider_orders'?rows: [...commission].map(([pos_transaction_id,amount])=>({provider:'appzpos',pos_transaction_id,partner_commission_ledger:[{reward_amount:amount}]}));
    return Promise.resolve({data:data.filter(r=>filters.every(f=>f(r))),error:null}).then(resolve,reject);
  }}; return q;
}}; }
const page = load('app/[locale]/admin/partner-dashboard/page.tsx', {
 '@/components/partner/appzpos-sync-status':{AppzposSyncStatus:()=>React.createElement('section',null,'Automatic POS sync')},
 '@/components/partner/partner-performance':{PartnerPerformanceSummary}, '@/lib/partners/performance':performance,
 '@/components/partner/report-controls':{PartnerReportControls:()=>null}, '@/components/partner/partner-order-list':{PartnerOrderList:()=>null},
 '@/components/partner/copy-partner-link':{CopyPartnerLink:()=>null}, '@/components/partner/partner-referral-qr':{PartnerReferralQr:()=>null},
 '@/lib/partners/referral-url':{getPartnerReferralUrl:()=> 'https://example.com'}, '@/lib/pos/appzpos/identity':{appzposTransactionId},
 '@/lib/data':{requireAdmin:async()=>({role})}, '@/lib/supabase/admin':{createServiceClient:client},
 'next/link':({children,...props})=>React.createElement('a',props,children)
}).default;
async function main() {
  role='admin'; html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{}})); assert.match(html,/Access unavailable/); assert.equal(serviceCalls,0);
  role='super_admin'; html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{from:'2026-10-08',to:'2026-10-08'}})); assert.match(html,/<strong>3<\/strong>/); assert.match(html,/Partner C/); assert.match(html,/S\$33.90/); assert.match(html,/S\$1.70/);
  html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{partner:'b'}})); assert.match(html,/<strong>1<\/strong>/); assert.doesNotMatch(html.match(/<ul[\s\S]*?<\/ul>/)[0],/Partner A|Partner C/); assert.match(html,/S\$0.60/);
  html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{store:'store2'}})); assert.match(html,/<strong>1<\/strong>/); assert.match(html,/S\$15.00/);
  html=renderToStaticMarkup(await page({params:{locale:'zh'},searchParams:{status:'PENDING'}})); assert.match(html,/<strong>0<\/strong>/); assert.match(html,/合作伙伴业绩汇总/);
  html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{order:'OR2'}})); assert.match(html,/<strong>1<\/strong>/);
  html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{to:'2026-10-07'}})); assert.match(html,/<strong>0<\/strong>/);
  console.log('Partner performance checks passed: paid-only attribution, cross-store order identity, reconciliation, zero partners, chart labels, EN/ZH, access gate and date/store/partner/order/status filters.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
