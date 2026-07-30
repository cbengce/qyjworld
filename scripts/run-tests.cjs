const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function requireTypeScriptModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  }).outputText;

  const mod = new Module(filePath, module.parent);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod._compile(compiled, filePath);
  return mod.exports;
}

const validationPath = join(process.cwd(), "lib", "validation.ts");
if (!existsSync(validationPath)) {
  throw new Error(`Missing validation module: ${validationPath}`);
}

const { promotionSchema, registerSchema } = requireTypeScriptModule(validationPath);

const validMember = registerSchema.safeParse({
  fullName: "Test Member",
  mobile: "91234567",
  email: "member@example.com",
  password: "password123",
  termsConsent: true,
  privacyConsent: true,
  marketingConsent: false
});
assert.equal(validMember.success, true, "registerSchema should accept a valid Singapore mobile number");

const invalidPrefix = registerSchema.safeParse({
  fullName: "Test Member",
  mobile: "51234567",
  email: "member@example.com",
  password: "password123",
  termsConsent: true,
  privacyConsent: true,
  marketingConsent: false
});
assert.equal(invalidPrefix.success, false, "registerSchema should reject invalid Singapore mobile prefixes");

for (const ctaUrl of ["/en/register", "/en/menu", "/en/membership", "/en/promotions", "https://example.com"]) {
  const parsed = promotionSchema.safeParse({
    locale: "en",
    slug: "student-month",
    title: "Student Month",
    ctaUrl,
    displayOrder: 0,
    showOnHomepage: false,
    status: "draft"
  });
  assert.equal(parsed.success, true, `promotionSchema should accept CTA URL: ${ctaUrl}`);
}

console.log("Validation tests passed.");
