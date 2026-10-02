const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const path = require('node:path');
const original = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...args) { return original.call(this, name.startsWith('@/') ? path.join(process.cwd(), name.slice(2)) : name, parent, ...args); };
Module._extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { importOriginalMenu } = require('../lib/menu-catalogue-import.ts');
const store = {id:'primary-store',brand_id:'brand'};
function database() {
 const rows = {menu_items:[],menus:[],products:[],product_categories:[],product_images:[]};
 let failImages = false; let sequence = 0;
 const db = {rows, failImages(value){failImages=value;}, rpc: async () => {const menu={id:'menu',status:'active',store_id:store.id};rows.menus.push(menu);return {data:menu,error:null};}, from(table){
  let filters=[];let records=null;let options=null;let head=false;
  const q={select(columns, opts){head=opts?.head;return q;},eq(key,value){filters.push(row=> key==='menus.store_id' ? rows.menus.some(menu=>menu.id===row.menu_id&&menu.store_id===value) : row[key]===value);return q;},in(key,values){filters.push(row=>values.includes(row[key]));return q;},upsert(data,opts){records=data;options=opts;return q;},then(resolve,reject){return Promise.resolve().then(()=>{
   if(records){if(table==='product_images'&&failImages)return {error:{message:'storage unavailable'}};
    for(const record of records){const keys=options.onConflict.split(',');if(!rows[table].some(row=>keys.every(key=>row[key]===record[key])))rows[table].push({id:`generated-${++sequence}`,...record});}
   }
   const data=rows[table].filter(row=>filters.every(filter=>filter(row)));
   return {data:head?null:data.map(row=>({...row})),count:data.length,error:null};
  }).then(resolve,reject);}};return q;
 }};return db;
}
(async()=>{
 const db=database();
 await importOriginalMenu(db,db,store,'owner');
 assert.equal(db.rows.products.length,9);assert.equal(db.rows.product_images.length,9);assert.equal(db.rows.product_categories.length,3);assert.equal(db.rows.menu_items.length,9);
 for(const item of db.rows.menu_items){assert.equal(item.regular_price,null);assert.equal(item.member_price,null);assert.equal(item.online_ordering_enabled,false);}
 db.rows.menu_items[0].regular_price=123;db.rows.products[0].status='inactive';
 const before=JSON.stringify(db.rows);assert.equal((await importOriginalMenu(db,db,store,'owner')).imported,false);assert.equal(JSON.stringify(db.rows),before);
 const partial=database();partial.failImages(true);
 await assert.rejects(importOriginalMenu(partial,partial,store,'owner'),/storage unavailable/);assert.equal(partial.rows.menu_items.length,0);
 partial.rows.products[0].name_en='Owner edited name';partial.failImages(false);
 await importOriginalMenu(partial,partial,store,'owner');assert.equal(partial.rows.products.length,9);assert.equal(partial.rows.products[0].name_en,'Owner edited name');assert.equal(partial.rows.menu_items.length,9);
 const archived=database();archived.rows.menus.push({id:'old',store_id:store.id,status:'archived'});
 await assert.rejects(importOriginalMenu(archived,archived,store,'owner'),/inactive or archived/);assert.equal(archived.rows.products.length,0);
 const stopped=database();stopped.rows.menus.push({id:'menu',store_id:store.id,status:'inactive'});stopped.rows.menu_items.push({id:'old',menu_id:'menu',status:'archived'});
 assert.equal((await importOriginalMenu(stopped,stopped,store,'owner')).imported,false);assert.equal(stopped.rows.products.length,0);
 const missing=database();missing.from=()=>{const q={select(){return q;},eq(){return q;},then(fn){return Promise.resolve({error:{message:'database unavailable'}}).then(fn);}};return q;};
 await assert.rejects(importOriginalMenu(missing,missing,store,'owner'),/database unavailable/);
 console.log('CMS catalogue import: nine drinks, null prices, safe retries, existing menus and lifecycle preservation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
