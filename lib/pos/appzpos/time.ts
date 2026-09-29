import type { AppzposPollWindow } from "./types";

export const APPZPOS_MAX_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;
const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;

export function parseAppzposSingaporeTimestamp(raw: string) {
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (!match) throw new Error("APPZPOS returned an invalid order timestamp.");
  const [, year, month, day, hour, minute, second, fraction = "0"] = match;
  const wallClockUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, +fraction.padEnd(3, "0"));
  const normalized = new Date(wallClockUtc - SINGAPORE_OFFSET_MS);
  if (Number.isNaN(normalized.valueOf())) throw new Error("APPZPOS returned an invalid order timestamp.");
  return normalized;
}

export function formatAppzposSingaporeDateTime(value: Date) {
  const local = new Date(value.getTime() + SINGAPORE_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")} ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}.${String(local.getUTCMilliseconds()).padStart(3, "0")}`;
}

export function splitAppzposWindows(from: Date, to: Date): AppzposPollWindow[] {
  if (!Number.isFinite(from.valueOf()) || !Number.isFinite(to.valueOf()) || to <= from) throw new Error("APPZPOS polling range is invalid.");
  const windows: AppzposPollWindow[] = [];
  for (let cursor = from.getTime(); cursor < to.getTime();) {
    const end = Math.min(cursor + APPZPOS_MAX_WINDOW_MS, to.getTime());
    windows.push({ from: new Date(cursor), to: new Date(end) });
    cursor = end;
  }
  return windows;
}
