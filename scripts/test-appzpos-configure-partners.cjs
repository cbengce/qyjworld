"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseArgs, safeConfig } = require("./appzpos-configure-partners.cjs");

assert.deepEqual(parseArgs(["--config", "/tmp/config.json", "--commit"]), {
  commit: true,
  config: "/tmp/config.json"
});
assert.throws(() => parseArgs(["--config", "/tmp/config.json"]), /without --commit/);
assert.throws(() => parseArgs(["--commit"]), /--config is required/);

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "appzpos-partner-test-"));
const validFile = path.join(directory, "valid.json");
fs.writeFileSync(validFile, JSON.stringify({
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-key"
}), { mode: 0o600 });
assert.equal(safeConfig(validFile).SUPABASE_URL, "https://example.supabase.co");

const invalidFile = path.join(directory, "invalid.json");
fs.writeFileSync(invalidFile, JSON.stringify({
  SUPABASE_URL: "http://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-only-key"
}), { mode: 0o600 });
assert.throws(() => safeConfig(invalidFile), /Invalid Supabase URL/);

fs.rmSync(directory, { recursive: true, force: true });
process.stdout.write("appzpos-configure-partners tests passed\n");
