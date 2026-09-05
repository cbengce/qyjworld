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

const { ASCEND_CARD_SIZE, ASCEND_SOCIAL_FORMATS, ascendCardReferralUrl } = require(join(process.cwd(), "lib", "ascend", "card.ts"));
assert.deepEqual(ASCEND_CARD_SIZE, { width: 1080, height: 1920 }, "Ascend cards must use the approved portrait dimensions");
for (const dimensions of Object.values(ASCEND_SOCIAL_FORMATS)) assert.deepEqual(dimensions, ASCEND_CARD_SIZE, "All supported fullscreen story/status formats must remain 9:16");
assert.equal(ascendCardReferralUrl(), "https://qyjworld.com/en/ascend", "card generation must work without a referral service");
assert.equal(ascendCardReferralUrl("0123456789abcdef"), "https://qyjworld.com/en/ascend?ref=0123456789abcdef", "successful referrals should enrich the card URL");
const { REFERRAL_CODE_PATTERN } = require(join(process.cwd(), "lib", "ascend", "referrals.ts"));
assert.equal(REFERRAL_CODE_PATTERN.test("0123456789abcdef"), true, "generated referral codes should validate");
assert.equal(REFERRAL_CODE_PATTERN.test("not-a-referral"), false, "invalid referral codes should be rejected");

const { ascendCardVisuals } = require(join(process.cwd(), "lib", "ascend", "card-visuals.ts"));
const { ascendProfiles } = require(join(process.cwd(), "lib", "ascend", "profiles.ts"));
const expectedIdentities = {
  "luna-tide": ["001 / 008", "LUNA TIDE", "鏈堟睈", "CALM CLARITY", "Moon Lake"],
  "night-nectar": ["002 / 008", "NIGHT NECTAR", "鏄熸触", "TRANSFORMATIVE ALLURE", "Rain Pavilion"],
  evenfall: ["003 / 008", "EVENFALL", "褰掑矚", "GENTLE WARMTH", "Autumn Forest"],
  clearsky: ["004 / 008", "CLEARSKY", "鐮翠簯", "CLEAR RESOLVE", "Cloud Valley"],
  monsoon: ["005 / 008", "MONSOON", "闀块", "RESTLESS MOMENTUM", "Highland Rain"],
  drift: ["006 / 008", "DRIFT", "浜戦殣", "QUIET FREEDOM", "Ancient Tea Path"],
  stillearth: ["007 / 008", "STILLEARTH", "灞辨", "GROUNDED STRENGTH", "Winter Silence"],
  cloudlift: ["008 / 008", "CLOUDLIFT", "鎵舵憞", "RISING POSSIBILITY", "Highland Sunrise"]
};
for (const [slug, [edition, nameEn, nameZh, title, motif]] of Object.entries(expectedIdentities)) {
  assert.equal(ascendCardVisuals[slug].edition, edition, `${slug} should use the approved edition`);
  assert.equal(ascendCardVisuals[slug].motif, motif, `${slug} should use the approved location`);
  assert.equal(ascendProfiles[slug].nameEn, nameEn, `${slug} should use the approved English name`);
  assert.equal(ascendProfiles[slug].nameZh, nameZh, `${slug} should use the approved Chinese name`);
  assert.equal(ascendProfiles[slug].title, title, `${slug} should use the approved theme`);
  assert.match(ascendCardVisuals[slug].landscape ?? "", new RegExp(`/assets/ascend/landscapes/${slug}`), `${slug} should use its deterministic landscape`);
}
const editions = Object.values(ascendCardVisuals).map(({ edition }) => edition);
assert.equal(new Set(editions).size, 8, "every Ascend identity should have a unique edition number");
for (const edition of editions) {
  assert.match(edition, /^\d{3} \/ 008$/, "Ascend edition numbers must use the production three-digit format");
}

