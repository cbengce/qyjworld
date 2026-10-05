import type { Metadata } from "next";
import { BRAND, Locale } from "@/lib/constants";
import { Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/faq",
    title: params.locale === "zh" ? "青云间常见问题 | 菜单、到店与会员" : "Tea Membership FAQ | Qing Yun Jian Singapore",
    description: params.locale === "zh" ? "了解青云间菜单、到店、团购申请与会员激活的常见问题。" : "Find answers about Qing Yun Jian membership activation, fees, points and member account security.",
    keywords: ["Qing Yun Jian FAQ", "tea membership FAQ", "membership points Singapore"]
  });
}

export default function FAQPage({ params }: { params: { locale: Locale } }) {
  const zh = params.locale === "zh";
  const faqs = [
    { q: zh ? "在哪里查看现行茶饮？" : "Where can I find the current drinks?", a: zh ? "菜单与茶品详情页列出当前介绍、可提供的价格及供应状态。" : "The menu and drink detail pages show current descriptions, prices where available and availability." },
    { q: zh ? "团单需要付费会员吗？" : "Do group requests require paid membership?", a: zh ? "不需要。团体订购表格可直接填写联系方式；免费访客账号为可选。" : "No. Complete the group form with contact details; a free guest account is optional." },
    { q: zh ? "提交团单就确认了吗？" : "Does submitting a group request confirm the order?", a: zh ? "没有。团队仍须确认茶品、数量、报价及领取或配送安排，表格不会收款。" : "No. Drinks, quantities, quotation and collection or delivery arrangements require team confirmation. The form does not take payment." },
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
      <StructuredData data={[breadcrumbSchema(params.locale, [{ name: params.locale === "zh" ? "首页" : "Home" }, { name: params.locale === "zh" ? "常见问题" : "FAQ", path: "/faq" }]), faqSchema]} />
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
