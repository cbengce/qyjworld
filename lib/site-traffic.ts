import { z } from "zod";
export const TRAFFIC_PROVIDER = "qyj_site_traffic_v1";
export const trafficSources = ["direct", "internal", "google", "bing", "chatgpt", "perplexity", "copilot", "gemini", "instagram", "facebook", "tiktok", "xiaohongshu", "other"] as const;
export const trafficSchema = z.object({ eventId: z.string().uuid(), event: z.enum(["page_view", "order_click", "group_click"]), path: z.string().max(160), source: z.enum(trafficSources), device: z.enum(["mobile", "desktop"]) }).strict().refine(value => isPublicTrafficPath(value.path), { message: "Public pages only" });
export type TrafficEvent = z.infer<typeof trafficSchema>;
export function isPublicTrafficPath(path: string) {
  return /^\/(en|zh)(?:\/(?:menu|blog|guides|about|promotions)(?:\/[a-z0-9-]{1,80})?|\/(?:group-orders|membership|contact|faq|privacy|terms|ascend))?\/?$/.test(path);
}
export function trafficSource(referrer: string, search: string) {
  const tagged = new URLSearchParams(search).get("utm_source")?.toLowerCase();
  if (tagged && trafficSources.includes(tagged as typeof trafficSources[number]) && !["direct", "internal"].includes(tagged)) return tagged as typeof trafficSources[number];
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const matches = (domain: string) => host === domain || host.endsWith("." + domain);
    if (matches("qyjworld.com")) return "internal";
    if (matches("chatgpt.com") || matches("chat.openai.com")) return "chatgpt";
    if (matches("perplexity.ai")) return "perplexity";
    if (matches("copilot.microsoft.com")) return "copilot";
    if (matches("gemini.google.com")) return "gemini";
    if (/^(?:[a-z0-9-]+\.)?google\.(?:com|com\.sg|co\.uk|com\.my)$/.test(host)) return "google";
    for (const [domain, source] of [["bing.com", "bing"], ["instagram.com", "instagram"], ["facebook.com", "facebook"], ["tiktok.com", "tiktok"], ["xiaohongshu.com", "xiaohongshu"], ["xhslink.cn", "xiaohongshu"]] as const) if (matches(domain)) return source;
  } catch { return "other"; }
  return "other";
}
export function summariseTraffic(rows: Array<{ received_at: string; payload_json: TrafficEvent }>) {
  const pages = new Map<string, number>(), sources = new Map<string, number>(), days = new Map<string, number>();
  const events = { page_view: 0, order_click: 0, group_click: 0 };
  let mobile = 0;
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" });
  for (const row of rows) {
    const value = trafficSchema.safeParse(row.payload_json);
    if (!value.success || !Number.isFinite(Date.parse(row.received_at))) continue;
    const event = value.data; events[event.event]++;
    if (event.event !== "page_view") continue;
    pages.set(event.path, (pages.get(event.path) ?? 0) + 1);
    sources.set(event.source, (sources.get(event.source) ?? 0) + 1);
    const day = dayFormat.format(new Date(row.received_at)); days.set(day, (days.get(day) ?? 0) + 1);
    if (event.device === "mobile") mobile++;
  }
  const ranked = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1]);
  return { ...events, mobile, pages: ranked(pages), sources: ranked(sources), days: [...days].sort((a, b) => a[0].localeCompare(b[0])), aiViews: ["chatgpt", "perplexity", "copilot", "gemini"].reduce((sum, source) => sum + (sources.get(source) ?? 0), 0) };
}
