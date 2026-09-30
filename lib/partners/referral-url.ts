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
  // Supplier-issued QR format verified from the owner's three original QR links.
  const url = new URL("https://order.qyjworld.com/Order/12");
  url.searchParams.set("Referral_Code", partnerCode.trim().toUpperCase());
  return url.toString();
}
