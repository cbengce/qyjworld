export function getPartnerReferralUrl(partnerCode: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.qyjworld.com").replace(/\/$/, "");
  const configuredRoute = process.env.PARTNER_ROUTER_BASE_URL?.trim();
  const route = configuredRoute || `${siteUrl}/api/partner/route`;
  const url = new URL(route, siteUrl);
  url.searchParams.set("partner", partnerCode);
  return url.toString();
}
