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
  for (const section of ['search', 'categories']) {
    const { default: Layout } = load(`app/[locale]/(public)/${section}/layout.tsx`);
    assert.equal(renderToStaticMarkup(React.createElement(Layout, { params: { locale: 'zh' } }, 'Chinese content')), 'Chinese content');
  }
  const { allContent, articles, guides } = load('lib/content/catalog.ts');
  const { localizeContent, categoryLabel } = load('lib/content/discovery.ts');
  const { parseMarkdown } = load('lib/content/markdown.ts');
  assert.equal(articles.length, 30); assert.equal(guides.length, 13);
  assert.equal(new Set(allContent.map(entry => entry.slug)).size, 43);
  for (const entry of allContent) {
    assert.ok(entry.zh, `Missing Chinese: ${entry.slug}`);
    assert.ok(fs.existsSync(path.join(root, 'public', entry.heroImage)), `Missing image: ${entry.slug}`);
    for (const related of entry.relatedSlugs) assert.ok(allContent.some(e => e.slug === related), `Broken related link: ${related}`);
    const chinese = localizeContent(entry, 'zh');
    assert.match(chinese.title, /\p{Script=Han}/u);
    assert.match(chinese.description, /\p{Script=Han}/u);
    assert.match(chinese.author.name, /编辑团队/);
    assert.notEqual(categoryLabel(entry.category, 'zh'), entry.category);
    for (const text of [entry.markdown, chinese.markdown]) {
      const headings = parseMarkdown(text).filter(block => block.type === 'heading');
      assert.ok(headings.length >= 3);
      assert.equal(new Set(headings.map(h => h.id)).size, headings.length, `Duplicate heading anchor: ${entry.slug}`);
    }
  }
  const { buildSearchIndex, searchRecords } = load('lib/content/search.ts');
  const index = buildSearchIndex('zh', []);
  assert.ok(searchRecords(index, '乌龙').length >= 2);
  assert.ok(searchRecords(index, '办公室').some(record => record.href === '/zh/guides/office-tea-group-orders-singapore'));
  assert.ok(index.filter(r => r.type === 'Guide' || r.type === 'Article').every(r => /\p{Script=Han}/u.test(r.title)));
  const { switchLocalePath } = load('lib/i18n/routing.ts');
  assert.equal(switchLocalePath('/en/menu/abc', 'zh'), '/zh/menu/abc');
  assert.equal(switchLocalePath('/zh/guides/event-tea-order-checklist', 'en'), '/en/guides/event-tea-order-checklist');
  assert.equal(switchLocalePath('/en', 'zh'), '/zh');
  let navigated;
  const nav = { usePathname: () => '/zh/search', useRouter: () => ({ push: value => { navigated = value; } }) };
  const { LanguageSwitch } = load('components/language-switch.tsx', { 'next/link': ({ children, ...props }) => React.createElement('a', props, children), 'next/navigation': nav });
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://qyjworld.com/zh/search?q=%E8%8C%B6&utm_source=test#results' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
  const { render, fireEvent, cleanup } = require('@testing-library/react');
  const mounted = render(React.createElement(LanguageSwitch, { locale: 'zh' }));
  fireEvent.click(mounted.getByRole('link'));
  assert.equal(navigated, '/en/search?q=%E8%8C%B6&utm_source=test#results');
  assert.equal(document.documentElement.lang, 'zh-SG');
  mounted.rerender(React.createElement(LanguageSwitch, { locale: 'en' }));
  assert.equal(document.documentElement.lang, 'en-SG');
  cleanup();
  const markup = renderToStaticMarkup(React.createElement(LanguageSwitch, { locale: 'zh' }));
  assert.match(markup, /href="\/en\/search"/); assert.doesNotMatch(markup, /sm:inline|hidden/);
  const { discoveryReadiness } = load('lib/discovery-readiness.ts');
  const report = discoveryReadiness(allContent, [{ id: 'menu-id', product_id: 'product-id', name_en: 'Tea', name_zh: '茶', description_en: 'Tea', description_zh: '茶饮', regular_price: 0, image_url: '/tea.png' }]);
  assert.equal(report.bilingual, 43); assert.deepEqual(report.untranslated, []);
  assert.deepEqual(report.products[0].missing, []); assert.equal(report.products[0].productId, 'product-id');
  const missing = discoveryReadiness([], [{ id:'m', name_en:'Tea', name_zh:'', description_en:null, description_zh:null, regular_price:null, image_url:null }]);
  assert.equal(missing.products[0].missing.length, 5);
  const { default: sitemap } = load('app/sitemap.ts', { '@/lib/menu': { getMenuItems: async () => [{ id: 'current-drink-id' }] }, '@/lib/promotions': { getPublicPromotions: async () => [] } });
  const urls = await sitemap();
  for (const entry of allContent) {
    const route = entry.kind === 'guide' ? 'guides' : 'blog';
    for (const locale of ['en','zh']) assert.ok(urls.some(item => item.url.endsWith(`/${locale}/${route}/${entry.slug}`)));
  }
  assert.ok(urls.some(item => item.url.endsWith('/zh/categories/tea-ingredients')));
  assert.ok(urls.some(item => item.url.endsWith('/zh/group-orders')));
  let queried = false;
  const { default: AdminPage } = load('app/[locale]/admin/discovery/page.tsx', {
    '@/components/admin/admin-navigation': { AdminNavigation: () => null },
    '@/lib/data': { requireAdmin: async () => ({ role: 'cashier' }) },
    '@/lib/supabase/admin': { createServiceClient: () => { queried = true; throw Error('must not query'); } },
    '@/lib/menu': { getMenuItems: async () => [] }, '@/lib/stores': { getPrimaryStore: async () => null },
    'next/navigation': { redirect: url => { throw Error(`REDIRECT:${url}`); } }
  });
  await assert.rejects(AdminPage({ params: { locale: 'zh' } }), /REDIRECT:\/zh\/admin/);
  assert.equal(queried, false);
  const statusResults = [2, 1, 3, 4, 1];
  const queries = [];
  function mockClient(fail) { return { from(table) {
    const params = { table }; queries.push(params);
    return { select(fields, options) { params.options = options; return this; }, eq(key,value) { params[key] = value; return this; }, gte(key,value) { params[key] = value; return this; }, order() { return this; }, limit() { return this; }, then(resolve) { resolve({ count: statusResults[queries.length - 1], error: fail ? { message: 'unavailable' } : null }); } };
  } }; }
  const pageMocks = {
    '@/components/admin/admin-navigation': { AdminNavigation: () => null },
    '@/lib/data': { requireAdmin: async () => ({ role: 'manager' }) },
    '@/lib/supabase/admin': { createServiceClient: () => mockClient(true) },
    '@/lib/menu': { getMenuItems: async () => [] }, '@/lib/stores': { getPrimaryStore: async () => null },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    'next/navigation': { redirect: url => { throw Error(`REDIRECT:${url}`); } }
  };
  const errorPage = load('app/[locale]/admin/discovery/page.tsx', pageMocks).default;
  const errorMarkup = renderToStaticMarkup(await errorPage({ params: { locale: 'zh' } }));
  assert.match(errorMarkup, /资料暂不可读取/);
  assert.ok(queries.every(query => query.provider === 'qyj_group_orders_v1' && (query.options?.head || query.options === undefined)));
  console.log('Discovery checks passed: 43 bilingual entries, images, references, anchors, Chinese search, language switching, readiness, sitemap and admin access.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