const resultSource = readFileSync(join(process.cwd(), "components", "ascend", "ascend-result.tsx"), "utf8");
for (const label of ["Download Card", "Copy Caption", "Copy Link", "Share My ASCEND Card"]) {
  assert.match(resultSource, new RegExp(label), `Ascend result must expose the ${label} control`);
}
const buttonOrder = ["Download Card", "Copy Caption", "Copy Link", "Share My ASCEND Card"].map((label) => resultSource.indexOf(`>${label}</button>`));
assert.deepEqual(buttonOrder, [...buttonOrder].sort((left, right) => left - right), "Ascend sharing controls must follow the customer workflow");
assert.match(resultSource, /https:\/\/qyjworld\.com\/\$\{safeLocale\}\/ascend\?ref=\$\{referralCode\}/, "referral links must use the production Ascend URL");
assert.doesNotMatch(resultSource, /localhost/i, "production Ascend results must not contain localhost URLs");
assert.match(resultSource, /disabled=\{generating\}/, "Create My Card should be disabled only during active generation");
assert.doesNotMatch(resultSource, /disabled=\{[^}]*referralCode/, "referral availability must not disable card generation");
assert.doesNotMatch(resultSource, /if \(!referralCode\).*return/, "referral failure must not short-circuit card generation");
assert.match(resultSource, /finally \{ setGenerating\(false\); \}/, "generation state must reset after success or failure");
assert.match(resultSource, /Creating My Card鈥?, "the result should expose visible generation progress");
assert.match(resultSource, /Card creation failed\. Please try again\./, "rendering failures should be recoverable");
assert.match(resultSource, /Referral features are temporarily unavailable/, "referral failure should use non-blocking messaging");
assert.match(resultSource, /href=\{`\/\$\{locale\}\/ascend`\}/, "Try Again should return to a fresh quiz");

const { buildShareCaption } = require(join(process.cwd(), "lib", "ascend", "share.ts"));
for (const profile of Object.values(ascendProfiles)) {
  const captionUrl = `https://qyjworld.com/en/ascend?ref=0123456789abcdef`;
  const caption = buildShareCaption(profile, captionUrl);
  assert.match(caption, /I discovered where I belong\./, `${profile.slug} caption should use the approved opening`);
  assert.match(caption, new RegExp(profile.nameEn), `${profile.slug} caption should include the profile name`);
  assert.match(caption, new RegExp(profile.title), `${profile.slug} caption should include the approved theme`);
  assert.match(caption, new RegExp(profile.quote.replaceAll(".", "\\.")), `${profile.slug} caption should include its statement`);
  assert.match(caption, /https:\/\/qyjworld\.com\/en\/ascend\?ref=0123456789abcdef/, `${profile.slug} caption should include the referral URL`);
  for (const hashtag of ["#QingYunJian", "#BornToAscend", "#AscendTeaProfile", "#TeaJourney", "#TeaPersonality"]) assert.match(caption, new RegExp(hashtag), `${profile.slug} caption should include ${hashtag}`);
  assert.doesNotMatch(caption, /plac(?!e)/i, `${profile.slug} caption must not contain the historical typo`);
}
assert.match(resultSource, /Caption copied\. Ready to paste into Instagram, TikTok or Xiaohongshu\./, "Copy Caption should provide useful confirmation");
assert.match(resultSource, /Referral link copied\./, "Copy Link should provide referral-specific confirmation");

const { trackAscendEvent } = require(join(process.cwd(), "lib", "ascend", "analytics.ts"));
const previousWindow = global.window;
global.window = { gtag() { throw new Error("analytics unavailable"); } };
assert.doesNotThrow(() => trackAscendEvent("ascend_card_generated", { locale: "en" }), "analytics failure must not block card generation");
global.window = previousWindow;

const referralRouteSource = readFileSync(join(process.cwd(), "app", "api", "ascend", "referrals", "route.ts"), "utf8");
const referralClientSource = readFileSync(join(process.cwd(), "lib", "ascend", "referrals.ts"), "utf8");
assert.match(referralRouteSource, /export async function GET/, "referral progress should be served by a server route");
assert.match(referralRouteSource, /createServiceClient\(\)/, "referral progress should use server-side database access");
assert.doesNotMatch(referralClientSource, /SERVICE_ROLE|createServiceClient/, "the browser referral client must not contain server credentials");
assert.match(resultSource, /overflow-hidden/, "the result page should prevent horizontal overflow at mobile widths");
assert.match(resultSource, /flex flex-wrap gap-3/, "result actions should wrap at 390px");
console.log("Ascend card dimensions passed.");
require("./test-store-menu-cms.cjs");
require("./test-store-menu-migration-preflight.cjs");
require("./test-canonical-migration-chain.cjs");