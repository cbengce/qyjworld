const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const ExcelJS = require('exceljs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks={}) {
 const filename=path.resolve(file), mod=new Module(filename,module); mod.filename=filename; mod.paths=Module._nodeModulePaths(process.cwd());
 mod.require=name=>name in mocks?mocks[name]:require(name);
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return mod.exports;
}
let user={id:'account-a',app_metadata:{}}, admin=null, access={partnerId:'a',partner:{partner_name:'Partner A',partner_code:'AAA'}}, failTable=null, records=[], transactions=[];
const calls=[];
function row(id,partner='a',time='2026-09-27T16:00:00Z') {return {id,provider:'appzpos',store_id:'store-a',provider_store_id:'provider-a',order_reference:id,partner_id:partner,order_status:'PAID',order_created_at:time,subtotal_minor:1000,discount_minor:0,item_discount_minor:50,coupon_discount_minor:0,total_payable_minor:950,cup_quantity:2,currency_code:'SGD',partners:{partner_name:partner==='a'?'Partner A':'Other Partner',partner_code:partner==='a'?'AAA':'BBB'},stores:{name:'MacPherson'}};}
function client(service=false) {return {auth:{getUser:async()=>({data:{user}})},from(table){
 const filters=[];let bounds=null;
 const q={select(){return this},eq(k,v){filters.push(['eq',k,v]);return this},not(k,op,v){filters.push(['not',k,v]);return this},in(k,v){filters.push(['in',k,v]);return this},gte(k,v){filters.push(['gte',k,v]);return this},lt(k,v){filters.push(['lt',k,v]);return this},order(){return this},range(a,b){bounds=[a,b];return this},async maybeSingle(){calls.push({table,service,filters});const id=filters.find(f=>f[1]==='id')[2];return {data:['a','b'].includes(id)?{id,partner_name:id==='a'?'Partner A':'Other Partner',partner_code:id==='a'?'AAA':'BBB'}:null,error:failTable===table?{}:null}},then(resolve,reject){
 calls.push({table,service,filters,bounds});let data=table==='pos_provider_orders'?records:transactions;
 data=data.filter(r=>filters.every(([op,k,v])=>op==='eq'?r[k]===v:op==='not'?r[k]!==v:op==='in'?v.includes(r[k]):op==='gte'?Date.parse(r[k])>=Date.parse(v):Date.parse(r[k])<Date.parse(v)));
 if(bounds)data=data.slice(bounds[0],bounds[1]+1);
 return Promise.resolve({data,error:failTable===table?{message:'database secret'}:null}).then(resolve,reject);
 }};return q;
 }};}
