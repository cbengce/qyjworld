const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relative, mocks) {
  const filename = path.join(process.cwd(), relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod.require = (name) => name in mocks ? mocks[name] : require(name);
  mod._compile(compiled, filename);
  return mod.exports;
}

let user = null;
let staff = null;
const query = { select() { return this; }, eq() { return this; }, is() { return this; }, async maybeSingle() { return { data: staff }; } };
const data = load("lib/data.ts", {
  "next/navigation": { redirect(url) { throw new Error(`REDIRECT:${url}`); } },
  "@/lib/supabase/server": { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
  "@/lib/supabase/admin": { createServiceClient: () => ({ from: () => query }) },
  "@/lib/membership": { daysRemaining: () => 0 }
});

async function main() {
  await assert.rejects(data.requireAdmin("en"), /REDIRECT:\/en\/login/);
  user = { id: "member-id" };
  await assert.rejects(data.requireAdmin("en"), /REDIRECT:\/en\/member/);
  staff = { id: "staff-id", status: "active", staff_role_assignments: [{ status: "active", roles: { role_code: "super_admin", status: "active" } }] };
  assert.equal((await data.requireAdmin("en")).role, "super_admin");
  staff.staff_role_assignments[0].status = "inactive";
  await assert.rejects(data.requireAdmin("en"), /REDIRECT:\/en\/member/);

  const { Header } = load("components/header.tsx", {
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/navigation": { usePathname: () => "/en/admin/partner-dashboard" },
    "@/lib/constants": { BRAND: { nameEn: "QINGYUNJIAN" } },
    "@/lib/i18n/routing": { localizedPath: (locale, suffix = "") => `/${locale}${suffix}` },
    "@/components/logo": { Logo: () => null },
    "@/app/actions": { logoutAccount: "/test-logout" }
  });
  const guest = renderToStaticMarkup(React.createElement(Header, { locale: "en" }));
  assert.match(guest, />Login</);
  assert.match(guest, />Join Now</);
  assert.match(guest, /href="\/en\/partner\/login"/);
  assert.match(guest, /Partner Dashboard/);
  const signedIn = renderToStaticMarkup(React.createElement(Header, { locale: "en", account: { label: "Super Admin", email: "admin@example.com", href: "/en/admin" } }));
  assert.match(signedIn, />Super Admin</);
  assert.match(signedIn, /admin@example.com/);
  assert.match(signedIn, />Logout</);
  assert.doesNotMatch(signedIn, />Login</);
  assert.doesNotMatch(signedIn, />Join Now</);
  assert.match(signedIn, /href="\/en\/partner\/login"/);
  const chinese = renderToStaticMarkup(React.createElement(Header, { locale: "zh" }));
  assert.match(chinese, /href="\/zh\/partner\/login"/);
  assert.match(chinese, /合作伙伴后台/);
  console.log("Login experience checks passed: guest, member, super admin, revoked role, and header identity.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
