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
            <p>{params.locale === "zh" ? "网站使用第一方匿名浏览统计，记录公开页面路径、来源类别、粗略设备类别及入口点击。统计记录不包含姓名、邮箱、账号标识、完整来源网址或查询参数，不使用统计 Cookie 或持久浏览器标识；IP 地址不写入统计记录。账号页和后台页不记录，记录器会尊重浏览器提供的 Do Not Track 或 Global Privacy Control 信号。" : "The website uses first-party anonymous traffic counts for public page paths, source categories, broad device categories and entry-link clicks. Analytics records do not include names, email addresses, account identifiers, full referrer URLs or query parameters. This recorder uses no analytics cookies or persistent browser identifiers and does not save IP addresses in analytics records. Account and admin pages are excluded, and the recorder respects browser Do Not Track and Global Privacy Control signals."}</p>
          </div>
        </div>
      </Section>
    </main>
  );
}

