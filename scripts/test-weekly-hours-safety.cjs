const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { assessWeeklyHoursEditorSafety } = require(join(process.cwd(), "lib", "store-types.ts"));

const openDay = { id: "open", store_id: "store-a", day_of_week: 1, interval_no: 1, opens_at: "09:00:00", closes_at: "17:00:00", is_closed: false, status: "active", deleted_at: null };
const closedDay = { id: "closed", store_id: "store-a", day_of_week: 2, interval_no: 1, opens_at: null, closes_at: null, is_closed: true, status: "active", deleted_at: null };

assert.deepEqual(assessWeeklyHoursEditorSafety([openDay], "store-a"), {
  safe: true,
  unsupportedDays: [],
  hasMultipleIntervals: false,
  hasOvernightIntervals: false
}, "a normal single interval must remain editable");
assert.equal(assessWeeklyHoursEditorSafety([closedDay], "store-a").safe, true, "a normal closed day must remain editable");

const splitSchedule = assessWeeklyHoursEditorSafety([
  openDay,
  { ...openDay, id: "open-2", interval_no: 2, opens_at: "18:00:00", closes_at: "22:00:00" }
], "store-a");
assert.equal(splitSchedule.safe, false, "a hidden second interval must block the replacement editor");
assert.equal(splitSchedule.hasMultipleIntervals, true);
assert.deepEqual(splitSchedule.unsupportedDays, [1]);

const overnightSchedule = assessWeeklyHoursEditorSafety([
  { ...openDay, id: "overnight", day_of_week: 3, opens_at: "22:00:00", closes_at: "02:00:00" }
], "store-a");
assert.equal(overnightSchedule.safe, false, "an overnight interval must block the replacement editor");
assert.equal(overnightSchedule.hasOvernightIntervals, true);
assert.deepEqual(overnightSchedule.unsupportedDays, [3]);

const otherOutletAdvancedRows = assessWeeklyHoursEditorSafety([
  openDay,
  { ...openDay, id: "store-b-split", store_id: "store-b", interval_no: 2 }
], "store-a");
assert.equal(otherOutletAdvancedRows.safe, true, "advanced rows from another outlet must not block this outlet");

const inactiveAdvancedRows = assessWeeklyHoursEditorSafety([
  openDay,
  { ...openDay, id: "archived-split", interval_no: 2, status: "archived" },
  { ...openDay, id: "deleted-overnight", opens_at: "22:00:00", closes_at: "02:00:00", deleted_at: "2026-01-01T00:00:00Z" }
], "store-a");
assert.equal(inactiveAdvancedRows.safe, true, "inactive or deleted rows are not part of the current schedule");

const root = process.cwd();
const actionSource = readFileSync(join(root, "app", "[locale]", "admin", "stores", "actions.ts"), "utf8");
const editorSource = readFileSync(join(root, "components", "admin", "operating-hours-editor.tsx"), "utf8");
const migrationSource = readFileSync(join(root, "supabase", "migrations", "0030_store_menu_cms.sql"), "utf8");

assert.match(editorSource, /assessWeeklyHoursEditorSafety/, "the UI must detect unsupported schedules");
assert.match(editorSource, /This editor is locked so split or overnight hours cannot be overwritten\./, "the UI must clearly explain the block");
assert.match(actionSource, /\.eq\("store_id", storeId\)/, "the server guard must read only the edited outlet");
assert.match(actionSource, /assessWeeklyHoursEditorSafety\(existingHours \?\? \[\], storeId\)/, "the server action must repeat the safety guard");
assert.ok(
  actionSource.indexOf("if (!safety.safe)") < actionSource.indexOf('rpc("replace_store_weekly_hours"'),
  "the action must block before calling the destructive replacement RPC"
);
assert.match(migrationSource, /delete from public\.store_operating_hours where store_id = p_store_id/i, "the test fixture must continue to detect why the guard is required");
for (const source of [actionSource, editorSource]) {
  assert.doesNotMatch(source, /11:00 AM|9:00 PM|11:00:00|21:00:00/i, "the safety fix must not introduce operating hours");
}

console.log("Weekly hours editor safety tests passed.");
