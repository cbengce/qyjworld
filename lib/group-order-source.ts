export const groupOrderSources = ["unknown", "google", "instagram", "tiktok", "xiaohongshu", "hotel", "gym", "tefuda", "friend", "other"] as const;
export type GroupOrderSource = typeof groupOrderSources[number];
export const groupOrderSourceLabels: Record<GroupOrderSource, [string, string]> = {
  unknown: ["Not specified", "未注明"], google: ["Google search", "Google 搜索"], instagram: ["Instagram", "Instagram"], tiktok: ["TikTok", "TikTok"], xiaohongshu: ["Xiaohongshu", "小红书"], hotel: ["Hotel", "酒店"], gym: ["Gym", "健身房"], tefuda: ["TEFUDA", "TEFUDA"], friend: ["Friend / colleague", "朋友／同事"], other: ["Other", "其他"]
};
// Only recognised channel labels are saved. Never retain full referrers, queries,
// arbitrary campaign text, contact details or tokens from a URL.
export function sourceFromSearch(search: string): GroupOrderSource {
  const value = new URLSearchParams(search).get("utm_source")?.toLowerCase();
  return groupOrderSources.find(source => source !== "unknown" && source === value) ?? "unknown";
}
export function summariseGroupSources(records: { source?: GroupOrderSource; status: string }[]) {
  return groupOrderSources.map(source => {
    const orders = records.filter(order => (order.source || "unknown") === source);
    return { source, requests: orders.length, confirmed: orders.filter(order => order.status === "confirmed").length, fulfilled: orders.filter(order => order.status === "fulfilled").length };
  }).filter(row => row.requests > 0);
}
