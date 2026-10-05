const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = process.cwd();
const cache = new Map();
function load(relative, mocks = {}) {
  const filename = path.resolve(root, relative);
  if (!Object.keys(mocks).length && cache.has(filename)) return cache.get(filename);
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(root);
  mod.require = name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const file = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load(fs.existsSync(file + '.ts') ? file + '.ts' : file + '.tsx', mocks);
    }
    return require(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  if (!Object.keys(mocks).length) cache.set(filename, mod.exports);
  return mod.exports;
}
async function main() {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<html><body></body></html>', {url:'https://www.qyjworld.com/zh/group-orders?utm_source=google&token=private'});
  global.window=dom.window; global.document=dom.window.document; global.HTMLElement=dom.window.HTMLElement;
  global.FormData=dom.window.FormData;
  const { render, fireEvent, screen, waitFor } = require('@testing-library/react');
  const { GroupOrderForm } = load('components/group-orders/order-form.tsx', {
    'next/image': ({fill,sizes,...props}) => React.createElement('img',props),
    '@/components/pegasus-portrait': { PegasusPortrait: () => null }
  });
  let bodies=[]; let attempts=0;
  global.fetch=async (url,options) => { bodies.push(JSON.parse(options.body)); attempts++; return {ok:attempts>1,json:async()=>attempts>1 ? {reference:'QG-TEST',totalCups:12} : {error:'Temporary save failure'}}; };
  const view=render(React.createElement(GroupOrderForm,{menu:[{id:'a',name_en:'Tea A',name_zh:'茶A',description_en:'Tea',description_zh:'茶',availability_status:'available'}],locale:'zh',storeName:'Store'}));
  function set(name,value) { fireEvent.change(view.container.querySelector(`[name="${name}"]`),{target:{value}}); }
  fireEvent.change(screen.getByLabelText('茶A 杯数'),{target:{value:'12'}});
  for (const [key,value] of Object.entries({name:'QA customer',email:'qa@example.com',phone:'91234567',organisation:'QA company',date:'2026-10-10',time:'14:30',notes:'Keep this draft'})) set(key,value);
  fireEvent.submit(view.container.querySelector('form'));
  assert.match(view.container.textContent,/核对本次需求/); assert.equal(bodies.length,0);
  fireEvent.click(screen.getByText('返回修改'));
  assert.equal(view.container.querySelector('[name="email"]').value,'qa@example.com');
  assert.equal(view.container.querySelector('[name="notes"]').value,'Keep this draft');
  fireEvent.submit(view.container.querySelector('form'));
  fireEvent.click(screen.getByText('确认并提交需求'));
  await waitFor(()=>assert.match(view.container.textContent,/Temporary save failure/));
  fireEvent.click(screen.getByText('确认并提交需求'));
  await waitFor(()=>assert.match(view.container.textContent,/QG-TEST/));
  assert.equal(bodies[0].requestId,bodies[1].requestId); assert.equal(bodies[0].source,'google');
  assert.ok(!JSON.stringify(bodies).includes('private'));
  assert.equal(screen.getByText('凭此编号联系门店').getAttribute('href'),'/zh/contact');
  console.log('Group request review, retained draft, source privacy, retry identity and guest receipt checks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
