import Link from "next/link";
import Image from "next/image";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { Logo } from "@/components/logo";
import type { PublicStore } from "@/lib/store-types";
import { storeAddressLines, storeDirectionsUrl, storeWhatsAppUrl } from "@/lib/store-types";

function footerLinks(store: PublicStore | null) { return [
  { label: "Instagram", href: "https://www.instagram.com/qyjworld" },
  { label: "TikTok", href: "https://www.tiktok.com/@qingyunjian" },
  { label: "Xiaohongshu", href: "https://xhslink.cn/m/8DgLoyGB3jD" },
  ...(storeWhatsAppUrl(store) ? [{ label: "WhatsApp", href: storeWhatsAppUrl(store)! }] : []),
  { label: "Email", href: "mailto:hello@qyjworld.com" },
  ...(store ? [{ label: "Google Maps", href: storeDirectionsUrl(store) }] : [])
]; }

export function Footer({ locale, store }: { locale: Locale; store: PublicStore | null }) {
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
            {store?.ordering_url && <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={store.ordering_url}>Order Online</Link>}
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/promotions")}>Promotions</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/membership")}>Membership</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/ascend")}>{locale === "zh" ? "茶饮性格测试（英文）" : "Discover Your Tea Profile"}</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/about")}>{locale === "zh" ? "我们的故事" : "Our Story"}</Link>
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/contact")}>Visit Us</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Visit Us</p>
          {store && <p className="mt-5 text-sm font-semibold leading-7 text-white/80">{storeAddressLines(store).map((line) => <span className="block" key={line}>{line}</span>)}</p>}
          <div className="mt-6 grid gap-3 text-sm font-semibold text-white/65">
            <Link className="transition duration-300 hover:text-white" href={localizedPath(locale, "/privacy")}>Privacy Policy</Link>
            <Link className="transition duration-300 hover:text-white" href={localizedPath(locale, "/terms")}>Membership Terms</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Connect</p>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-white/80">
            {footerLinks(store).map((link) => (
              <Link key={link.label} className="transition duration-300 hover:translate-x-1 hover:text-white" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section aria-labelledby="footer-partners" className="mx-auto max-w-7xl border-t border-white/10 px-5 py-10 md:px-8">
        <h2 id="footer-partners" className="text-sm font-bold tracking-[0.14em] text-white/70">{locale === "zh" ? "我们的合作伙伴" : "Our Partners"}</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <Image src="/assets/partners/ibis-styles.png" alt="ibis Styles" width={274} height={272} className="h-24 w-auto object-contain" />
            <p className="text-sm font-semibold text-white/80">ibis Styles</p>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-center text-2xl font-semibold text-white/90">Anytime Fitness</p>
          </div>
          <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <Image src="/assets/partners/tefuda.png" alt="Tefuda" width={150} height={41} className="h-16 w-auto max-w-full object-contain" />
            <p className="text-sm font-semibold text-white/80">Tefuda</p>
          </div>
        </div>
      </section>

      <div className="border-t border-white/10 px-5 py-5 md:px-8">
        <p className="mx-auto max-w-7xl text-xs font-semibold text-white/45">
          (c) {new Date().getFullYear()} {BRAND.nameEn}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
