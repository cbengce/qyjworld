import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { Section } from "@/components/ui";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/privacy",
    title: "Privacy Policy | Qing Yun Jian",
    description: "Read how Qing Yun Jian handles membership information, service communications and personal data in Singapore.",
    keywords: ["Qing Yun Jian privacy policy", "membership data privacy Singapore"]
  });
}

export default function PrivacyPage({ params }: { params: { locale: Locale } }) {
  return (
    <main>
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "Privacy Policy", path: "/privacy" }])} />
      <Section>
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold text-gold">For legal review</p>
          <h1 className="mt-3 font-serif text-6xl font-semibold">Privacy Policy</h1>
          <div className="mt-8 grid gap-5 text-lg leading-8 text-forest/75">
            <p>
              {BRAND.company} collects member information for account creation, membership administration, points,
              referrals, service communication, and optional marketing where consent is provided.
            </p>
            <p>
              Personal data should be handled in a PDPA-conscious manner for Singapore. This draft must be reviewed by
              qualified legal counsel before launch.
            </p>
            <p>
              The service does not store payment card information. Administrative access is role controlled and audited.
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
