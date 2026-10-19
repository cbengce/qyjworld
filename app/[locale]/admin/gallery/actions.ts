"use server";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/admin";
import { GALLERY_PROVIDER, getGallery } from "@/lib/gallery";
import { gallerySchema, type GalleryEntry } from "@/lib/gallery-model";

export async function saveGallery(form: FormData) {
  const locale = form.get("locale") === "zh" ? "zh" : "en";
  const { role } = await requireAdmin(locale);
  if (role !== "super_admin" && role !== "manager") redirect(`/${locale}/admin`);
  let errorMessage = "", slug = "";
  try {
    slug = String(form.get("slug") || "");
    const version = Number(form.get("version"));
    const all = await getGallery();
    const existing = all.find(entry => entry.slug === slug);
    if (!Number.isInteger(version) || version < 0 || (existing && existing.version !== version) || (!existing && version !== 0)) throw new Error("This work has changed. Reload the page before saving.");
    if (existing && form.get("isNew") === "yes") throw new Error("That slug is already in use. Choose another.");
    if (!existing && form.get("isNew") !== "yes") throw new Error("Work not found. Reload the page.");
    const entry: GalleryEntry = gallerySchema.parse({
      slug, title: { en: form.get("titleEn"), zh: form.get("titleZh") }, caption: { en: form.get("captionEn"), zh: form.get("captionZh") },
      media: form.get("media"), asset: form.get("asset"), thumbnail: form.get("thumbnail") || "", topics: form.getAll("topics"),
      tags: String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean), state: form.get("state"), archived: form.get("archived") === "on",
      order: Number(form.get("order")), source: form.get("source") || "", updatedAt: new Date().toISOString(), version: version + 1
    });
    if (entry.state === "published" && form.get("reviewed") !== "on") throw new Error("Review the artwork, bilingual captions, rights and any offers before publishing.");
    const service = createServiceClient();
    const payload_hash = createHash("sha256").update(JSON.stringify(entry)).digest("hex");
    if (version === 0) {
      const { error } = await service.from("webhook_events").insert({ provider: GALLERY_PROVIDER, external_event_id: slug, event_type: "gallery.work", payload_json: entry, payload_hash, processing_status: "processed", processed_at: entry.updatedAt });
      if (error) throw new Error(error.code === "23505" ? "Someone else saved this work. Reload before editing." : "Unable to save. Please try again.");
    } else {
      const { data, error } = await service.from("webhook_events").update({ payload_json: entry, payload_hash, processed_at: entry.updatedAt }).eq("provider", GALLERY_PROVIDER).eq("external_event_id", slug).eq("payload_json->>version", String(version)).select("id");
      if (error) throw new Error("Unable to save. Please try again.");
      if (!data?.length) throw new Error("Someone else saved this work. Reload before editing.");
    }
    for (const lang of ["en", "zh"]) {
      revalidatePath(`/${lang}/gallery`);
      revalidatePath(`/${lang}/gallery/${slug}`);
      revalidatePath(`/${lang}/admin/gallery`);
    }
    revalidatePath("/sitemap.xml");
  } catch (error) { errorMessage = error instanceof Error && error.name !== "ZodError" ? error.message : "Check the titles, captions, category and media URL."; }
  redirect(`/${locale}/admin/gallery?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

export async function prepareGalleryUpload(input: { locale: string; type: string; size: number }) {
  const { role } = await requireAdmin(input.locale === "zh" ? "zh" : "en");
  if (role !== "super_admin" && role !== "manager") return { error: "You do not have permission to upload." };
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };
  if (!extensions[input.type] || !Number.isFinite(input.size) || input.size <= 0 || input.size > 50 * 1024 * 1024) return { error: "Choose a JPG, PNG, WebP, MP4 or WebM file up to 50 MB." };
  const service = createServiceClient();
  const { data: bucket, error: bucketError } = await service.storage.getBucket("gallery");
  if (!bucket) {
    if (bucketError && !["404", "400"].includes(String(bucketError.status))) return { error: "Media storage is unavailable." };
    const { error } = await service.storage.createBucket("gallery", { public: true, fileSizeLimit: 50 * 1024 * 1024, allowedMimeTypes: Object.keys(extensions) });
    if (error && !/already exists/i.test(error.message)) return { error: "Media storage is unavailable. Please try again." };
  }
  const path = `works/${randomUUID()}.${extensions[input.type]}`;
  const { data, error } = await service.storage.from("gallery").createSignedUploadUrl(path);
  if (error || !data) return { error: "Unable to start the upload." };
  const { data: publicData } = service.storage.from("gallery").getPublicUrl(path);
  return { path, token: data.token, publicUrl: publicData.publicUrl };
}
