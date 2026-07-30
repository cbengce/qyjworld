import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/en/admin/", "/zh/admin/", "/en/member/", "/zh/member/"]
    },
    sitemap: `${BRAND.domain}/sitemap.xml`,
    host: BRAND.domain
  };
}
