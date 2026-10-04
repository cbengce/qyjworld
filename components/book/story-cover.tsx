import Image from "next/image";
import type { Locale } from "@/lib/constants";

const covers = ["bright-tea-terraces-v2", "bright-cloud-path-v2", "bright-cloud-pavilion-v2"];

/** Symbolic artwork, never presented as store or supplier photography. */
export function StoryCover({ index = 0, locale = "en" }: { index?: number; locale?: Locale }) {
  return <figure className="mx-auto max-w-6xl px-5 pb-8 md:px-8">
    <div className="relative aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-gold/20 bg-[#d9f2ef] shadow-[0_16px_45px_rgba(18,60,47,0.08)] sm:aspect-[16/7]">
      <Image src={`/assets/story/${covers[index % covers.length]}.webp`} alt="" fill priority sizes="(min-width: 1200px) 1100px, 100vw" className="object-cover" />
    </div>
    <figcaption className="mt-3 text-xs text-forest/60">{locale === "zh" ? "品牌意境插画" : "Brand landscape illustration"}</figcaption>
  </figure>;
}
