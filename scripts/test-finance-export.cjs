const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),ExcelJS=require('exceljs');
function load(file,mocks={}){const f=path.resolve(file),m=new Module(f,module);m.filename=f;m.paths=Module._nodeModulePaths(process.cwd());m.require=n=>n in mocks?mocks[n]:require(n);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);return m.exports;}
let unavailable=false,denied=false;
const {GET}=load('app/[locale]/admin/inventory/finance/export/route.ts',{
 '@/lib/data':{requireAdmin:async()=>{if(denied)throw new Error('Denied');}},
 '@/lib/inventory/admin':{readInventoryTable:async table=>{if(unavailable)throw new Error('DB failed');return table==='inventory_fixed_assets'?[{asset_reference:'ASSET-1',asset_name:'=NotAFormula',store_id:'store',cost_status:'actual',acquired_on:'2026-09-01',depreciation_start:'2026-10-01',cost_sgd_minor:'360000',residual_sgd_minor:'0'}]:[{expense_month:'2026-10-01',entry_kind:'budget',category:'rent',amount_sgd_minor:'1000000',reference:'BUDGET',notes:''},{expense_month:'2026-10-01',entry_kind:'actual',category:'rent',amount_sgd_minor:'990000',reference:'ACTUAL',notes:''}];}},
 '@/lib/inventory/finance':load('lib/inventory/finance.ts'),
 '@/lib/inventory/finance-admin':{singaporeMonth:()=> '2026-10'}
});
(async()=>{
 const args={params:{locale:'en'}};
 const response=await GET({nextUrl:new URL('https://example.invalid/export?month=2026-10')},args);
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(await response.arrayBuffer()));
 assert.deepEqual(wb.worksheets.map(s=>s.name),['Read me','Fixed assets','Monthly costs']);
 const assets=wb.getWorksheet('Fixed assets');assert.equal(assets.getCell('I2').value,100);assert.equal(assets.getCell('J2').value,100);assert.equal(assets.getCell('K2').value,3500);assert.equal(assets.getCell('B2').value,'=NotAFormula');assert.notEqual(assets.getCell('B2').type,ExcelJS.ValueType.Formula);
 const costs=wb.getWorksheet('Monthly costs');assert.equal(costs.getCell('B2').value,'budget');assert.equal(costs.getCell('B3').value,'actual');assert.equal(costs.getCell('E2').value,10000);assert.equal(costs.getCell('E3').value,9900);
 assert.equal((await GET({nextUrl:new URL('https://example.invalid/export?month=2026-13')},args)).status,400);
 unavailable=true;assert.equal((await GET({nextUrl:new URL('https://example.invalid/export')},args)).status,503);
 denied=true;await assert.rejects(GET({nextUrl:new URL('https://example.invalid/export')},args),/Denied/);
 console.log('Monthly Excel: exact depreciation, budget/actual separation, safe text cells, auth and failure boundaries passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
