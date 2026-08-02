import type { ContentFaq } from "@/lib/content/types";
import { StructuredData } from "@/components/structured-data";

export function FAQSection({ faq }: { faq: ContentFaq[] }) {
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  return (
    <section aria-labelledby="content-faq-title" className="mt-16 border-t border-forest/10 pt-12">
      <StructuredData data={schema} />
      <h2 id="content-faq-title" className="font-serif text-4xl font-semibold text-forest">Frequently Asked Questions</h2>
      <div className="mt-7 grid gap-4">
        {faq.map((item) => <details key={item.question} className="bg-[#f8f5ed] p-6"><summary className="cursor-pointer font-semibold text-forest">{item.question}</summary><p className="mt-4 leading-7 text-forest/65">{item.answer}</p></details>)}
      </div>
    </section>
  );
}
