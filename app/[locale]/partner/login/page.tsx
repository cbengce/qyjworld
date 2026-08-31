import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Section } from "@/components/ui";
import type { Locale } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Corporate Partner Login | QING YUN JIAN" },
  robots: { index: false, follow: false, nocache: true }
};

export default async function PartnerLoginPage({ params, searchParams }: { params: { locale: Locale }; searchParams?: { error?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { count } = await supabase.from("partner_users").select("id", { count: "exact", head: true }).eq("status", "active");
    if (count) redirect(`/${params.locale}/partner/dashboard`);
  }

  return (
    <main>
      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Corporate Partner Access</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold text-forest">Partner Login</h1>
            <p className="mt-5 max-w-md leading-7 text-ink/65">Sign in with the email account authorised by QING YUN JIAN. A Partner Code is a public referral identifier and cannot be used as a password.</p>
          </div>
          <div>{searchParams?.error ? <p className="mb-5 bg-red-50 p-4 font-semibold text-red-700">{searchParams.error === "partner-access-unavailable" ? "This account is not linked to one active corporate partner." : "This recovery link is invalid or has expired. Request a new recovery email."}</p> : null}<LoginForm emailLabel="Partner account email" locale={params.locale} passwordLabel="Password" returnTo={`/${params.locale}/partner/dashboard`} submitLabel="Sign In to Partner Dashboard" /><Link className="mt-5 inline-block font-bold text-forest underline underline-offset-4" href={`/${params.locale}/partner/forgot-password`}>Forgot your password?</Link></div>
        </div>
      </Section>
    </main>
  );
}
