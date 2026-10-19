import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { CmsSubmitButton } from "@/components/admin/cms-submit-button";
import { GalleryUpload } from "@/components/admin/gallery-upload";
import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { getGallery } from "@/lib/gallery";
import { galleryMedia, galleryTopics, mediaLabels, topicLabels, type GalleryEntry } from "@/lib/gallery-model";
import { saveGallery } from "./actions";
export const dynamic = "force-dynamic";
function Editor({ entry, locale }: { entry?: GalleryEntry; locale: Locale }) {
  const zh = locale === "zh", field = "focus-ring min-h-11 w-full rounded border border-forest/20 bg-white px-3 py-2 text-sm font-normal";
  return <form action={saveGallery} className="mt-5 grid gap-5">
    <input name="locale" value={locale} type="hidden" /><input name="version" value={entry?.version ?? 0} type="hidden" /><input name="isNew" value={entry ? "no" : "yes"} type="hidden" />
    <label className="text-sm font-bold">{zh ? "网址标识（创建后固定）" : "URL slug (fixed after creation)"}<input name="slug" className={field} defaultValue={entry?.slug} readOnly={!!entry} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} /></label>
    <div className="grid gap-4 md:grid-cols-2">{(["En", "Zh"] as const).map(lang => <div key={lang} className="grid gap-4"><label className="text-sm font-bold">{lang === "En" ? "English title" : "中文标题"}<input name={`title${lang}`} className={field} defaultValue={entry?.title[lang === "En" ? "en" : "zh"]} required maxLength={140} /></label><label className="text-sm font-bold">{lang === "En" ? "English caption / story" : "中文配文／故事"}<textarea name={`caption${lang}`} className={field + " min-h-32"} defaultValue={entry?.caption[lang === "En" ? "en" : "zh"]} required maxLength={2500} /></label></div>)}</div>
    <div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-bold">{zh ? "媒体类型" : "Media type"}<select name="media" className={field} defaultValue={entry?.media || "poster"}>{galleryMedia.map(m => <option key={m} value={m}>{mediaLabels[m][locale]}</option>)}</select></label><label className="text-sm font-bold">{zh ? "发布状态" : "Publication"}<select name="state" className={field} defaultValue={entry?.state || "draft"}><option value="draft">{zh ? "草稿／下架" : "Draft / unpublished"}</option><option value="published">{zh ? "已发布" : "Published"}</option></select></label><label className="text-sm font-bold">{zh ? "排列（小数字在前）" : "Order (lowest first)"}<input name="order" type="number" min={0} max={10000} className={field} defaultValue={entry?.order ?? 0} required /></label></div>
    <fieldset><legend className="text-sm font-bold">{zh ? "主题（可以多选）" : "Collections (select several)"}</legend><div className="mt-2 flex flex-wrap gap-4">{galleryTopics.map(topic => <label key={topic} className="flex items-center gap-2 text-sm"><input name="topics" type="checkbox" value={topic} defaultChecked={entry?.topics.includes(topic)} />{topicLabels[topic][locale]}</label>)}</div></fieldset>
    <label className="text-sm font-bold">{zh ? "产品／合作伙伴标签（逗号分隔）" : "Product / partner tags (comma separated)"}<input className={field} name="tags" defaultValue={entry?.tags.join(", ")} /></label>
    <div><p className="mb-2 text-sm font-bold">{zh ? "完整作品" : "Full artwork"}</p><GalleryUpload locale={locale} field="asset" initial={entry?.asset} /></div>
    <div><p className="mb-2 text-sm font-bold">{zh ? "列表封面／视频封面（可选）" : "Card / video thumbnail (optional)"}</p><GalleryUpload locale={locale} field="thumbnail" initial={entry?.thumbnail} imagesOnly /></div>
    <label className="text-sm font-bold">{zh ? "原稿规格或来源说明" : "Original specification / source note"}<input className={field} name="source" maxLength={300} defaultValue={entry?.source} /></label>
    <label className="flex items-start gap-3 text-sm"><input name="archived" type="checkbox" className="mt-1" defaultChecked={entry?.archived ?? true} />{zh ? "历史作品：显示旧价格、优惠及营养文字说明提示" : "Archive artwork: show the historical prices, offers and nutrition wording notice"}</label>
    <label className="flex items-start gap-3 text-sm"><input name="reviewed" type="checkbox" className="mt-1" />{zh ? "发布前已核对原图、双语文字、使用权及优惠有效性。未经确认的旧优惠只作为历史作品展示。" : "I have reviewed the image, bilingual copy, usage rights and offer validity. Unconfirmed past offers are displayed only as archive artwork."}</label>
    <CmsSubmitButton pendingLabel={zh ? "保存中…" : "Saving…"}>{zh ? "保存作品" : "Save work"}</CmsSubmitButton>
  </form>;
}
export default async function GalleryAdmin({ params, searchParams }: { params: { locale: Locale }; searchParams: { error?: string; saved?: string } }) {
  const { role } = await requireAdmin(params.locale);
  if (role !== "super_admin" && role !== "manager") redirect(`/${params.locale}/admin`);
  const entries = await getGallery(), zh = params.locale === "zh";
  return <main className="bg-paper"><div className="mx-auto max-w-6xl px-5 py-12 md:px-8"><h1 className="font-serif text-5xl font-semibold text-forest">{zh ? "画廊管理" : "Art Gallery"}</h1><p className="mt-4 leading-7 text-forest/65">{zh ? "海报、视频与照片分开管理；每件作品可属于多个主题与产品系列。" : "Manage posters, videos and photos. Each work can belong to several collections and product series."}</p><AdminNavigation locale={params.locale} /><Link className="focus-ring mt-6 inline-block font-bold underline" href={`/${params.locale}/gallery`}>{zh ? "打开公开画廊" : "Open the public gallery"} ↗</Link>
    {searchParams.error && <p role="alert" className="mt-5 rounded border border-red-200 bg-red-50 p-4 text-red-800">{searchParams.error}</p>}{searchParams.saved && <p role="status" className="mt-5 rounded border border-forest/20 bg-white p-4">{zh ? "作品已保存。" : "Work saved."}</p>}
    <details className="mt-8 rounded-2xl bg-white p-6"><summary className="cursor-pointer text-xl font-bold">＋ {zh ? "新增作品" : "Add a work"}</summary><Editor locale={params.locale} /></details>
    <div className="mt-6 grid gap-4">{entries.map(entry => <details key={entry.slug} className="rounded-2xl border border-forest/10 bg-white p-6"><summary className="cursor-pointer text-lg font-semibold">{entry.title.en} · {entry.title.zh}<span className="ml-3 text-sm font-normal text-forest/60">{entry.state === "published" ? (zh ? "已发布" : "Published") : (zh ? "草稿" : "Draft")} · {mediaLabels[entry.media][params.locale]}</span></summary><Editor entry={entry} locale={params.locale} /></details>)}</div>
  </div></main>;
}
