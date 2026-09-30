const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod.require = name => name in mocks ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { provisionPartnerLogin } = load('lib/partners/provision-login.ts');
const partnerId = '11111111-1111-4111-8111-111111111111';
function fixture(options = {}) {
  const calls = [];
  const service = {
    from(table) {
      const query = { select() { return this; }, eq() { return this; }, async single() { return { data: { id: partnerId, status: options.inactive ? 'inactive' : 'active', archived_at: options.archived ? '2026-09-30' : null }, error: options.partnerError ? {} : null }; }, async insert(value) { calls.push({ type: table, value }); return { error: options.mappingError ? {} : null }; } };
      return query;
    },
    auth: { admin: {
      async createUser(value) { calls.push({ type: 'create', value }); return { data: { user: options.duplicate ? null : { id: 'new-user' } }, error: options.duplicate ? {} : null }; },
      async deleteUser(id) { calls.push({ type: 'delete', id }); return { error: options.cleanupError ? {} : null }; }
    } }
  };
  return { service, calls };
}
async function main() {
  const success = fixture();
  assert.equal(await provisionPartnerLogin(success.service, partnerId, 'partner@example.com', 'unique-temporary-password'), 'new-user');
  assert.equal(success.calls[0].value.app_metadata.partner_password_change_required, true);
  assert.equal(success.calls[1].value.partner_id, partnerId);
  assert.equal(success.calls[1].value.auth_user_id, 'new-user');
  for (const options of [{ inactive: true }, { archived: true }, { partnerError: true }]) {
    const blocked = fixture(options);
    await assert.rejects(provisionPartnerLogin(blocked.service, partnerId, 'partner@example.com', 'temporary'), /active partner/);
    assert.deepEqual(blocked.calls, []);
  }
  const duplicate = fixture({ duplicate: true });
  await assert.rejects(provisionPartnerLogin(duplicate.service, partnerId, 'existing@example.com', 'temporary'), /never overwritten/);
  assert.equal(duplicate.calls.length, 1);
  const failed = fixture({ mappingError: true });
  await assert.rejects(provisionPartnerLogin(failed.service, partnerId, 'partner@example.com', 'temporary'), /No login account was retained/);
  assert.equal(failed.calls[2].type, 'delete');
  const failedCleanup = fixture({ mappingError: true, cleanupError: true });
  await assert.rejects(provisionPartnerLogin(failedCleanup.service, partnerId, 'partner@example.com', 'temporary'), /unused Auth account/);

  let allowed = false;
  let mutations = 0;
  const actions = load('app/[locale]/admin/partners/actions.ts', {
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(url) { throw new Error('REDIRECT:' + url); } },
    '@/lib/admin-permissions': { async requireAdminPermission() { if (!allowed) throw new Error('FORBIDDEN'); return { staff: { id: 'staff' }, user: { id: 'admin' } }; } },
    '@/lib/partners/commercial-rates': {},
    '@/lib/partners/provision-login': { async provisionPartnerLogin() { mutations++; return 'new-user'; } },
    '@/lib/supabase/admin': { createServiceClient: () => ({ from: () => ({ async insert(value) { assert.ok(!JSON.stringify(value).includes('unique-temporary-password')); return { error: null }; } }) }) },
    '@/lib/supabase/server': {}
  });
  const form = new FormData();
  form.set('partnerId', partnerId); form.set('email', 'Partner@Example.com'); form.set('password', 'unique-temporary-password');
  await assert.rejects(actions.createPartnerLogin(form), /FORBIDDEN/);
  assert.equal(mutations, 0);
  allowed = true;
  form.set('password', 'short');
  await assert.rejects(actions.createPartnerLogin(form), /REDIRECT:.*error=/);
  assert.equal(mutations, 0);
  form.set('password', 'unique-temporary-password');
  await assert.rejects(actions.createPartnerLogin(form), /REDIRECT:.*notice=/);
  assert.equal(mutations, 1);
  let resetError = null;
  let activationError = null;
  let activationCount = 0;
  let accessAllowed = true;
  let signOutError = null;
  let invalidations = 0;
  const validation = load('lib/validation.ts', { '@/lib/partners/commercial-rates': {} });
  const authActions = load('app/actions.ts', {
    'next/cache': { revalidatePath() { invalidations++; } },
    'next/navigation': { redirect(url) { throw new Error('REDIRECT:' + url); } },
    '@/lib/constants': {}, '@/lib/data': {}, '@/lib/rate-limit': {},
    '@/lib/partners/access': { getActivePartnerForUser: async () => accessAllowed ? ({ partnerId }) : null },
    '@/lib/validation': validation,
    '@/lib/partners/referral-url': { getPublicSiteUrl: () => 'https://www.qyjworld.com' },
    '@/lib/supabase/server': { createClient: () => ({
      auth: { async signOut() { return { error: signOutError }; }, async getUser() { return { data: { user: { id: 'new-user', app_metadata: { partner_password_change_required: true, retained: 'keep' } } } }; }, async updateUser() { return { error: resetError }; } },
      from: () => ({ select() { return this; }, async eq() { return { count: 1, error: null }; } })
    }) },
    '@/lib/supabase/admin': { createServiceClient: () => ({ auth: { admin: { async updateUserById(id, value) {
      assert.equal(id, 'new-user'); assert.equal(value.app_metadata.partner_password_change_required, false); assert.equal(value.app_metadata.retained, 'keep'); activationCount++; return { error: activationError };
    } } } }) }
  });
  const resetForm = new FormData();
  resetForm.set('password', 'new-private-password'); resetForm.set('confirmPassword', 'new-private-password'); resetForm.set('locale', 'zh');
  resetError = { message: 'Password update rejected' };
  assert.equal((await authActions.resetPartnerPassword({}, resetForm)).ok, false);
  assert.equal(activationCount, 0);
  resetError = null; activationError = {};
  assert.equal((await authActions.resetPartnerPassword({}, resetForm)).ok, false);
  activationError = null;
  await assert.rejects(authActions.resetPartnerPassword({}, resetForm), /REDIRECT:\/zh\/partner\/dashboard/);
  accessAllowed = false;
  assert.equal((await authActions.resetPartnerPassword({}, resetForm)).ok, false);
  const logoutForm = new FormData(); logoutForm.set('locale', 'zh');
  signOutError = {}; const before = invalidations;
  await assert.rejects(authActions.logoutPartner(logoutForm), /Unable to sign out/);
  assert.equal(invalidations, before);
  signOutError = null;
  await assert.rejects(authActions.logoutPartner(logoutForm), /REDIRECT:\/zh\/partner\/login/);
  assert.equal(invalidations, before + 1);
  console.log('Partner login provisioning checks passed: permissions, validation, active partner, duplicate protection, mapping, cleanup and password-free audit.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
