const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file, mocks = {}) { const filename = path.resolve(file), m = new Module(filename, module); m.filename = filename; m.paths = Module._nodeModulePaths(process.cwd()); m.require = n => n in mocks ? mocks[n] : require(n); m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename); return m.exports; }
const model = load('lib/gallery-model.ts'), { gallerySeed: seed } = load('lib/gallery-seed.ts');
for (const e of seed) { assert.equal(model.gallerySchema.safeParse(e).success, true, e.slug); for (const url of [e.asset, e.thumbnail]) assert.ok(fs.existsSync(path.join('public', url)), url); }
assert.equal(seed.length, 35); assert.equal(new Set(seed.map(e => e.slug)).size, seed.length);
assert.equal(model.filterGallery(seed, 'photo').length, 3);
assert.equal(model.filterGallery(seed, 'poster', 'partners', 'tefuda').length, 2);
assert.equal(model.filterGallery(seed, 'poster', 'pegasus', '', 'Luna Tide').length, 1);
assert.equal(model.filterGallery(seed, 'video').length, 13);
const hidden = { ...seed[0], state: 'draft', version: 1 };
assert.ok(!model.filterGallery(model.mergeGallery(seed, [hidden])).find(e => e.slug === hidden.slug));
assert.equal(model.gallerySchema.safeParse({ ...seed[0], media: 'video' }).success, false);
for (const url of ['//evil.com/file.png','https://evil.com/file.png','/assets/../private.png','/assets/x.svg','javascript:alert(1)','/assets/photo.png?email=private']) assert.equal(model.isGalleryAsset(url), false, url);
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
assert.equal(model.isGalleryAsset('https://test.supabase.co/storage/v1/object/public/gallery/works/a.webp'), true);
assert.equal(model.isGalleryAsset('https://test.supabase.co/storage/v1/object/private/gallery/a.webp'), false);
const traffic = load('lib/site-traffic.ts');
assert.equal(traffic.isPublicTrafficPath('/zh/gallery/tefuda-card-drop'), true);
assert.equal(traffic.isPublicTrafficPath('/en/admin/gallery'), false);
let role = 'super_admin', writes = [], affected = 1, queryError = false, existing = seed, dbCalls = 0;
const db = { from(table) { dbCalls++; assert.equal(table, 'webhook_events'); return { async insert(v) { writes.push(v); return { error: queryError ? { code: '23505' } : null }; }, update(v) { writes.push(v); return { eq() { return this; }, async select() { return { data: affected ? [{ id: 'id' }] : [], error: null }; } }; } }; } };
const redirect = value => { throw new Error('REDIRECT:' + value); };
const actions = load('app/[locale]/admin/gallery/actions.ts', { 'next/navigation': { redirect }, 'next/cache': { revalidatePath() {} }, '@/lib/data': { requireAdmin: async () => ({ role }) }, '@/lib/supabase/admin': { createServiceClient: () => db }, '@/lib/gallery': { GALLERY_PROVIDER: 'qyj_gallery_v1', getGallery: async () => existing }, '@/lib/gallery-model': model });
function form(entry = seed[0], changes = {}) { const f = new FormData(); const fields = { locale: 'en', slug: entry.slug, version: entry.version, isNew: 'no', titleEn: entry.title.en, titleZh: entry.title.zh, captionEn: entry.caption.en, captionZh: entry.caption.zh, media: entry.media, asset: entry.asset, thumbnail: entry.thumbnail, tags: entry.tags.join(','), state: entry.state, archived: 'on', reviewed: 'on', order: entry.order, source: entry.source, ...changes }; for (const [key,value] of Object.entries(fields)) f.set(key, String(value)); entry.topics.forEach(t => f.append('topics', t)); return f; }
async function main() {
 role = 'staff'; await assert.rejects(actions.saveGallery(form()), /REDIRECT:\/en\/admin$/); assert.equal(dbCalls, 0);
 role = 'manager'; await assert.rejects(actions.saveGallery(form(seed[0], { reviewed: '' })), /error=/); assert.equal(writes.length, 0);
 await assert.rejects(actions.saveGallery(form(seed[0], { isNew: 'yes' })), /already%20in%20use/); assert.equal(writes.length, 0);
 await assert.rejects(actions.saveGallery(form()), /saved=1/); assert.equal(writes.length, 1); assert.equal(writes[0].provider, 'qyj_gallery_v1'); assert.equal(writes[0].payload_json.version, 1);
 existing = [{ ...seed[0], version: 1 }]; await assert.rejects(actions.saveGallery(form()), /has%20changed/); assert.equal(writes.length, 1);
 affected = 0; await assert.rejects(actions.saveGallery(form(existing[0])), /Someone%20else/);
 role = 'staff'; assert.deepEqual(await actions.prepareGalleryUpload({ locale: 'en', type: 'image/png', size: 123 }), { error: 'You do not have permission to upload.' });
 role = 'manager'; assert.ok((await actions.prepareGalleryUpload({ locale: 'en', type: 'image/svg+xml', size: 123 })).error); assert.ok((await actions.prepareGalleryUpload({ locale: 'en', type: 'video/mp4', size: 51*1024*1024 })).error);
 console.log('Gallery tests passed: 35 valid works and files, including 13 videos, bilingual search and independent filters, unpublished overrides, media/URL validation, public traffic paths, role protection, reviewed publication, collision and concurrency guards.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
