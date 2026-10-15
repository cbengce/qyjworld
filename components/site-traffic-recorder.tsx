"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isPublicTrafficPath, trafficSource, type TrafficEvent } from "@/lib/site-traffic";

/** No cookies, persistent browser IDs, query strings or full referrers are transmitted. */
export function SiteTrafficRecorder() {
  const path = usePathname();
  const source = useRef<TrafficEvent["source"] | null>(null);
  const lastPath = useRef<string | null>(null);
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
  return null;
}
