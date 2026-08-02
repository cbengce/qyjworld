import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";
import { Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/about",
    title: "About Qing Yun Jian | Born to Ascend",
    description: "Learn the story behind Qing Yun Jian, a Singapore premium sparkling tea brand inspired by Oriental tea culture.",
    keywords: ["about Qing Yun Jian", "Singapore tea brand", "Oriental tea culture", "Born to Ascend"]
  });
}

export default function AboutPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  return (
    <main>
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "About", path: "/about" }])} />
      <Section>
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold text-gold">{BRAND.company}</p>
          <h1 className="mt-3 font-serif text-6xl font-semibold">{zh ? "关于青云间" : "About Qing Yun Jian"}</h1>
          <div className="mt-8 grid gap-5 text-lg leading-8 text-forest/75">
            <p>
              {zh
                ? "青云间是新加坡现代东方茶饮品牌，以清爽气泡茶、东方灵感与高级简约体验为核心。"
                : "Qing Yun Jian is a Singapore-based modern Oriental tea brand operated by TCM AND HEALTHCARE COLLEGE PTE LTD."}
            </p>
            <p>
              {zh
                ? "品牌口号 Born to Ascend 代表向上、清朗与从容的品牌气质。"
                : "Born to Ascend expresses a calm upward spirit: refined, bright, and quietly ambitious."}
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
