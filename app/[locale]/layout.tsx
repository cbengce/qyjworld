import { notFound } from "next/navigation";
import { Locale } from "@/lib/constants";
import { isLocale } from "@/lib/i18n/routing";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;

  return (
    <>
      <Header locale={locale} />
      <div lang={locale}>{children}</div>
      <Footer locale={locale} />
    </>
  );
}
