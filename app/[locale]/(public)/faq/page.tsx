import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";
import { Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/faq",
    title: "Tea Membership FAQ | Qing Yun Jian Singapore",
    description: "Find answers about Qing Yun Jian membership activation, fees, points and member account security.",
    keywords: ["Qing Yun Jian FAQ", "tea membership FAQ", "membership points Singapore"]
  });
}

export default function FAQPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  const faqs = [
    {
      q: zh ? "会员如何激活？" : "How is membership activated?",
      a: zh
        ? "注册后会员状态为待处理。管理员确认付款后手动激活 60 天会员。"
        : "Registration creates a pending membership. An administrator activates the 60-day membership after payment confirmation."
    },
    {
      q: zh ? "会员费是多少？" : "What is the membership fee?",
      a: BRAND.membershipFee
    },
    {
      q: zh ? "积分可以自行修改吗？" : "Can members edit their own points?",
      a: zh ? "不可以。积分通过后台安全交易记录生成。" : "No. Points are managed through a secure transaction ledger."
    }
  ];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a }
    }))
  };

  return (
    <main>
      <StructuredData data={[breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "FAQ", path: "/faq" }]), faqSchema]} />
      <Section>
        <div className="mx-auto max-w-4xl">
          <h1 className="font-serif text-6xl font-semibold">{zh ? "常见问题" : "Frequently Asked Questions"}</h1>
          <div className="mt-8 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.q} className="bg-white p-6">
                <h2 className="font-serif text-3xl font-semibold">{faq.q}</h2>
                <p className="mt-3 text-forest/70">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
