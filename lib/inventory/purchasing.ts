export const PURCHASE_PLATFORMS = {
  pinduoduo: "拼多多", douyin: "抖音", taobao: "淘宝", wechat: "微信"
} as const;

/** Exact nonnegative currency input; never use binary floats to allocate money. */
export function moneyMinor(value: string): bigint {
  if (!/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(value)) throw new Error("Invalid money amount");
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, "0"));
}

export function weightUnits(value: string): bigint {
  if (!/^(0|[1-9]\d{0,13})(\.\d{1,6})?$/.test(value)) throw new Error("Invalid allocation weight");
  const [whole, decimal = ""] = value.split(".");
  const result = BigInt(whole) * 1000000n + BigInt(decimal.padEnd(6, "0"));
  if (result <= 0n) throw new Error("Allocation weight must be positive");
  return result;
}

/** Largest remainder allocation: shares add to the exact number of SGD cents. */
export function allocateFreight(totalMinor: bigint, rows: { id: string; weight: string }[]) {
  if (totalMinor < 0n || !rows.length || new Set(rows.map(r => r.id)).size !== rows.length
    || rows.some(r => !r.id)) throw new Error("Invalid freight allocation");
  const weighted = rows.map(row => ({ ...row, units: weightUnits(row.weight) }));
  const totalWeight = weighted.reduce((sum, r) => sum + r.units, 0n);
  const shares = weighted.map(row => ({ id: row.id, minor: totalMinor * row.units / totalWeight,
    remainder: totalMinor * row.units % totalWeight }));
  let left = totalMinor - shares.reduce((sum, r) => sum + r.minor, 0n);
  const ranked = [...shares].sort((a, b) => a.remainder === b.remainder
    ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.remainder > b.remainder ? -1 : 1);
  for (const row of ranked) { if (!left) break; row.minor++; left--; }
  return shares.map(({ id, minor }) => ({ id, minor: minor.toString() }));
}

export function actualSgdCost(payments: { actualSgd: string; feeSgd: string }[]) {
  return payments.reduce((sum, p) => sum + moneyMinor(p.actualSgd) + moneyMinor(p.feeSgd), 0n);
}

export function displayMinor(value: string) {
  const n = BigInt(value);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
