import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.nameEn} | ${BRAND.line}`,
    short_name: BRAND.nameEn,
    description: `${BRAND.nameEn} is a Singapore-based modern Oriental tea brand.`,
    start_url: "/en",
    display: "standalone",
    background_color: "#f8f5ed",
    theme_color: "#123c2f",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
