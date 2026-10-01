import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AscendQuiz } from "@/components/ascend/ascend-quiz";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/lib/constants";
import { breadcrumbSchema, createPageMetadata, localizedUrl } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const canonical = "https://qyjworld.com/en/ascend";
  const metadata = createPageMetadata({ locale: params.locale, path: "/ascend", title: "The Ascend Tea Profile | QING YUN JIAN", description: "Answer five simple questions and discover the Qing Yun Jian tea that matches who you are today. Create and share your personalised Ascend Card.", keywords: ["Ascend Tea Profile", "tea quiz Singapore", "Qing Yun Jian tea recommendation"], includeLanguageAlternates: false });
  return { ...metadata, alternates: { canonical }, openGraph: { ...metadata.openGraph, url: canonical } };
}

export default function AscendPage({ params }: { params: { locale: Locale } }) {
  if (params.locale === "zh") redirect("/en/ascend");
  const schema = [{ ...breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "The Ascend Tea Profile", path: "/ascend" }]) }, { "@context": "https://schema.org", "@type": "WebApplication", name: "The Ascend Tea Profile", url: localizedUrl(params.locale, "/ascend"), applicationCategory: "EntertainmentApplication", operatingSystem: "Any", description: "A light-hearted five-question tea recommendation experience from QING YUN JIAN." }];
  return <><StructuredData data={schema} /><AscendQuiz locale={params.locale} /></>;
}
