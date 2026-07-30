"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CAMPAIGN_BUCKET = "campaigns";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function cleanFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "campaign"}-${Date.now()}.${extension}`;
}

export function PromotionImageUploader({
  emptyMessage = "No campaign image uploaded.",
  fieldName = "imageUrl",
  initialUrl
}: {
  emptyMessage?: string;
  fieldName?: string;
  initialUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isUploading = progress !== null && progress < 100;

  const previewUrl = useMemo(() => imageUrl || "", [imageUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");

    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      setError(sessionError?.message ?? "Please log in again before uploading.");
      return;
    }

    const nextPath = `promotions/${cleanFileName(file.name)}`;
    const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${CAMPAIGN_BUCKET}/${nextPath}`;

    setProgress(0);
    try {
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", endpoint);
        request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        request.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
        request.setRequestHeader("Content-Type", file.type);
        request.setRequestHeader("x-upsert", "true");

        request.upload.onprogress = (uploadEvent) => {
          if (!uploadEvent.lengthComputable) return;
          setProgress(Math.round((uploadEvent.loaded / uploadEvent.total) * 100));
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            resolve();
            return;
          }
          reject(new Error(request.responseText || "Upload failed."));
        };
        request.onerror = () => reject(new Error("Upload failed. Please try again."));
        request.send(file);
      });

      const { data } = supabase.storage.from(CAMPAIGN_BUCKET).getPublicUrl(nextPath);
      setImageUrl(data.publicUrl);
      setProgress(100);
      setMessage("Image uploaded successfully. Save the promotion to apply it.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
      setProgress(null);
    }
  }

  function handleDelete() {
    setError("");
    setMessage("");
    setImageUrl("");
    setProgress(null);
    setMessage("Image removed. Save the promotion to apply it.");
  }

  return (
    <div className="grid gap-3">
      <input name={fieldName} type="hidden" value={imageUrl} />
      <input ref={inputRef} accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} type="file" />
      <div className="overflow-hidden border border-forest/10 bg-mist">
        {previewUrl ? (
          <Image alt="Promotion campaign preview" className="h-56 w-full object-cover" height={360} src={previewUrl} unoptimized width={720} />
        ) : (
          <div className="flex h-56 items-center justify-center px-6 text-center text-sm font-semibold text-forest/50">
            {emptyMessage}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="focus-ring min-h-11 rounded-full bg-forest px-5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60" disabled={isUploading} onClick={() => inputRef.current?.click()} type="button">
          {imageUrl ? "Replace Image" : "Upload Image"}
        </button>
        {imageUrl ? (
          <button className="focus-ring min-h-11 rounded-full border border-red-200 px-5 text-sm font-bold text-red-700 transition duration-300 hover:-translate-y-0.5" disabled={isUploading} onClick={handleDelete} type="button">
            Delete Image
          </button>
        ) : null}
      </div>
      {progress !== null ? (
        <div aria-label="Upload progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-forest/10" role="progressbar">
          <div className="h-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {message ? <p className="text-sm font-semibold text-forest">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest/50">JPG, PNG or WEBP. Max 5MB.</p>
    </div>
  );
}
