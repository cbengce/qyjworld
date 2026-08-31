import type { Metadata } from "next";
import Link from "next/link";
import { PartnerPasswordRecoveryForm } from "@/components/auth/partner-password-recovery-form";
import { Section } from "@/components/ui";
import type { Locale } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Partner Password Recovery | QING YUN JIAN" },
  robots: { index: false, follow: false, nocache: true }
};

export default function PartnerForgotPasswordPage({ params }: { params: { locale: Locale } }) {
  return <main><Section><div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Corporate Partner Access</p><h1 className="mt-3 font-serif text-6xl font-semibold text-forest">Reset Your Password</h1><p className="mt-5 max-w-md leading-7 text-ink/65">Enter the email address for your authorised partner account. We will send a secure, time-limited recovery link.</p><Link className="mt-6 inline-block font-bold text-forest underline underline-offset-4" href={`/${params.locale}/partner/login`}>Return to Partner Login</Link></div><PartnerPasswordRecoveryForm locale={params.locale} /></div></Section></main>;
}
