const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, mocks = {}) {
  const filename = path.resolve(file); const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(process.cwd());
  mod.require = name => name in mocks ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename); return mod.exports;
}
const { getActivePartnerForUser } = load('lib/partners/access.ts');
const { appzposTransactionId } = load('lib/pos/appzpos/identity.ts');
const { PartnerOrderList } = load('components/partner/partner-order-list.tsx', { '@/lib/pos/appzpos/identity': { appzposTransactionId } });
let user = { id: 'user-a', app_metadata: {} }, admin = null, active = true, archived = false, duplicate = false, databaseError = false;
const calls = [];
const orders = [
 {id:'a',partner_id:'partner-a',store_id:'store-a',provider_store_id:'provider-a',order_reference:'OWN-ORDER',order_status:'PAID',order_created_at:'2026-09-30T12:00:00Z',subtotal_minor:690,total_payable_minor:655,discount_minor:0,item_discount_minor:35,coupon_discount_minor:0,cup_quantity:1,item_list:[{itemName:'Luna Tide',quantity:1}],partners:{partner_name:'Partner A'},stores:{name:'MacPherson'}},
 {id:'b',partner_id:'partner-b',store_id:'store-b',provider_store_id:'provider-b',order_reference:'OTHER-PARTNER-SECRET',order_status:'PAID',order_created_at:'2026-09-30T12:00:00Z',item_list:[]}
];
const client = { auth: { getUser: async () => ({ data:{user} }) }, from(table) {
 const filters=[]; const q={select(){return this},eq(key,value){filters.push([key,value]);return this},limit(){return this},order(){return this},in(){return this},gte(key,value){calls.push([key,'gte',value]);return this},lt(key,value){calls.push([key,'lt',value]);return this},then(resolve,reject){
  calls.push({table,filters}); let data;
  if(table==='partner_users') {
   assert.deepEqual(filters,[['auth_user_id',user.id],['status','active']]);
   data=active?[{partner_id:'partner-a',partners:{partner_name:'Partner A',partner_code:'AAA',status:'active',archived_at:archived?'2026-09-30':null}}]:[];
   if(duplicate)data.push({...data[0],partner_id:'partner-b'});
  } else if(table==='pos_provider_orders') data=orders.filter(row=>filters.every(([key,value])=>row[key]===value));
  else { assert.ok(filters.some(([key,value])=>key==='partner_id'&&value==='partner-a')); data=[]; }
  return Promise.resolve({data,error:databaseError?{}:null}).then(resolve,reject);
 }};return q;
}};
const page=load('app/[locale]/partner/dashboard/page.tsx',{
 '@/components/partner/report-controls':{PartnerReportControls:()=>null},
 '@/app/actions': {logoutPartner:'/logout'}, '@/components/partner/partner-order-list':{PartnerOrderList}, '@/lib/partners/access':{getActivePartnerForUser},
 '@/components/partner/copy-partner-link':{CopyPartnerLink:()=>null}, '@/components/partner/partner-referral-qr':{PartnerReferralQr:()=>null},
 '@/lib/partners/referral-url':{getPartnerReferralUrl:()=> 'https://order.qyjworld.com/Order/12?Referral_Code=AAA'},
 '@/lib/pos/appzpos/identity':{appzposTransactionId}, '@/lib/supabase/server':{createClient:()=>client}, '@/lib/data':{getAdminAuthorizationForUser:async()=>admin},
 'next/navigation':{redirect(url){throw Error('REDIRECT:'+url)}}
}).default;
const args={params:{locale:'zh'},searchParams:{partner:'partner-b',to:'2026-09-30'}};
async function main(){
 user=null;await assert.rejects(page(args),/REDIRECT:\/zh\/partner\/login/);assert.equal(calls.length,0);
 user={id:'user-a',app_metadata:{}};admin={role:'super_admin'};await assert.rejects(page(args),/REDIRECT:\/zh\/admin\/partner-dashboard/);assert.equal(calls.length,0);admin=null;
 for(const state of ['removed','archived','duplicate','error']) {
  active=state!=='removed';archived=state==='archived';duplicate=state==='duplicate';databaseError=state==='error';calls.length=0;
  const html=renderToStaticMarkup(await page(args));assert.match(html,/Partner access unavailable/);assert.ok(!calls.some(call=>call.table==='pos_provider_orders'));
 }
 active=true;archived=false;duplicate=false;databaseError=false;calls.length=0;user.app_metadata.partner_password_change_required=true;
 await assert.rejects(page(args),/REDIRECT:\/zh\/partner\/reset-password/);assert.ok(!calls.some(call=>call.table==='pos_provider_orders'));
 user.app_metadata.partner_password_change_required=false;calls.length=0;
 const html=renderToStaticMarkup(await page(args));assert.match(html,/OWN-ORDER/);assert.doesNotMatch(html,/OTHER-PARTNER-SECRET/);assert.match(html,/MacPherson/);assert.doesNotMatch(html,/Store UUID/);assert.match(html,/xl:hidden/);assert.match(html,/<article/);assert.match(html,/S\$6.55/);
 assert.ok(calls.some(call=>Array.isArray(call)&&call[1]==='lt'&&call[2]==='2026-10-01T00:00:00+08:00'));
 console.log('Dashboard runtime checks passed: guest, super admin, removed/archived/ambiguous/error access, mandatory password change, tampered partner filter, scoped orders and commissions, mobile cards, named stores and inclusive end date.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
