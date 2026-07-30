import { Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams?: { returnTo?: string };
}) {
  const t = getDictionary(params.locale);
  return (
    <main>
      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-gold">Member Access</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold">{t.login.title}</h1>
          </div>
          <LoginForm locale={params.locale} returnTo={searchParams?.returnTo} />
        </div>
      </Section>
    </main>
  );
}
