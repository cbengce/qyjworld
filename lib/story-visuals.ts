import type { Locale } from "@/lib/constants";

/** One distinct cover per chapter, shared by directory and article. */
export const STORY_VISUALS = [
  { file: "store-packaging-wide-v4", kind: "photo", alt: { en: "Red and green Qing Yun Jian cups and carry bags on the store counter", zh: "青云间门店柜台上的红色与墨绿色杯子及提袋" } },
  { file: "bright-cloud-path-v2", kind: "illustration", alt: { en: "A sunlit path rising towards a bright cloud sea", zh: "晨光照亮向云海延伸的山径" } },
  { file: "store-interior-photo-v3", kind: "photo", alt: { en: "Qing Yun Jian's store counter, curved lighting and tea preparation equipment", zh: "青云间门店柜台、弧形灯带与制茶设备" } },
  { file: "sparkling-tea-detail-v3", kind: "illustration", alt: { en: "A contemporary illustration of golden sparkling tea in a sunlit glass", zh: "晨光下金色气泡茶的现代概念插画" } },
  { file: "store-pegasus-photo-v3", kind: "photo", alt: { en: "The gold Pegasus and Qing Yun Jian lettering on the store's illuminated wall sign", zh: "青云间门店墙面灯牌上的金色飞马与品牌字样" } },
  { file: "bright-tea-terraces-v2", kind: "illustration", alt: { en: "Fresh green tea terraces under a clear morning sky", zh: "晴朗晨空下的青绿茶园" } },
  { file: "bright-cloud-pavilion-v2", kind: "illustration", alt: { en: "An Oriental pavilion overlooking a luminous cloud sea", zh: "东方茶亭远眺明亮云海" } },
  { file: "store-working-counter-v5", kind: "photo", alt: { en: "Qing Yun Jian counter and tea preparation area beneath the store menu screens", zh: "门店菜单屏幕下的青云间柜台与制茶工作区" } },
  { file: "store-welcome-v5", kind: "photo", alt: { en: "The Qing Yun Jian storefront with its green bench and curved lighting", zh: "青云间门店正面、绿色长椅与弧形灯带" } },
  { file: "store-direction-sign-v5", kind: "photo", alt: { en: "The illuminated gold Pegasus and Born to Ascend lettering on the Qing Yun Jian wall sign", zh: "青云间墙面灯牌上的金色飞马与 Born to Ascend 字样" } }
] as const;

export function storyVisual(index: number) {
  return STORY_VISUALS[index] ?? STORY_VISUALS[0];
}

export function storyVisualCaption(kind: "photo" | "illustration", locale: Locale) {
  return kind === "photo"
    ? locale === "zh" ? "青云间门店实拍" : "Qing Yun Jian store photograph"
    : locale === "zh" ? "品牌意境插画" : "Brand illustration";
}
