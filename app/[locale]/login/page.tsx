import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAdminAuthorizationForUser } from "@/lib/data";
import { getActivePartnerForUser } from "@/lib/partners/access";
import { createClient } from "@/lib/supabase/server";
import { getSafeLoginDestination } from "@/lib/auth/login-destination";
import type { Metadata } from "next";
import { Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: { absolute: "Member Login | Qing Yun Jian" },
  robots: { index: false, follow: false, nocache: true }
};

export default async function LoginPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams?: { returnTo?: string };
}) {
  const user = await getCurrentUser();
  if (user) {
    const admin = await getAdminAuthorizationForUser(user.id);
    const partner = await getActivePartnerForUser(createClient(), user.id);
    redirect(getSafeLoginDestination({ locale: params.locale, returnTo: searchParams?.returnTo, isAdmin: Boolean(admin), isPartner: Boolean(partner), isGuest: user.user_metadata?.account_type === "guest" }));
  }
  const t = getDictionary(params.locale);
  return (
    <main>
      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-gold">{params.locale === "zh" ? "会员与访客登录" : "Member & Guest Access"}</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold">{t.login.title}</h1>
            <p className="mt-5 text-forest/70">{params.locale === "zh" ? "会员登录后进入会员后台；免费访客账号进入团单与报价页面。" : "Members go to their membership dashboard. Free guest accounts go to group orders and quotations."}</p>
            <Link className="mt-5 inline-block font-bold underline" href={`/${params.locale}/partner/login`}>{params.locale === "zh" ? "合作伙伴？请在这里登录 →" : "Corporate partner? Sign in here →"}</Link>
          </div>
          <LoginForm locale={params.locale} returnTo={searchParams?.returnTo} />
        </div>
      </Section>
    </main>
  );
}
