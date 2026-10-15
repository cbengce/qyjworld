const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,mocks={}){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(process.cwd());m.require=n=>n in mocks?mocks[n]:require(n);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;}
const lib=load('lib/site-traffic.ts');
const value={eventId:'01234567-89ab-4cde-8f01-23456789abcd',event:'page_view',path:'/en/menu',source:'google',device:'mobile'};
for(const p of ['/en','/zh/menu','/en/blog/tea-guide','/zh/group-orders'])assert.equal(lib.isPublicTrafficPath(p),true);
for(const p of ['/en/admin','/en/partner/dashboard','/en/member','/en/register','/en/menu?email=private','https://evil.com/en','/en/menu/../admin'])assert.equal(lib.isPublicTrafficPath(p),false);
assert.equal(lib.trafficSchema.safeParse({...value,email:'private@example.com'}).success,false);
assert.equal(lib.trafficSource('https://chatgpt.com/c/private',''),'chatgpt');assert.equal(lib.trafficSource('https://www.google.com/search?q=private',''),'google');assert.equal(lib.trafficSource('https://gemini.google.com/app',''),'gemini');assert.equal(lib.trafficSource('https://google.com.evil.com/',''),'other');assert.equal(lib.trafficSource('','?utm_source=perplexity&email=private'),'perplexity');assert.equal(lib.trafficSource('',''),'direct');
const stats=lib.summariseTraffic([{received_at:'2026-10-14T16:00:00Z',payload_json:value},{received_at:'2026-10-15T01:00:00Z',payload_json:{...value,source:'chatgpt'}},{received_at:'2026-10-15T01:00:00Z',payload_json:{...value,event:'order_click'}},{received_at:'bad',payload_json:value}]);assert.equal(stats.page_view,2);assert.equal(stats.order_click,1);assert.equal(stats.aiViews,1);assert.deepEqual(stats.days,[['2026-10-15',2]]);
let saves=[],rate=true,saveError=null,role='super_admin',serviceCalls=0,readError=false;
const client={from(table){assert.equal(table,'webhook_events');let count=0;const q={select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){count=1;return this},range(){return this},async insert(v){saves.push(v);return {error:saveError}},then(resolve,reject){return Promise.resolve({data:readError?null:count?[{received_at:'2026-10-15T01:00:00Z'}]:[{received_at:'2026-10-15T01:00:00Z',payload_json:value}],error:readError?{}:null}).then(resolve,reject)}};return q;}};
const route=load('app/api/site-traffic/route.ts',{'@/lib/site-traffic':lib,'@/lib/rate-limit':{checkRateLimit:()=>({ok:rate})},'@/lib/supabase/admin':{createServiceClient:()=>client}});
const {NextRequest}=require('next/server');
const req=(data=value,headers={})=>new NextRequest('https://www.qyjworld.com/api/site-traffic',{method:'POST',headers:{origin:'https://www.qyjworld.com','content-type':'application/json','user-agent':'Mozilla/5.0','x-forwarded-for':'192.0.2.5',...headers},body:typeof data==='string'?data:JSON.stringify(data)});
const nav=()=>null;
const page=load('app/[locale]/admin/traffic/page.tsx',{'@/lib/site-traffic':lib,'@/components/admin/admin-navigation':{AdminNavigation:nav},'@/lib/data':{requireAdmin:async()=>({role})},'@/lib/supabase/admin':{createServiceClient:()=>{serviceCalls++;return client}},'next/link':({children,...p})=>React.createElement('a',p,children)}).default;
async function main(){
 assert.equal((await route.POST(req(value,{origin:'https://evil.com'}))).status,403);assert.equal(saves.length,0);
 assert.equal((await route.POST(req(value,{'user-agent':'Googlebot'}))).status,204);assert.equal(saves.length,0);
 assert.equal((await route.POST(req(value,{dnt:'1'}))).status,204);assert.equal(saves.length,0);
 assert.equal((await route.POST(req({...value,path:'/en/admin'}))).status,400);assert.equal(saves.length,0);
 assert.equal((await route.POST(req({...value,email:'secret'}))).status,400);assert.equal(saves.length,0);
 assert.equal((await route.POST(req('bad json'))).status,400);assert.equal((await route.POST(req('x'.repeat(1025)))).status,413);
 rate=false;assert.equal((await route.POST(req())).status,429);rate=true;
 assert.equal((await route.POST(req())).status,204);assert.equal(saves.length,1);assert.deepEqual(saves[0].payload_json,value);assert.equal(saves[0].provider,lib.TRAFFIC_PROVIDER);assert.ok(!JSON.stringify(saves).includes('192.0.2.5'));assert.match(saves[0].payload_hash,/^[a-f0-9]{64}$/);
 saveError={code:'23505'};assert.equal((await route.POST(req())).status,204);saveError={code:'503'};assert.equal((await route.POST(req())).status,503);saveError=null;
 role='manager';let html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{}}));assert.match(html,/Access unavailable/);assert.equal(serviceCalls,0);role='super_admin';
 html=renderToStaticMarkup(await page({params:{locale:'zh'},searchParams:{days:'7'}}));assert.match(html,/网站访问统计/);assert.match(html,/不是独立人数/);assert.match(html,/Google/);
 readError=true;html=renderToStaticMarkup(await page({params:{locale:'en'},searchParams:{}}));assert.match(html,/does not mean there were zero views/);assert.doesNotMatch(html,/Recorded page views<\/h2>/);
 const recorder=fs.readFileSync('components/site-traffic-recorder.tsx','utf8');assert.doesNotMatch(recorder,/localStorage|sessionStorage|document\.cookie/);assert.match(recorder,/credentials: "omit"/);assert.match(recorder,/navigator\.doNotTrack/);assert.match(recorder,/globalPrivacyControl/);
 console.log('Traffic tests passed: public-only paths, source classification, strict data minimisation, Singapore dates, bot and opt-out exclusions, origin/rate/body guards, persistence/idempotency, failure states and Super Admin access.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
