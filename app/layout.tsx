import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import { SEO_IMAGE } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";

const seoDescription =
  "Modern Oriental Sparkling Tea crafted in Singapore. Experience premium tea, fresh ingredients and exclusive member privileges.";
const ogDescription = "Sparkling Tea Reimagined.";
const logoUrl = `${BRAND.domain}/assets/qing-yun-jian-logo-official.png`;
const organizationId = `${BRAND.domain}/#organization`;
const sameAs = [
  "https://www.instagram.com/qyjworld",
  "https://www.tiktok.com/@qingyunjian",
  "https://xhslink.cn/m/8DgLoyGB3jD"
];

export const metadata: Metadata = {
  title: {
    default: `${BRAND.nameEn} | ${BRAND.line}`,
    template: `%s | ${BRAND.nameEn}`
  },
  description: seoDescription,
  metadataBase: new URL(BRAND.domain),
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      zh: "/zh"
    },
    types: {
      "application/rss+xml": `${BRAND.domain}/rss.xml`
    }
  },
  keywords: [
    "Qing Yun Jian",
    "Sparkling Tea",
    "Bubble Tea Singapore",
    "Oriental Tea",
    "Premium Tea",
    "Chinese Tea",
    "Tea Singapore",
    "MacPherson Bubble Tea",
    "MacPherson Mall",
    "Healthy Tea",
    "Jasmine Tea",
    "Milk Tea",
    "Fruit Tea",
    "Tea Shop Singapore"
  ],
  authors: [{ name: BRAND.nameEn }],
  creator: BRAND.nameEn,
  publisher: BRAND.nameEn,
  applicationName: BRAND.nameEn,
  category: "Food & Drink",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.nameEn
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: BRAND.tagline,
    description: ogDescription,
    url: BRAND.domain,
    siteName: BRAND.nameEn,
    images: [
      SEO_IMAGE
    ],
    locale: "en_SG",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.tagline,
    description: ogDescription,
    images: [SEO_IMAGE.url]
  }
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
  {
    "@type": "Organization",
    "@id": organizationId,
    name: BRAND.nameEn,
    url: BRAND.domain,
    logo: { "@type": "ImageObject", url: logoUrl },
    sameAs
  },
  {
    "@type": "WebSite",
    "@id": `${BRAND.domain}/#website`,
    name: BRAND.nameEn,
    url: BRAND.domain,
    inLanguage: ["en-SG", "zh-SG"],
    publisher: { "@id": organizationId }
  },
  {
    "@type": "ItemList",
    "@id": `${BRAND.domain}/#public-navigation`,
    name: "QING YUN JIAN public pages",
    itemListElement: [
      ["Home", "/en"],
      ["Menu", "/en/menu"],
      ["Membership", "/en/membership"],
      ["About", "/en/about"],
      ["Contact", "/en/contact"],
      ["FAQ", "/en/faq"],
      ["Privacy Policy", "/en/privacy"],
      ["Membership Terms", "/en/terms"]
    ].map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      url: `${BRAND.domain}${path}`
    }))
  },
  {
    "@type": ["LocalBusiness", "FoodEstablishment", "CafeOrCoffeeShop"],
    "@id": `${BRAND.domain}/#location`,
    name: BRAND.nameEn,
    url: BRAND.domain,
    logo: logoUrl,
    image: `${BRAND.domain}${SEO_IMAGE.url}`,
    brand: { "@id": organizationId },
    sameAs,
    address: {
      "@type": "PostalAddress",
      streetAddress: "401 MacPherson Road, #01-23, MacPherson Mall",
      addressLocality: "Singapore",
      postalCode: "368125",
      addressCountry: "SG"
    },
    servesCuisine: "Tea",
    priceRange: "$$",
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "11:00",
      closes: "21:00"
    }],
    hasMap: "https://www.google.com/maps/search/?api=1&query=401%20MacPherson%20Road%20%2301-23%20MacPherson%20Mall%20Singapore%20368125"
  }
  ]
};

function resourceHints() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    return [new URL(supabaseUrl).origin];
  } catch {
    return [];
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {resourceHints().map((origin) => <link key={`dns-${origin}`} href={origin} rel="dns-prefetch" />)}
        {resourceHints().map((origin) => <link key={`preconnect-${origin}`} crossOrigin="anonymous" href={origin} rel="preconnect" />)}
        <StructuredData data={structuredData} />
      </head>
      <body>{children}</body>
    </html>
  );
}
