"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPublicTrafficPath, trafficSource, type TrafficEvent } from "@/lib/site-traffic";

const GA_MEASUREMENT_ID = "G-1T3GRNDRG3";
const GA_DISABLE_KEY = "ga-disable-G-1T3GRNDRG3";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [GA_DISABLE_KEY]?: boolean;
};

/** The first-party traffic endpoint receives no cookies, browser IDs or full URLs. */
export function SiteTrafficRecorder() {
  const path = usePathname();
  const source = useRef<TrafficEvent["source"] | null>(null);
  const lastPath = useRef<string | null>(null);
  const analyticsConfigured = useRef(false);
  const isPublicPage = !!path && isPublicTrafficPath(path);

  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    const optedOut = navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    analytics[GA_DISABLE_KEY] = !isPublicPage || !!optedOut;

    if (analytics[GA_DISABLE_KEY] || !path || analyticsConfigured.current) return;

    analytics.dataLayer ??= [];
    if (!analytics.gtag) {
      analytics.gtag = function () {
        analytics.dataLayer!.push(arguments);
      };
      analytics.gtag("js", new Date());
    }

    analyticsConfigured.current = true;
    analytics.gtag("config", GA_MEASUREMENT_ID);
  }, [isPublicPage, path]);

  useEffect(() => {
    if (!path || !isPublicTrafficPath(path) || navigator.webdriver || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    if (!source.current) source.current = trafficSource(document.referrer, window.location.search);
    const send = (event: TrafficEvent["event"]) => {
      const value: TrafficEvent = { eventId: crypto.randomUUID(), event, path, source: source.current!, device: window.innerWidth < 768 ? "mobile" : "desktop" };
      void fetch("/api/site-traffic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value), credentials: "omit", keepalive: true }).catch(() => {});
    };
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible" && lastPath.current !== path) { lastPath.current = path; send("page_view"); }
    }, 1000);
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      const url = new URL((anchor as HTMLAnchorElement).href, window.location.origin);
      if (url.hostname === "order.qyjworld.com") send("order_click");
      else if (/^\/(en|zh)\/group-orders\/?$/.test(url.pathname) && url.origin === window.location.origin) send("group_click");
    };
    document.addEventListener("click", click);
    return () => { window.clearTimeout(timer); document.removeEventListener("click", click); };
  }, [path]);
  return isPublicPage ? (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  ) : null;
}
