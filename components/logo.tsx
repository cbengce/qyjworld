import Image from "next/image";
import { BRAND } from "@/lib/constants";

type LogoSize = "header" | "footer";

const logoSizes: Record<LogoSize, { className: string; height: number; width: number }> = {
  header: {
    className: "h-14 w-14 md:h-16 md:w-16",
    height: 64,
    width: 64
  },
  footer: {
    className: "h-24 w-24",
    height: 96,
    width: 96
  }
};

export function Logo({ size = "header", priority = false }: { size?: LogoSize; priority?: boolean }) {
  const config = logoSizes[size];

  return (
    <Image
      alt={`${BRAND.nameEn} official logo`}
      className={`${config.className} object-contain shadow-[0_16px_42px_rgba(5,18,15,0.18)]`}
      height={config.height}
      priority={priority}
      sizes={size === "footer" ? "96px" : "(min-width: 768px) 64px, 56px"}
      src="/assets/qing-yun-jian-logo-official.png"
      width={config.width}
    />
  );
}
