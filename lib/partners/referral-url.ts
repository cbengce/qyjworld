const PUBLIC_SITE_URL = "https://www.qyjworld.com";

function publicUrl(value: string | undefined, base: string): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!["qyjworld.com", "www.qyjworld.com"].includes(url.hostname) || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

export function getPublicSiteUrl() {
  return publicUrl(process.env.NEXT_PUBLIC_SITE_URL, PUBLIC_SITE_URL)?.origin ?? PUBLIC_SITE_URL;
}

export function getPartnerReferralUrl(partnerCode: string) {
  // These links are customer-facing, including when generated in a preview or locally.
  const siteUrl = getPublicSiteUrl();
  const url = publicUrl(process.env.PARTNER_ROUTER_BASE_URL, siteUrl)
    ?? new URL("/api/partner/route", siteUrl);
  url.searchParams.set("partner", partnerCode);
  return url.toString();
}
