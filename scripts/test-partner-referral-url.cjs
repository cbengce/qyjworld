const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const filename = path.join(process.cwd(), "lib/partners/referral-url.ts");
const mod = new Module(filename, module);
mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, filename);
const { getPartnerReferralUrl } = mod.exports;
const savedSite = process.env.NEXT_PUBLIC_SITE_URL;
const savedRouter = process.env.PARTNER_ROUTER_BASE_URL;
try {
  for (const site of ["http://localhost:3000", "http://127.0.0.1:3000", "https://preview.vercel.app", "broken", "https://www.qyjworld.com/"]) {
    process.env.NEXT_PUBLIC_SITE_URL = site;
    delete process.env.PARTNER_ROUTER_BASE_URL;
    for (const code of ["TEF001", "ANYTIME", "IBISM2"]) {
      assert.equal(getPartnerReferralUrl(code), `https://order.qyjworld.com/Order/12?Referral_Code=${code}`);
    }
  }
  for (const route of ["http://localhost:3000/api/partner/route", "https://localhost/api/partner/route", "https://127.0.0.1/api/partner/route", "//preview.vercel.app/route", "https://www.qyjworld.com:3000/route"]) {
    process.env.PARTNER_ROUTER_BASE_URL = route;
    assert.equal(getPartnerReferralUrl("TEF001"), "https://order.qyjworld.com/Order/12?Referral_Code=TEF001");
  }
  process.env.PARTNER_ROUTER_BASE_URL = "/api/partner/route?source=qr";
  assert.equal(getPartnerReferralUrl(" ibism2 "), "https://order.qyjworld.com/Order/12?Referral_Code=IBISM2");
  console.log("Public Partner referral URLs passed: exact supplier URLs for all three partners; stale localhost and router settings cannot override them.");
} finally {
  for (const [key, value] of [["NEXT_PUBLIC_SITE_URL", savedSite], ["PARTNER_ROUTER_BASE_URL", savedRouter]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}
