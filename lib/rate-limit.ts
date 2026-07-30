const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 12);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  existing.count += 1;
  return { ok: existing.count <= max };
}
