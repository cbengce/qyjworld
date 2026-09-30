"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const values = { commit: false, config: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--commit") values.commit = true;
    else if (argv[i] === "--config") values.config = argv[++i] || "";
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  if (!values.commit) throw new Error("Refusing to change partners without --commit.");
  if (!values.config) throw new Error("--config is required.");
  return values;
}

function safeConfig(file) {
  const resolved = path.resolve(file);
  const value = JSON.parse(fs.readFileSync(resolved, "utf8"));
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`Missing ${key}.`);
  }
  const url = new URL(value.SUPABASE_URL);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) throw new Error("Invalid Supabase URL.");
  return value;
}

async function findPartner(client, code) {
  const { data, error } = await client.from("partners")
    .select("id,partner_code,partner_name,status,archived_at")
    .ilike("partner_code", code)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function ensurePartner(client, specification) {
  let partner = await findPartner(client, specification.code);
  if (!partner) {
    const { data, error } = await client.from("partners").insert({
      partner_code: specification.code,
      partner_name: specification.name,
      partner_type: "corporate",
      customer_discount_rate: 0.05,
      partner_reward_rate: 0.05,
      status: "active",
      notes: "Configured for APPZPOS partner attribution."
    }).select("id,partner_code,partner_name").single();
    if (error) throw error;
    partner = data;
  } else {
    if (partner.archived_at) {
      throw new Error(`Partner ${specification.code} is archived; restore it in Admin Portal first.`);
    }
    const { data, error } = await client.from("partners").update({
      partner_name: specification.name,
      partner_type: "corporate",
      customer_discount_rate: 0.05,
      partner_reward_rate: 0.05,
      status: "active",
      updated_at: new Date().toISOString()
    }).eq("id", partner.id).select("id,partner_code,partner_name").single();
    if (error) throw error;
    partner = data;
  }
  return partner;
}

async function ensurePosAlias(client, partner, alias) {
  const { data: existing, error: readError } = await client.from("partner_referral_sessions")
    .select("id,partner_id").eq("referral_reference", alias).limit(1);
  if (readError) throw readError;
  if (existing?.[0]) {
    if (existing[0].partner_id !== partner.id) throw new Error(`POS alias ${alias} belongs to another partner.`);
    return;
  }
  const landing = new URL("https://www.qyjworld.com/api/partner/route");
  landing.searchParams.set("partner", partner.partner_code);
  const { error } = await client.from("partner_referral_sessions").insert({
    partner_id: partner.id,
    partner_code: partner.partner_code,
    referral_reference: alias,
    landing_url: landing.toString(),
    user_agent: "system:appzpos-alias"
  });
  if (error) throw error;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = safeConfig(args.config);
  const { createClient } = require("@supabase/supabase-js");
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const anytime = await ensurePartner(client, { code: "ANYTIME", name: "Anytime" });
  const ibis = await ensurePartner(client, { code: "IBISM2", name: "IBIS M2" });
  await ensurePosAlias(client, ibis, "IBIS M2");
  process.stdout.write(JSON.stringify({ status: "configured", partners: [anytime.partner_code, ibis.partner_code], aliases: ["IBIS M2"] }) + "\n");
}

if (require.main === module) {
  main().catch((error) => {
    const message = String(error?.message || error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
    process.stderr.write(`Partner configuration failed: ${message}\n`);
    process.exit(1);
  });
}

module.exports = { parseArgs, safeConfig };
