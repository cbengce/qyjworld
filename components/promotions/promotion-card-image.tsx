"use client";

import { useState } from "react";
import { PromotionImageDisplayMode } from "@/lib/promotions";

function displayModeForImage(mode: PromotionImageDisplayMode, ratio: number | null) {
  if (mode !== "auto") return mode;
  if (ratio === null) return "portrait";
  return ratio >= 1 ? "landscape" : "portrait";
}

export function PromotionCardImage({
  alt,
  mode = "auto",
  variant = "default",
  src
}: {
  alt: string;
  mode?: PromotionImageDisplayMode;
  variant?: "default" | "homepage";
  src: string;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const resolvedMode = displayModeForImage(mode, ratio);
  const isLandscape = resolvedMode === "landscape";
  const isHomepage = variant === "homepage";

  return (
    <div
      className={`overflow-hidden bg-[#e8eee8] ${
        isLandscape
          ? "aspect-[16/9]"
          : isHomepage
            ? "mx-auto aspect-[2/3] w-full max-w-[26rem] p-3 md:max-w-[33rem] md:p-4"
            : "flex min-h-[20rem] items-center justify-center p-4 md:min-h-[26rem]"
      }`}
    >
      <img
        alt={alt}
        className={
          isLandscape
            ? "h-full w-full object-cover transition duration-700 hover:scale-[1.02]"
            : isHomepage
              ? "h-full w-full object-contain transition duration-700 hover:scale-[1.01]"
              : "h-auto max-h-[34rem] w-full max-w-full object-contain transition duration-700 hover:scale-[1.01]"
        }
        loading="lazy"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
        }}
        src={src}
      />
    </div>
  );
}

export function PromotionDetailImage({ alt, src }: { alt: string; src: string }) {
  return (
    <div className="bg-[#e8eee8] p-4 md:p-6">
      <img alt={alt} className="mx-auto h-auto max-h-[80vh] w-auto max-w-full object-contain" loading="eager" src={src} />
    </div>
  );
}
