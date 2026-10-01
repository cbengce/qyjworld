"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { Logo } from "@/components/logo";
import { logoutAccount } from "@/app/actions";

export type HeaderAccount = { label: string; email: string; href: string };

export function Header({ locale, orderingUrl, account }: { locale: Locale; orderingUrl?: string | null; account?: HeaderAccount | null }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "zh" : "en";
  // The homepage now has a light Pegasus hero; use the existing light header.
  const transparentOnHero = false;
  const navItems = [
    { label: "Home", href: localizedPath(locale) },
    { label: "Menu", href: localizedPath(locale, "/menu") },
    { label: locale === "zh" ? "团体订购" : "Group Orders", href: localizedPath(locale, "/group-orders") },
    { label: "Membership", href: localizedPath(locale, "/membership") },
    ...(orderingUrl ? [{ label: "Order Online", href: orderingUrl }] : []),
    { label: locale === "zh" ? "我们的故事" : "Our Story", href: localizedPath(locale, "/about") },
    { label: "Visit Us", href: localizedPath(locale, "/contact") },
    { label: locale === "zh" ? "合作伙伴后台" : "Partner Dashboard", href: localizedPath(locale, "/partner/login") }
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky inset-x-0 top-0 z-50 transition-all duration-500 ${
        transparentOnHero
          ? "border-b border-transparent bg-transparent"
          : scrolled
          ? "border-b border-forest/10 bg-[#fbfaf6]/[0.82] shadow-[0_18px_60px_rgba(12,31,26,0.10)] backdrop-blur-xl"
          : "border-b border-forest/10 bg-[#fbfaf6]/[0.88] backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-[1.05rem] sm:gap-3 sm:px-5 md:px-8">
        <Link href={localizedPath(locale)} aria-label={`${BRAND.nameEn} home`} className="shrink-0">
          <Logo priority />
        </Link>
        <nav
          className={`hidden items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 lg:flex xl:gap-4 ${
            transparentOnHero ? "text-white/80" : "text-forest/70"
          }`}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`transition duration-300 ${transparentOnHero ? "hover:text-white" : "hover:text-forest"} ${
                pathname === item.href ? (transparentOnHero ? "text-white" : "text-forest") : ""
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {account ? <>
            <Link href={account.href} title={account.email} className={`focus-ring flex min-h-11 max-w-[150px] flex-col justify-center px-2 text-xs font-semibold sm:max-w-[200px] ${transparentOnHero ? "text-white" : "text-forest"}`}>
              <span>{account.label}</span>
              <span className="truncate text-[10px] font-normal opacity-65">{account.email}</span>
            </Link>
            <form action={logoutAccount}>
              <input name="locale" type="hidden" value={locale} />
              <button className={`focus-ring min-h-11 rounded-full border px-3 text-xs font-bold sm:px-5 sm:text-sm ${transparentOnHero ? "border-white/40 text-white" : "border-forest/20 text-forest"}`} type="submit">{locale === "zh" ? "退出登录" : "Logout"}</button>
            </form>
          </> : <><Link
            className={`hidden text-xs font-bold uppercase tracking-[0.14em] transition duration-300 hover:-translate-y-px sm:inline ${
              transparentOnHero ? "text-white/60 hover:text-white" : "text-forest/50 hover:text-forest"
            }`}
            href={`/${otherLocale}`}
          >
            {otherLocale.toUpperCase()}
          </Link>
          <Link
            className={`focus-ring inline-flex min-h-11 items-center px-2 text-xs font-semibold transition duration-300 hover:-translate-y-px sm:px-3 sm:text-sm ${
              transparentOnHero ? "text-white/75 hover:text-white" : "text-forest/80 hover:text-forest"
            }`}
            href={localizedPath(locale, "/login")}
          >
            Login
          </Link>
          <Link
            className={`focus-ring inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-bold shadow-[0_14px_35px_rgba(18,60,47,0.18)] transition duration-300 hover:-translate-y-0.5 sm:px-5 sm:text-sm ${
              transparentOnHero
                ? "bg-white text-forest hover:bg-gold hover:text-ink"
                : "bg-forest text-white hover:bg-ink"
            }`}
            href={localizedPath(locale, "/register")}
          >
            Join Now
          </Link>
          </>}
        </div>
      </div>
      <nav aria-label={locale === "zh" ? "快捷导航" : "Quick navigation"} className="flex flex-wrap justify-end gap-2 px-3 pb-3 sm:px-5 lg:hidden">
        <Link href={localizedPath(locale, "/group-orders")} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-4 text-xs font-bold text-white">{locale === "zh" ? "团体订购" : "Group Orders"}</Link>
        <Link href={localizedPath(locale, "/about")} className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-xs font-bold ${transparentOnHero ? "border-white/40 text-white" : "border-forest/20 text-forest"}`}>
          {locale === "zh" ? "我们的故事" : "Our Story"}
        </Link>
        <Link href={localizedPath(locale, "/partner/login")} className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-xs font-bold ${transparentOnHero ? "border-white/40 text-white" : "border-forest/20 text-forest"}`}>
          {locale === "zh" ? "合作伙伴后台" : "Partner Dashboard"}<span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </nav>
    </header>
  );
}
