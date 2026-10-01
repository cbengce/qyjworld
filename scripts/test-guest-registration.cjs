const assert = require('node:assert/strict'); const fs = require('node:fs'); const ts = require('typescript'); const Module = require('node:module');
const file = process.cwd() + '/app/[locale]/guest/register/actions.ts'; const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(process.cwd());
let calls = []; let response = { data: { session: null }, error: null };
mod.require = function (name) {
  if (name === 'next/headers') return { headers: () => ({ get: () => '127.0.0.1' }) };
  if (name === 'next/navigation') return { redirect: path => { throw new Error('REDIRECT:' + path); } };
  if (name === '@/lib/supabase/server') return { createClient: () => ({ auth: { signUp: async input => { calls.push(input); return response; } } }) };
  if (name === '@/lib/rate-limit') return { checkRateLimit: () => ({ ok: true }) };
  if (name === '@/lib/partners/referral-url') return { getPublicSiteUrl: () => 'https://www.qyjworld.com' };
  return Module.prototype.require.call(this, name);
};
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const details = { name: 'Guest QA', email: 'qa@example.com', phone: '+65 9123 4567', password: 'test-only-not-a-real-credential', privacy: 'on', website: '', locale: 'zh' };
const form = changes => { const f = new FormData(); for (const [key,value] of Object.entries({ ...details, ...changes })) f.set(key,value); return f; };
(async () => {
  const action = mod.exports.registerGuest;
  assert.equal((await action({}, form({ privacy: '' }))).ok,false); assert.equal(calls.length,0);
  assert.equal((await action({}, form({ website: 'bot' }))).ok,false); assert.equal(calls.length,0);
  assert.equal((await action({}, form({ password: 'short' }))).ok,false); assert.equal(calls.length,0);
  const result = await action({}, form({})); assert.equal(result.ok,true); assert.equal(calls.length,1);
  const signup = calls[0]; assert.equal(signup.options.data.account_type,'guest'); assert.equal(signup.options.data.locale,'zh'); assert.ok(signup.options.data.privacy_consent_at); assert.equal(signup.email_confirm,undefined); assert.ok(signup.options.emailRedirectTo.startsWith('https://www.qyjworld.com/api/auth/callback?next=')); assert.equal(signup.options.data.membership,undefined);
  response = { data: { session: null }, error: { message: 'Provider unavailable' } }; assert.equal((await action({}, form({}))).ok,false);
  response = { data: { session: {} }, error: null }; await assert.rejects(() => action({}, form({})),/REDIRECT:\/zh\/guest/);
  console.log('Guest signup validation, confirmation flow and no paid-membership side effects passed.');
})().catch(e => { console.error(e); process.exitCode=1; });
