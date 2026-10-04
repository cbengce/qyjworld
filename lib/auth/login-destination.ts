export function getSafeLoginDestination({
  locale,
  returnTo,
  isAdmin,
  isPartner = false,
  isGuest = false
}: {
  locale: string;
  returnTo?: FormDataEntryValue | null;
  isAdmin: boolean;
  isPartner?: boolean;
  isGuest?: boolean;
}) {
  const defaultDestination = isAdmin
    ? `/${locale}/admin/promotions`
    : `/${locale}/${isPartner ? "partner/dashboard" : isGuest ? "guest" : "member"}`;
  if (typeof returnTo !== "string" || !returnTo) return defaultDestination;
  if (!returnTo.startsWith(`/${locale}/`) || returnTo.startsWith("//") || returnTo.includes("://") || returnTo.includes("\\")) return defaultDestination;
  const path = returnTo.split(/[?#]/)[0];
  if (path === `/${locale}/login`) return defaultDestination;
  if (path.startsWith(`/${locale}/admin`) && !isAdmin) return defaultDestination;
  if (isGuest && !isPartner && (path === `/${locale}/member` || path.startsWith(`/${locale}/member/`))) return defaultDestination;
  if (isPartner && (path === `/${locale}/member` || path.startsWith(`/${locale}/member/`))) return defaultDestination;
  return returnTo;
}
