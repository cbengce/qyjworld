import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.nameEn} | ${BRAND.line}`,
    template: `%s | ${BRAND.nameEn}`
  },
  description: `${BRAND.nameEn} is a Singapore-based modern Oriental tea brand.`,
  metadataBase: new URL(BRAND.domain),
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      zh: "/zh"
    }
  },
  applicationName: BRAND.nameEn,
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
    title: `${BRAND.nameEn} | ${BRAND.line}`,
    description: `${BRAND.nameEn} is a Singapore-based modern Oriental tea brand.`,
    url: BRAND.domain,
    siteName: BRAND.nameEn,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 1200,
        alt: `${BRAND.nameEn} official logo`
      }
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
    title: `${BRAND.nameEn} | ${BRAND.line}`,
    description: `${BRAND.nameEn} is a Singapore-based modern Oriental tea brand.`,
    images: ["/opengraph-image.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
