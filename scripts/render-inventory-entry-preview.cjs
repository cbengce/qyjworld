// Renders the actual server pages with labelled, non-production fixture data.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(process.cwd());m.require=n=>n in mocks?mocks[n]:require(n);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);return m.exports;}
const fixture={
 inventory_fixed_assets:[{id:'asset-1',asset_name:'示例出茶机',asset_reference:'DEMO-001',store_id:'store',acquired_on:'2026-09-01',depreciation_start:'2026-10-01',cost_sgd_minor:'360000',residual_sgd_minor:'0',cost_status:'actual'}],
 inventory_monthly_costs:[{id:'cost-1',expense_month:'2026-10-01',entry_kind:'budget',category:'rent',amount_sgd_minor:'1000000',reference:'DEMO-BUDGET-RENT'},{id:'cost-2',expense_month:'2026-10-01',entry_kind:'actual',category:'season_parking',amount_sgd_minor:'12000',reference:'DEMO-PARKING'}],
 inventory_suppliers:[{id:'supplier',company_name:'示例设备公司',supplier_name:'示例淘宝店铺',active:true}],
 inventory_materials:[{id:'material-1',name:'700ml通用杯',base_unit:'each',active:true},{id:'material-2',name:'500ml通用杯',base_unit:'each',active:true},{id:'material-3',name:'桂花冻',base_unit:'g',active:true}],
 inventory_locations:[{id:'location',name:'麦弗森门店库存',active:true},{id:'warehouse',name:'总仓',active:true}]
};
const mocks={
 'next/link':{__esModule:true,default:({children,href,...rest})=>React.createElement('a',{href,...rest},children)},
 '@/lib/data':{requireAdmin:async()=>({role:'super_admin'})},
 '@/lib/supabase/server':{createClient:()=>({from:()=>{const q={select(){return q;},eq(){return q;},is(){return q;},order(){return q;},limit:async()=>({data:[{id:'store',brand_id:'brand',name:'麦弗森门店'}],error:null})};return q;}})},
 '@/lib/inventory/admin':{readInventoryTable:async table=>fixture[table]??[]},
 '@/lib/inventory/finance-admin':{financeBrands:async()=>[{id:'brand',name_en:'QINGYUNJIAN'}],singaporeMonth:()=> '2026-10'},
 '@/lib/inventory/finance':load('lib/inventory/finance.ts'),
 '@/lib/inventory/purchasing':load('lib/inventory/purchasing.ts'),
 '@/components/admin/inventory-form':{InventoryForm:({children})=>React.createElement('form',{onSubmit:e=>e.preventDefault()},children,React.createElement('button',{type:'button',className:'rounded-full bg-forest px-5 py-3 text-white'},'保存（演示）'))},
 '@/components/admin/opening-rows':load('components/admin/opening-rows.tsx')
};
(async()=>{
const cssFiles=fs.readdirSync('.next/static/css').filter(f=>f.endsWith('.css'));let css=cssFiles.map(f=>fs.readFileSync('.next/static/css/'+f,'utf8')).join('\n');
const fontRoot='/tmp/qyj-ui-preview/node_modules/@fontsource/noto-sans-sc';
if(fs.existsSync(fontRoot+'/400.css'))css+=fs.readFileSync(fontRoot+'/400.css','utf8').replaceAll('./files/',`file://${fontRoot}/files/`);
css+='\nbody{font-family:"Noto Sans SC",sans-serif;margin:0} .demo-banner{background:#f5e6bd;padding:14px 24px;font-size:14px;color:#183e31;border-bottom:1px solid #c4a65c}';
fs.mkdirSync('docs/ui-previews',{recursive:true});
for(const name of ['finance','opening']){const Page=load(`app/[locale]/admin/inventory/${name}/page.tsx`,mocks).default;const html=renderToStaticMarkup(await Page({params:{locale:'zh'},searchParams:{month:'2026-10'}}));fs.writeFileSync(`/tmp/qyj-${name}-preview.html`,'<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><body><div class="demo-banner">界面演示 · 以下全部为示例数据，未写入正式数据库</div>'+html+'</body></html>');}
console.log('Actual finance/opening pages rendered with explicit demo-data labels.');
})();
