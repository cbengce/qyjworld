import { notFound } from "next/navigation";
import { BRAND, Locale } from "@/lib/constants";
import { isLocale } from "@/lib/i18n/routing";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPrimaryStore } from "@/lib/stores";
import { effectiveStoreHoursForDate, storeAddressLines, storeDirectionsUrl } from "@/lib/store-types";
import { StructuredData } from "@/components/structured-data";
import { getCurrentUser, getAdminAuthorizationForUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const user = await getCurrentUser();
  let account = null;
  if (user) {
    const admin = await getAdminAuthorizationForUser(user.id);
    const { count } = admin ? { count: 0 } : await createClient().from("partner_users")
      .select("id", { count: "exact", head: true }).eq("auth_user_id", user.id).eq("status", "active");
    account = {
      label: admin ? (admin.role === "super_admin" ? "Super Admin" : "Admin") : count === 1 ? "Partner" : (locale === "zh" ? "已登录" : "Signed in"),
      email: user.email ?? "",
      href: `/${locale}/${admin ? "admin" : count === 1 ? "partner/dashboard" : "member"}`
    };
  }
  const store = await getPrimaryStore();
  const effectiveHours = store ? effectiveStoreHoursForDate(store) : null;
  const effectiveOpeningHours = effectiveHours?.intervals
    .filter((interval) => !interval.isClosed)
    .map((interval) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][effectiveHours.dayOfWeek],
      opens: interval.opensAt?.slice(0, 5),
      closes: interval.closesAt?.slice(0, 5),
      validFrom: effectiveHours.date,
      validThrough: effectiveHours.date
    })) ?? [];
  const storeSchema = store ? {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "FoodEstablishment", "CafeOrCoffeeShop"],
    "@id": `${BRAND.domain}/#location`, name: BRAND.nameEn, url: BRAND.domain,
    logo: `${BRAND.domain}/assets/qing-yun-jian-logo-official.png`,
    brand: { "@id": `${BRAND.domain}/#organization` },
    address: { "@type": "PostalAddress", streetAddress: storeAddressLines(store).slice(0, 2).join(", "), addressLocality: store.city, postalCode: store.postal_code, addressCountry: store.country_code },
    servesCuisine: "Tea", priceRange: "$$", hasMap: storeDirectionsUrl(store),
    openingHoursSpecification: effectiveOpeningHours.length ? effectiveOpeningHours : undefined
  } : null;

  return (
    <>
      {storeSchema && <StructuredData data={storeSchema} />}
      <Header locale={locale} orderingUrl={store?.ordering_url} account={account} />
      <div lang={locale}>{children}</div>
      <Footer locale={locale} store={store} />
    </>
  );
}
