import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PartnerPasswordResetForm } from "@/components/auth/partner-password-reset-form";
import { Section } from "@/components/ui";
import type { Locale } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Set Partner Password | QING YUN JIAN" },
  robots: { index: false, follow: false, nocache: true }
};

export default async function PartnerResetPasswordPage({ params }: { params: { locale: Locale } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${params.locale}/partner/login?error=invalid-recovery-link`);
  const { count } = await supabase.from("partner_users").select("id", { count: "exact", head: true }).eq("status", "active");
  if (count !== 1) redirect(`/${params.locale}/partner/login?error=partner-access-unavailable`);

  return <main><Section><div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Verified Recovery</p><h1 className="mt-3 font-serif text-6xl font-semibold text-forest">Set New Password</h1><p className="mt-5 max-w-md leading-7 text-ink/65">Choose a new password of at least eight characters. Your existing Tefuda partner mapping and account identity will remain unchanged.</p></div><PartnerPasswordResetForm locale={params.locale} /></div></Section></main>;
}
