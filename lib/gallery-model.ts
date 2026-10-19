import { z } from "zod";

export const galleryTopics = ["brand-store", "tea-series", "pegasus", "promotions", "partners"] as const;
export const galleryMedia = ["poster", "video", "photo"] as const;
export const topicLabels = {
  "brand-store": { en: "Brand & store", zh: "品牌与门店" },
  "tea-series": { en: "Tea collections", zh: "茶饮系列" },
  pegasus: { en: "Pegasus", zh: "飞马系列" },
  promotions: { en: "Campaign archive", zh: "历史活动" },
  partners: { en: "Collaborations", zh: "合作伙伴" }
};
export const mediaLabels = { poster: { en: "Posters", zh: "海报" }, video: { en: "Videos", zh: "视频" }, photo: { en: "Photos", zh: "照片" } };

// Accept our own assets and the dedicated public gallery/campaign buckets only.
// Never accept HTML, SVG, arbitrary external hosts, protocol-relative URLs or private storage paths.
export function isGalleryAsset(value: string) {
  if (/^\/assets\/[a-zA-Z0-9/_.-]+\.(?:png|jpe?g|webp|mp4|webm)$/i.test(value) && !value.includes("..")) return true;
  try {
    const url = new URL(value);
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!origin && url.origin === new URL(origin).origin && url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && /^\/storage\/v1\/object\/public\/(?:gallery|campaigns)\/[a-zA-Z0-9/_.-]+\.(?:png|jpe?g|webp|mp4|webm)$/i.test(url.pathname) && !url.pathname.includes("..");
  } catch { return false; }
}
const text = z.object({ en: z.string().trim().min(1).max(2500), zh: z.string().trim().min(1).max(2500) });
export const gallerySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  title: text.refine(t => t.en.length <= 140 && t.zh.length <= 140),
  caption: text,
  media: z.enum(galleryMedia),
  asset: z.string().max(600).refine(isGalleryAsset, "Choose a website asset or upload a file first."),
  thumbnail: z.string().max(600).refine(v => !v || isGalleryAsset(v), "Invalid thumbnail."),
  topics: z.array(z.enum(galleryTopics)).min(1).max(5),
  tags: z.array(z.string().trim().min(1).max(80)).max(15),
  state: z.enum(["draft", "published"]),
  archived: z.boolean(),
  order: z.number().int().min(0).max(10000),
  source: z.string().trim().max(300),
  updatedAt: z.string().datetime(),
  version: z.number().int().min(0)
}).strict().superRefine((entry, ctx) => {
  const video = /\.(mp4|webm)$/i.test(entry.asset);
  if ((entry.media === "video") !== video) ctx.addIssue({ code: "custom", path: ["asset"], message: "Media type must match the uploaded file." });
  if (entry.thumbnail && /\.(mp4|webm)$/i.test(entry.thumbnail)) ctx.addIssue({ code: "custom", path: ["thumbnail"], message: "Use an image thumbnail." });
});
export type GalleryEntry = z.infer<typeof gallerySchema>;
export function mergeGallery(seed: GalleryEntry[], overrides: GalleryEntry[]) {
  const entries = new Map(seed.map(entry => [entry.slug, entry]));
  for (const entry of overrides) entries.set(entry.slug, entry);
  return [...entries.values()].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}
export function filterGallery(entries: GalleryEntry[], media = "all", topic = "all", query = "", tag = "all") {
  const q = query.trim().toLocaleLowerCase();
  return entries.filter(e => e.state === "published" && (media === "all" || e.media === media) && (topic === "all" || e.topics.includes(topic as typeof galleryTopics[number])) && (tag === "all" || e.tags.includes(tag)) && (!q || `${e.title.en} ${e.title.zh} ${e.caption.en} ${e.caption.zh} ${e.tags.join(" ")}`.toLocaleLowerCase().includes(q)));
}
