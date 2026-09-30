const assert = require("node:assert/strict");
const { dateAtSingaporeMidnight, buildWindows, validateBatch } = require("./appzpos-backfill.cjs");
assert.equal(dateAtSingaporeMidnight("2026-09-01").toISOString(), "2026-08-31T16:00:00.000Z");
assert.throws(() => dateAtSingaporeMidnight("2026-02-30"));
const from = dateAtSingaporeMidnight("2026-09-01");
const to = new Date("2026-09-30T04:34:00Z");
const windows = buildWindows(from, to);
assert.equal(windows.length, 6);
const revisedWindows = buildWindows(dateAtSingaporeMidnight("2026-09-27"), to);
assert.equal(revisedWindows.length, 1);
assert.equal(revisedWindows[0].from.toISOString(), "2026-09-26T16:00:00.000Z");
assert.deepEqual(windows[0].from, from);
assert.deepEqual(windows.at(-1).to, to);
for (let i = 0; i < windows.length; i++) {
  assert(windows[i].to - windows[i].from <= 5 * 86400000);
  if (i) assert.deepEqual(windows[i - 1].to, windows[i].from);
}
assert.throws(() => buildWindows(to, from));
assert.throws(() => buildWindows(from, new Date(from.getTime() + 61 * 86400000)));
const order = { orderDetails: { storeID: "8C002BBD-4352-49D8-969E-7B649C1849A6", createdDateTime: "2026-09-01T00:00:00+08:00" } };
validateBatch([order], windows[0], (value) => new Date(value));
assert.throws(() => validateBatch([{ orderDetails: { ...order.orderDetails, storeID: "wrong" } }], windows[0], (value) => new Date(value)));
assert.throws(() => validateBatch([{ orderDetails: { ...order.orderDetails, createdDateTime: "2026-08-31T23:59:59+08:00" } }], windows[0], (value) => new Date(value)));
validateBatch([{ orderDetails: { ...order.orderDetails, createdDateTime: windows[0].to.toISOString() } }], windows[0], (value) => new Date(value));
console.log("Backfill checks passed: SGT dates, six contiguous batches, five-day maximum, and store/range guards.");
