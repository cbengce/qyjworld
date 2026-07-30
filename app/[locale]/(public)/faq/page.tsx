import { BRAND, Locale } from "@/lib/constants";
import { Section } from "@/components/ui";

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

  return (
    <main>
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
