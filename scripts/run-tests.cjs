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

Module._extensions[".ts"] = function compileTypeScript(module, filePath) {
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filePath
  }).outputText;
  module._compile(compiled, filePath);
};

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

const { scoreAscendAnswers } = require(join(process.cwd(), "lib", "ascend", "scoring.ts"));
const profileCases = {
  "luna-tide": ["calm", "floral", "balance", "moon", "leave-calm"],
  "night-nectar": ["energetic", "fruity", "inspiration", "stars", "recharged"],
  evenfall: ["tired", "smooth", "comfort", "moon", "leave-calm"],
  clearsky: ["curious", "bright", "refreshment", "clear-sky", "clear"],
  monsoon: ["adventurous", "bold", "refreshment", "wind", "recharged"],
  drift: ["adventurous", "fruity", "inspiration", "wind", "leave-calm"],
  stillearth: ["tired", "bold", "focus", "mountain", "grounded"],
  cloudlift: ["energetic", "bright", "inspiration", "stars", "uplifted"]
};

for (const [expected, answers] of Object.entries(profileCases)) {
  assert.equal(scoreAscendAnswers(answers), expected, `${expected} should be reachable from its representative answers`);
  assert.equal(scoreAscendAnswers(answers), scoreAscendAnswers(answers), "identical answers must produce an identical result");
}
assert.equal(scoreAscendAnswers([]), "luna-tide", "an exact tie should use the documented stable profile order");
console.log("Ascend scoring tests passed.");

const { ASCEND_CARD_SIZE, ASCEND_SOCIAL_FORMATS } = require(join(process.cwd(), "lib", "ascend", "card.ts"));
assert.deepEqual(ASCEND_CARD_SIZE, { width: 1080, height: 1920 }, "Ascend cards must use the approved portrait dimensions");
for (const dimensions of Object.values(ASCEND_SOCIAL_FORMATS)) assert.deepEqual(dimensions, ASCEND_CARD_SIZE, "All supported fullscreen story/status formats must remain 9:16");
const { REFERRAL_CODE_PATTERN } = require(join(process.cwd(), "lib", "ascend", "referrals.ts"));
assert.equal(REFERRAL_CODE_PATTERN.test("0123456789abcdef"), true, "generated referral codes should validate");
assert.equal(REFERRAL_CODE_PATTERN.test("not-a-referral"), false, "invalid referral codes should be rejected");
console.log("Ascend card dimensions passed.");
