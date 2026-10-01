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
            <Link className="transition duration-300 hover:translate-x-1 hover:text-white" href={localizedPath(locale, "/group-orders")}>{locale === "zh" ? "团体订购" : "Group Orders"}</Link>
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

      <section aria-labelledby="footer-partners" className="mx-auto max-w-7xl border-t border-white/10 px-5 py-6 md:px-8">
        <h2 id="footer-partners" className="text-xs font-semibold tracking-[0.12em] text-white/60">{locale === "zh" ? "我们的合作伙伴" : "Our Partners"}</h2>
        <div className="mt-4 grid max-w-[352px] grid-cols-3 items-center gap-5">
          <div className="flex h-10 min-w-0 items-center justify-center">
            <Image src="/assets/partners/ibis-styles.png" alt="ibis Styles" width={274} height={272} className="h-10 w-auto object-contain" />
          </div>
          <div className="flex h-10 min-w-0 items-center justify-center">
            <Image src="/assets/partners/anytime-fitness.png" alt="Anytime Fitness" width={640} height={173} className="h-auto w-24 max-w-full bg-white p-1 object-contain" />
          </div>
          <div className="flex h-10 min-w-0 items-center justify-center">
            <Image src="/assets/partners/tefuda.png" alt="Tefuda" width={150} height={41} className="h-auto w-24 max-w-full object-contain" />
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
