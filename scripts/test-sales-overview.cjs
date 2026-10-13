const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file,mocks={}) { const filename=path.resolve(file), mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(process.cwd());mod.require=name=>name in mocks?mocks[name]:require(name);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return mod.exports; }
const sales=load('lib/pos/sales-overview.ts');
const medianDays = [22,16,13,22,0,11,26,11,15,20,19,0,6].map(cups=>({cups,paidMinor:cups*690}));
assert.deepEqual(sales.dailySalesMedians(medianDays),{days:13,cups:15,paidMinor:10350});
assert.deepEqual(sales.dailySalesMedians([{cups:1,paidMinor:690},{cups:2,paidMinor:691}]),{days:2,cups:1.5,paidMinor:690.5});
assert.deepEqual(sales.dailySalesMedians([]),{days:0,cups:0,paidMinor:0});
assert.equal(sales.dailySalesMedians([{cups:0,paidMinor:0},{cups:1,paidMinor:100},{cups:100,paidMinor:99999}]).cups,1);
assert.equal(medianDays[0].cups,22);
const now=new Date('2026-10-13T10:35:00Z');
assert.deepEqual(sales.salesDateRange({},now),{from:'2026-10-01',to:'2026-10-13',start:'2026-10-01T00:00:00+08:00',end:'2026-10-14T00:00:00+08:00'});
assert.equal(sales.salesDateRange({},new Date('2026-10-31T16:01:00Z')).from,'2026-11-01');
for(const search of [{from:'2026-09-31'},{from:'2026-09-26'},{to:'2026-10-14'},{from:'2026-10-13',to:'2026-10-12'},{from:'not-a-date'}])assert.throws(()=>sales.salesDateRange(search,now));
assert.throws(()=>sales.salesDateRange({from:'2026-09-27',to:'2027-09-28'},new Date('2027-10-01')));
const range=sales.salesDateRange({from:'2026-10-01',to:'2026-10-03'},now);
const row=(id,options={})=>({id,provider:'appzpos',partner_id:null,store_id:'store1',order_status:'PAID',order_created_at:'2026-10-01T00:00:00+08:00',total_payable_minor:690,cup_quantity:1,referral_match_status:'none',...options});
let records=[row('partner',{partner_id:'p1',referral_match_status:'matched',cup_quantity:2,total_payable_minor:1200}),row('normal'),row('unknown',{referral_match_status:'unknown'}),row('complete',{store_id:'store2',order_status:'COMPLETED',order_created_at:'2026-10-03T15:59:59Z'}),row('pending',{order_status:'PENDING'}),row('cancel',{order_status:'CANCELLED'}),row('before',{order_created_at:'2026-09-30T15:59:59Z'}),row('after',{order_created_at:'2026-10-03T16:00:00Z'})];
let summary=sales.summariseSales(records,range);
assert.deepEqual(summary.all,{orders:4,cups:5,paidMinor:3270});assert.deepEqual(summary.partner,{orders:1,cups:2,paidMinor:1200});assert.deepEqual(summary.nonPartner,{orders:3,cups:3,paidMinor:2070});
assert.equal(summary.all.orders,summary.partner.orders+summary.nonPartner.orders);assert.equal(summary.all.cups,summary.partner.cups+summary.nonPartner.cups);assert.equal(summary.all.paidMinor,summary.partner.paidMinor+summary.nonPartner.paidMinor);
assert.equal(summary.daily.length,3);assert.equal(summary.daily[1].cups,0);assert.equal(summary.daily[2].orders,1);assert.equal(summary.pending,1);assert.equal(summary.cancelled,1);assert.equal(summary.unmatchedPaid,1);
let role='super_admin',serviceCalls=0,failure=false;const calls=[];
const client={from(table){const filters=[];let bounds=null;const q={select(){return this},eq(k,v){filters.push(r=>r[k]===v);return this},gte(k,v){filters.push(r=>Date.parse(r[k])>=Date.parse(v));return this},lt(k,v){filters.push(r=>Date.parse(r[k])<Date.parse(v));return this},order(){return this},range(a,b){bounds=[a,b];return this},then(resolve,reject){calls.push({table,bounds});let data=table==='stores'?[{id:'store1',name:'M2'},{id:'store2',name:'Second Store'}]:records.filter(r=>filters.every(f=>f(r)));if(bounds)data=data.slice(bounds[0],bounds[1]+1);return Promise.resolve({data,error:failure&&table==='pos_provider_orders'?{message:'private database secret'}:null}).then(resolve,reject);}};return q;}};
const page=load('app/[locale]/admin/sales/page.tsx',{'next/link':({children,...props})=>React.createElement('a',props,children),'@/lib/data':{requireAdmin:async()=>({role})},'@/lib/supabase/admin':{createServiceClient:()=>{serviceCalls++;return client}},'@/lib/pos/sales-overview':sales,'@/components/partner/appzpos-sync-status':{AppzposSyncStatus:()=>React.createElement('section',null,'Automatic POS sync')}}).default;
async function main(){
 let rows=await sales.loadSalesOrders(client,range);assert.equal(rows.length,6);rows=await sales.loadSalesOrders(client,range,'store2');assert.equal(rows.length,1);
 records=Array.from({length:1001},(_,i)=>row('o'+i));calls.length=0;rows=await sales.loadSalesOrders(client,range);assert.equal(rows.length,1001);assert.deepEqual(calls.map(c=>c.bounds),[[0,999],[1000,1999]]);assert.equal(sales.summariseSales(rows,range).all.orders,1001);
 records=Array.from({length:10001},(_,i)=>row('o'+i));await assert.rejects(sales.loadSalesOrders(client,range),/limit/);
 failure=true;await assert.rejects(sales.loadSalesOrders(client,range),e=>e.message==='load');failure=false;
 role='manager';let html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{}}));assert.match(html,/Access unavailable/);assert.equal(serviceCalls,0);
 role='super_admin';records=[row('partner',{partner_id:'p1',referral_match_status:'matched',cup_quantity:2,total_payable_minor:1200}),row('normal')];
 html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{from:range.from,to:range.to}}));assert.match(html,/S\$18.90/);assert.match(html,/Non-partner orders/);assert.match(html,/Daily cups sold/);assert.match(html,/Median daily cups/);assert.match(html,/Median daily takings/);assert.match(html,/Based on 3 calendar days/);assert.match(html,/2026-10-02/);assert.match(html,/not a separate Grab\/Foodpanda/);assert.match(html,/from=2026-10-01&amp;to=2026-10-03/);
 html=renderToStaticMarkup(await page({params:{locale:'zh'},searchParams:{from:range.from,to:range.to,store:'store2'}}));assert.match(html,/全店业绩总览/);assert.match(html,/S\$0.00/);assert.match(html,/暂无已同步/);
 for(const search of [{from:'2026-09-31'},{store:'missing'}]){calls.length=0;html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:search}));assert.match(html,/role="alert"/);assert.ok(!calls.some(c=>c.table==='pos_provider_orders'));assert.doesNotMatch(html,/Store sales totals/);}
 failure=true;html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{}}));assert.match(html,/Unable to load sales/);assert.doesNotMatch(html,/private database secret|Store sales totals/);failure=false;
 records=Array.from({length:10001},(_,i)=>row('o'+i));html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{from:range.from,to:range.to}}));assert.match(html,/10,000/);assert.doesNotMatch(html,/Store sales totals/);
 const navigation=load('components/admin/admin-navigation.tsx',{'next/link':({children,...props})=>React.createElement('a',props,children),'@/app/actions':{logoutMember:'/logout'},'@/lib/data':{requireAdmin:async()=>({role})}}).AdminNavigation;
 role='manager';html=renderToStaticMarkup(await navigation({locale:'en'}));assert.doesNotMatch(html,/\/admin\/sales/);role='super_admin';html=renderToStaticMarkup(await navigation({locale:'zh'}));assert.match(html,/全店业绩/);
 console.log('Store sales checks passed: partner + non-partner reconciliation, paid statuses, SGT inclusive dates, zero days, store/provider filters, 1001-order pagination, 10000-order safety limit, failures, bilingual UI and Super Admin access.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
