const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  formatEffectiveStoreHours,
  resolveEffectiveStoreHours
} = require(join(process.cwd(), "lib", "store-types.ts"));

const weeklyHours = [
  { id: "monday-1", store_id: "store-a", day_of_week: 1, interval_no: 1, opens_at: "09:00:00", closes_at: "17:00:00", is_closed: false },
  { id: "monday-2", store_id: "store-a", day_of_week: 1, interval_no: 2, opens_at: "18:00:00", closes_at: "22:00:00", is_closed: false },
  { id: "tuesday-closed", store_id: "store-a", day_of_week: 2, interval_no: 1, opens_at: null, closes_at: null, is_closed: true },
  { id: "wednesday-overnight", store_id: "store-a", day_of_week: 3, interval_no: 1, opens_at: "22:00:00", closes_at: "02:00:00", is_closed: false },
  { id: "store-b-monday", store_id: "store-b", day_of_week: 1, interval_no: 1, opens_at: "07:00:00", closes_at: "08:00:00", is_closed: false }
];
const exceptions = [
  { id: "closed", store_id: "store-a", exception_date: "2026-09-07", interval_no: 1, label: "Closure", opens_at: null, closes_at: null, is_closed: true },
  { id: "special-1", store_id: "store-a", exception_date: "2026-09-14", interval_no: 1, label: "Special hours", opens_at: "10:30:00", closes_at: "13:00:00", is_closed: false },
  { id: "special-2", store_id: "store-a", exception_date: "2026-09-14", interval_no: 2, label: "Special hours", opens_at: "15:00:00", closes_at: "19:30:00", is_closed: false },
  { id: "store-b-only", store_id: "store-b", exception_date: "2026-09-21", interval_no: 1, label: "Store B closure", opens_at: null, closes_at: null, is_closed: true }
];

function resolve(storeId, targetDate) {
  return resolveEffectiveStoreHours({ storeId, timezone: "Asia/Singapore", targetDate, weeklyHours, exceptions });
}

const normalMonday = resolve("store-a", "2026-08-31");
assert.equal(normalMonday.source, "weekly");
assert.equal(normalMonday.isClosed, false);
assert.equal(normalMonday.intervals.length, 2, "normal split intervals must be preserved");
assert.deepEqual(normalMonday.intervals.map((row) => row.intervalNo), [1, 2]);

const normalClosedDay = resolve("store-a", "2026-09-01");
assert.equal(normalClosedDay.source, "weekly");
assert.equal(normalClosedDay.isClosed, true);
assert.equal(formatEffectiveStoreHours(normalClosedDay), "Closed");

const closure = resolve("store-a", "2026-09-07");
assert.equal(closure.source, "exception");
assert.equal(closure.isClosed, true);
assert.equal(closure.intervals.length, 1, "a closure must replace every normal interval");

const special = resolve("store-a", "2026-09-14");
assert.equal(special.source, "exception");
assert.deepEqual(special.intervals.map((row) => [row.opensAt, row.closesAt]), [
  ["10:30:00", "13:00:00"],
  ["15:00:00", "19:30:00"]
]);

const unaffectedOutlet = resolve("store-a", "2026-09-21");
assert.equal(unaffectedOutlet.source, "weekly", "another outlet's exception must not override this outlet");
assert.equal(unaffectedOutlet.isClosed, false);

const overnight = resolve("store-a", "2026-09-02");
assert.deepEqual(
  [overnight.intervals[0].opensAt, overnight.intervals[0].closesAt],
  ["22:00:00", "02:00:00"],
  "overnight values must not be reordered or flattened"
);

const instantInSingapore = resolveEffectiveStoreHours({
  storeId: "store-a",
  timezone: "Asia/Singapore",
  targetDate: new Date("2026-08-30T16:30:00Z"),
  weeklyHours,
  exceptions
});
assert.equal(instantInSingapore.date, "2026-08-31", "Date instants must resolve using store-local semantics");

const root = process.cwd();
const storeTypesSource = readFileSync(join(root, "lib", "store-types.ts"), "utf8");
const homeSource = readFileSync(join(root, "app", "[locale]", "(public)", "page.tsx"), "utf8");
const contactSource = readFileSync(join(root, "app", "[locale]", "(public)", "contact", "page.tsx"), "utf8");
const layoutSource = readFileSync(join(root, "app", "[locale]", "layout.tsx"), "utf8");
for (const source of [storeTypesSource, homeSource, contactSource, layoutSource]) {
  assert.doesNotMatch(source, /11:00 AM|9:00 PM|11:00:00|21:00:00/i, "effective-hours code must not introduce MacPherson hours");
}
for (const source of [homeSource, contactSource, layoutSource]) {
  assert.match(source, /effectiveStoreHoursForDate/, "every public hours consumer must use the canonical resolver");
  assert.doesNotMatch(source, /publicWeeklyHours/, "public consumers must not bypass exception resolution");
}
assert.equal((contactSource.match(/effectiveStoreHoursForDate\(store\)/g) || []).length, 1, "English and Chinese contact views must share one resolved data source");
assert.match(layoutSource, /effectiveHours\?\.intervals/, "structured data must use effective intervals");
assert.match(layoutSource, /validFrom: effectiveHours\.date/);
assert.match(layoutSource, /validThrough: effectiveHours\.date/);
assert.doesNotMatch(layoutSource, /store\.store_operating_hours\.filter/, "structured data must not blindly publish weekly rows");

console.log("Effective store hours tests passed.");
