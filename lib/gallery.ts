import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { gallerySchema, mergeGallery, type GalleryEntry } from "@/lib/gallery-model";
import { gallerySeed } from "@/lib/gallery-seed";
export const GALLERY_PROVIDER = "qyj_gallery_v1";

export const getGallery = cache(async (): Promise<GalleryEntry[]> => {
  // A database failure must not resurrect a seed entry that an editor has unpublished.
  const service = createServiceClient();
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await service.from("webhook_events").select("payload_json").eq("provider", GALLERY_PROVIDER).order("id").range(offset, offset + 499);
    if (error) throw new Error("The gallery could not be loaded. Please try again shortly.");
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const overrides = rows.map(row => gallerySchema.parse(row.payload_json));
  return mergeGallery(gallerySeed, overrides);
});
export async function getPublicGallery() { return (await getGallery()).filter(entry => entry.state === "published"); }
export async function getPublicGalleryEntry(slug: string) { return (await getPublicGallery()).find(entry => entry.slug === slug) ?? null; }
