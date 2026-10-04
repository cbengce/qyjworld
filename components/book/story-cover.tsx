import Image from "next/image";
import type { Locale } from "@/lib/constants";

import { storyVisual, storyVisualCaption } from "@/lib/story-visuals";

/** Source photography and illustrative artwork are labelled separately. */
export function StoryCover({ index = 0, locale = "en" }: { index?: number; locale?: Locale }) {
  const visual = storyVisual(index);
  return <figure className="mx-auto max-w-6xl px-5 pb-8 md:px-8">
    <div className={index === 0 ? "grid gap-4 md:grid-cols-[2fr_1fr]" : ""}>
    <div className={`relative aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-gold/20 bg-[#d9f2ef] shadow-[0_16px_45px_rgba(18,60,47,0.08)] ${visual.kind === "illustration" ? "sm:aspect-[16/7]" : ""}`}>
      <Image src={`/assets/story/${visual.file}.webp`} alt={visual.alt[locale]} fill priority sizes="(min-width: 1200px) 1100px, 100vw" className={`object-cover ${visual.kind === "photo" ? "brightness-110" : ""}`} />
    </div>
    {index === 0 && <div className="relative h-[420px] overflow-hidden rounded-[1.5rem] border border-gold/20 bg-[#eef4ed] md:h-auto">
      <Image src="/assets/story/store-packaging-portrait-v4.webp" alt={locale === "zh" ? "红色与墨绿色青云间杯子和提袋的门店实拍细节" : "A close view of red and green Qing Yun Jian cups and carry bags in the store"} fill sizes="(min-width: 768px) 360px, 100vw" className="object-contain brightness-110" />
    </div>}
    </div>
    <figcaption className="mt-3 text-xs text-forest/60">{storyVisualCaption(visual.kind, locale)}</figcaption>
  </figure>;
}
