import { Locale, locales } from "@/lib/constants";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function defaultLocale(): Locale {
  return "en";
}

export function localizedPath(locale: Locale, path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${cleanPath === "/" ? "" : cleanPath}`;
}

export function switchLocalePath(pathname: string, locale: Locale) {
  const path = pathname.replace(/^\/(en|zh)(?=\/|$)/, "");
  return localizedPath(locale, path);
}