const reportLib=load('lib/partners/report.ts',{'@/lib/data':{getAdminAuthorizationForUser:async()=>admin},'@/lib/partners/access':{getActivePartnerForUser:async()=>access},'@/lib/supabase/server':{createClient:()=>client()},'@/lib/supabase/admin':{createServiceClient:()=>client(true)}});
const {getPartnerReport,partnerReportDates,summarisePartnerReport,PartnerReportError}=reportLib;
const {partnerReportXlsx}=load('lib/partners/report-xlsx.ts');
const range={from:'2026-09-27',to:'2026-09-30'};
function seed(count=2) {records=Array.from({length:count},(_,i)=>row('OR'+i));transactions=records.map(r=>({provider:'appzpos',partner_id:r.partner_id,pos_transaction_id:`${r.provider_store_id}:${r.order_reference}`,partner_commission_ledger:[{partner_id:r.partner_id,reward_amount:'0.48'}]}));calls.length=0;}
async function main() {
 assert.deepEqual(partnerReportDates(range,new Date('2026-10-01T00:00:00Z')),{...range,start:'2026-09-27T00:00:00+08:00',end:'2026-10-01T00:00:00+08:00'});
 for(const search of [{from:'2026-09-26',to:'2026-09-30'},{from:'2026-09-31',to:'2026-10-01'},{from:'2026-09-30',to:'2026-09-27'},{from:'2026-09-27',to:'2026-10-02'},{}])assert.throws(()=>partnerReportDates(search,new Date('2026-10-01T00:00:00Z')),PartnerReportError);
 assert.throws(()=>partnerReportDates({from:'2026-09-27',to:'2027-09-28'},new Date('2028-01-01')),/366 days/);
 seed();user=null;await assert.rejects(getPartnerReport(range),e=>e.status===401);assert.equal(calls.length,0);
 user={id:'account-a',app_metadata:{}};access=null;await assert.rejects(getPartnerReport(range),e=>e.status===403);assert.equal(calls.length,0);
 access={partnerId:'a',partner:{partner_name:'Partner A',partner_code:'AAA'}};user.app_metadata.partner_password_change_required=true;await assert.rejects(getPartnerReport(range),e=>e.code==='password_required');assert.equal(calls.length,0);user.app_metadata={};
 seed();records.push(row('OTHER-PARTNER-SECRET','b'),{...row('CANCELLED'),order_status:'CANCELLED'},row('BEFORE','a','2026-09-26T15:59:59Z'),row('AFTER','a','2026-09-30T16:00:00Z'));
 let report=await getPartnerReport({...range,partner:'b'});assert.equal(report.scopeName,'Partner A');assert.equal(report.totals.orders,2);assert.equal(report.totals.cups,4);assert.equal(report.totals.paidMinor,1900);assert.equal(report.totals.commissionMinor,96);assert.equal(report.daily.length,4);assert.equal(report.daily[0].orders,0);assert.equal(report.daily[1].orders,2);assert.doesNotMatch(JSON.stringify(report),/OTHER-PARTNER-SECRET/);
 assert.ok(calls.filter(c=>c.table.startsWith('pos_')).every(c=>!c.service&&c.filters.some(f=>f[1]==='partner_id'&&f[2]==='a')));
 assert.equal((await getPartnerReport({...range,store:'other-store'})).totals.orders,0);
 admin={role:'admin'};report=await getPartnerReport({...range,partner:'b'});assert.equal(report.scopeName,'Partner A');admin={role:'super_admin'};
 assert.equal((await getPartnerReport(range)).totals.orders,3);assert.equal((await getPartnerReport({...range,partner:'b'})).totals.orders,1);await assert.rejects(getPartnerReport({...range,partner:'missing'}),e=>e.status===404);admin=null;
 seed(1001);report=await getPartnerReport(range);assert.equal(report.totals.orders,1001);assert.equal(report.totals.commissionMinor,48048);assert.deepEqual(calls.filter(c=>c.table==='pos_provider_orders').map(c=>c.bounds),[[0,999],[1000,1999]]);assert.ok(calls.filter(c=>c.table==='pos_transactions').every(c=>c.filters.find(f=>f[0]==='in')[2].length<=100));
 seed(10001);await assert.rejects(getPartnerReport(range),e=>e.status===413);assert.ok(!calls.some(c=>c.table==='pos_transactions'));
 seed();failTable='pos_provider_orders';await assert.rejects(getPartnerReport(range),e=>e.status===502&&!e.message.includes('database secret'));failTable='pos_transactions';await assert.rejects(getPartnerReport(range),e=>e.status===502);failTable=null;
 seed();transactions[1].partner_commission_ledger[0].partner_id='b';report=await getPartnerReport(range);assert.equal(report.totals.missingCommission,1);
 assert.throws(()=>summarisePartnerReport([row('OTHER','b')],new Map(),range,{name:'A',code:'AAA',partnerId:'a'}),e=>e.status===409);
 const bytes=await partnerReportXlsx(report), wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);assert.deepEqual(wb.worksheets.map(s=>s.name),['Daily summary','Order details']);
 const daily=wb.getWorksheet('Daily summary'), detail=wb.getWorksheet('Order details');assert.ok(daily.getCell('A7').value instanceof Date);assert.equal(daily.getCell('E8').value,4);assert.equal(daily.getCell('F8').value,19);assert.equal(daily.getCell('G8').value,null);assert.match(daily.getCell('H8').value,/pending/);assert.equal(daily.getCell('D11').value.result,2);assert.equal(daily.getCell('G11').value,null);assert.equal(detail.getCell('K8').value,null);assert.equal(detail.getCell('L8').value,'Pending review');assert.equal(detail.getCell('B7').value.toISOString(),'2026-09-28T00:00:00.000Z');assert.equal(daily.views[0].ySplit,6);assert.equal(daily.pageSetup.orientation,'landscape');assert.equal(daily.pageSetup.printTitlesRow,'1:6');assert.ok(daily.autoFilter);
 report.daily[0].partnerName='=HYPERLINK("https://example.com")';const injected=new ExcelJS.Workbook();await injected.xlsx.load(await partnerReportXlsx(report));assert.equal(injected.getWorksheet('Daily summary').getCell('B7').type,ExcelJS.ValueType.String);
 const page=load('app/[locale]/partner/report/page.tsx',{'@/lib/partners/report':{...reportLib,getPartnerReport:async()=>report},'@/components/partner/print-report-button':{PrintReportButton:()=>React.createElement('button',null,'Print / Save PDF')},'next/navigation':{redirect(url){throw Error('REDIRECT:'+url)}}}).default;
 const html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:range}));assert.match(html,/Period total/);assert.match(html,/Print \/ Save PDF/);assert.match(html,/S\$19.00/);assert.match(html,/Pending/);assert.match(html,/table-row-group/);
 const route=load('app/api/partner/report/route.ts',{'@/lib/partners/report':reportLib,'@/lib/partners/report-xlsx':{partnerReportXlsx}});const {NextRequest}=require('next/server');
 user=null;let response=await route.GET(new NextRequest('https://qyjworld.com/api/partner/report?from=2026-09-27&to=2026-09-30'));assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
 user={id:'account-a',app_metadata:{}};seed();response=await route.GET(new NextRequest('https://qyjworld.com/api/partner/report?from=2026-09-27&to=2026-09-30&partner=b'));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/spreadsheetml/);assert.match(response.headers.get('content-disposition'),/\.xlsx/);const downloaded=new ExcelJS.Workbook();await downloaded.xlsx.load(await response.arrayBuffer());assert.match(downloaded.getWorksheet('Daily summary').getCell('A2').value,/Partner A/);
 console.log('Partner report checks passed: permissions, tampered filters, Singapore dates, zero days, totals, pagination, missing commissions, XLSX round-trip and formulas, print markup and protected download.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
