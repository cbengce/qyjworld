"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { switchLocalePath } from "@/lib/i18n/routing";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const target = locale === "zh" ? "en" : "zh";
  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-SG" : "en-SG"; }, [locale]);
  return <Link href={switchLocalePath(pathname, target)} hrefLang={target === "zh" ? "zh-SG" : "en-SG"} lang={target} aria-label={locale === "zh" ? "切换至英文，保留当前页面" : "Switch to Chinese on this page"} onClick={event => {
    // Keep search terms, campaign parameters and article anchors without including
    // browser state in server-rendered markup.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.push(`${switchLocalePath(pathname, target)}${window.location.search}${window.location.hash}`);
  }} className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full border border-forest/20 px-3 text-xs font-bold text-forest">
    {target === "zh" ? "中文" : "EN"}
  </Link>;
}
