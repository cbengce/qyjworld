"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND, Locale } from "@/lib/constants";
import { localizedPath } from "@/lib/i18n/routing";
import { Logo } from "@/components/logo";

export function Header({ locale, orderingUrl }: { locale: Locale; orderingUrl?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "zh" : "en";
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const transparentOnHero = isHome && !scrolled;
  const navItems = [
    { label: "Home", href: localizedPath(locale) },
    { label: "Menu", href: localizedPath(locale, "/menu") },
    { label: "Membership", href: localizedPath(locale, "/membership") },
    ...(orderingUrl ? [{ label: "Order Online", href: orderingUrl }] : []),
    { label: "Story", href: localizedPath(locale, "/about") },
    { label: "Visit Us", href: localizedPath(locale, "/contact") }
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-[1.05rem] md:px-8">
        <Link href={localizedPath(locale)} aria-label={`${BRAND.nameEn} home`} className="shrink-0">
          <Logo priority />
        </Link>
        <nav
          className={`hidden items-center gap-8 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-500 lg:flex ${
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            className={`hidden text-xs font-bold uppercase tracking-[0.14em] transition duration-300 hover:-translate-y-px sm:inline ${
              transparentOnHero ? "text-white/60 hover:text-white" : "text-forest/50 hover:text-forest"
            }`}
            href={`/${otherLocale}`}
          >
            {otherLocale.toUpperCase()}
          </Link>
          <Link
            className={`focus-ring hidden min-h-11 items-center px-3 text-sm font-semibold transition duration-300 hover:-translate-y-px sm:inline-flex ${
              transparentOnHero ? "text-white/75 hover:text-white" : "text-forest/80 hover:text-forest"
            }`}
            href={localizedPath(locale, "/login")}
          >
            Login
          </Link>
          <Link
            className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold shadow-[0_14px_35px_rgba(18,60,47,0.18)] transition duration-300 hover:-translate-y-0.5 ${
              transparentOnHero
                ? "bg-white text-forest hover:bg-gold hover:text-ink"
                : "bg-forest text-white hover:bg-ink"
            }`}
            href={localizedPath(locale, "/register")}
          >
            Join Now
          </Link>
        </div>
      </div>
    </header>
  );
}
