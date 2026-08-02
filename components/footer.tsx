import Link from "next/link";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { Logo } from "@/components/logo";

const footerLinks = [
  { label: "Instagram", href: "https://www.instagram.com/qyjworld" },
  { label: "TikTok", href: "https://www.tiktok.com/@qyjworld" },
  { label: "Xiaohongshu", href: "https://xhslink.cn/m/8DgLoyGB3jD" },
  { label: "WhatsApp", href: "https://wa.me/?text=Hello%20Qing%20Yun%20Jian%2C%20I%20would%20like%20to%20ask%20about%20your%20tea%20and%20membership." },
  { label: "Email", href: "mailto:hello@qyjworld.com" },
  {
    label: "Google Maps",
    href: "https://www.google.com/maps/search/?api=1&query=401%20MacPherson%20Road%20%2301-23%20MacPherson%20Mall%20Singapore%20368125"
  }
];

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="bg-[#071713] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1.1fr_0.62fr_0.78fr_0.78fr]">
        <div className="max-w-xl">
          <Logo size="footer" />
          <p className="mt-7 max-w-md text-2xl font-semibold leading-snug text-white/90">
            Modern Oriental Sparkling Tea
            <br />
            Crafted in Singapore.
          </p>
          <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-gold">
            <span>青云间</span>
            <br />
            <span className="uppercase">QING YUN JIAN</span>
            <br />
            <span>Born to Ascend</span>
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Explore</p>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-white/80">
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale)}>Home</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/menu")}>Menu</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/promotions")}>Promotions</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/membership")}>Membership</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/about")}>Story</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/contact")}>Visit Us</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Visit Us</p>
          <p className="mt-5 text-sm font-semibold leading-7 text-white/80">
            401 MacPherson Road, #01-23
            <br />
            MacPherson Mall
            <br />
            Singapore 368125
          </p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-white/65">
            <Link className="transition duration-300 hover:text-white" href={localizedPath(locale, "/privacy")}>Privacy Policy</Link>
            <Link className="transition duration-300 hover:text-white" href={localizedPath(locale, "/terms")}>Membership Terms</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Connect</p>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-white/80">
            {footerLinks.map((link) => (
              <Link key={link.label} className="transition duration-300 hover:translate-x-1 hover:text-white" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 md:px-8">
        <p className="mx-auto max-w-7xl text-xs font-semibold text-white/45">
          (c) {new Date().getFullYear()} {BRAND.nameEn}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
