import Image from "next/image";
import type { Locale } from "@/lib/constants";

import { storyVisual, storyVisualCaption } from "@/lib/story-visuals";

/** Source photography and illustrative artwork are labelled separately. */
export function StoryCover({ index = 0, locale = "en" }: { index?: number; locale?: Locale }) {
  const visual = storyVisual(index);
  return <figure className="mx-auto max-w-6xl px-5 pb-8 md:px-8">
    <div className={`relative aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-gold/20 bg-[#d9f2ef] shadow-[0_16px_45px_rgba(18,60,47,0.08)] ${visual.kind === "illustration" ? "sm:aspect-[16/7]" : ""}`}>
      <Image src={`/assets/story/${visual.file}.webp`} alt={visual.alt[locale]} fill priority sizes="(min-width: 1200px) 1100px, 100vw" className={`object-cover ${visual.kind === "photo" ? "brightness-110" : ""}`} />
    </div>
    <figcaption className="mt-3 text-xs text-forest/60">{storyVisualCaption(visual.kind, locale)}</figcaption>
  </figure>;
}
