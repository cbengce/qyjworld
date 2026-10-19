"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prepareGalleryUpload } from "@/app/[locale]/admin/gallery/actions";
export function GalleryUpload({ locale, field, initial = "", imagesOnly = false }: { locale: string; field: string; initial?: string; imagesOnly?: boolean }) {
  const [url, setUrl] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const zh = locale === "zh";
  return <div className="space-y-2"><div className="flex flex-wrap gap-2"><input className="focus-ring min-h-11 min-w-0 flex-1 rounded border border-forest/20 px-3 text-sm" aria-label={field} name={field} value={url} onChange={e => setUrl(e.target.value)} placeholder="/assets/... or uploaded URL" /><button disabled={busy} className="focus-ring rounded-full border border-forest/20 px-4 py-3 text-sm font-bold disabled:opacity-40" type="button" onClick={() => file.current?.click()}>{busy ? (zh ? "上传中…" : "Uploading…") : (zh ? "上传文件" : "Upload file")}</button></div>
    <input className="hidden" type="file" ref={file} accept={imagesOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/webm"} onChange={async event => {
      const chosen = event.target.files?.[0]; event.target.value = ""; if (!chosen) return;
      setBusy(true); setMessage("");
      try {
        if (imagesOnly && !["image/jpeg", "image/png", "image/webp"].includes(chosen.type)) throw new Error("Choose an image thumbnail.");
        const signed = await prepareGalleryUpload({ locale, type: chosen.type, size: chosen.size });
        if (signed.error || !signed.path || !signed.token || !signed.publicUrl) throw new Error(signed.error || "Unable to upload.");
        const { error } = await createClient().storage.from("gallery").uploadToSignedUrl(signed.path, signed.token, chosen, { contentType: chosen.type });
        if (error) throw new Error("The file could not be uploaded. Please try again.");
        setUrl(signed.publicUrl); setMessage(zh ? "上传完成。保存作品后生效。" : "Uploaded. Save the work to apply it.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
      finally { setBusy(false); }
    }} />
    <p aria-live="polite" className="text-xs leading-5 text-forest/65">{message || (zh ? "图片或视频，最大 50 MB。上传后请保存作品。" : "Images or videos, up to 50 MB. Save the work after uploading.")}</p>
    {busy && <p role="status" className="text-sm font-semibold">{zh ? "请等待上传完成再保存。" : "Please wait for the upload to finish before saving."}</p>}
  </div>;
}
