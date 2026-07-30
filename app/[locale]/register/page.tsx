import { Locale } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Section } from "@/components/ui";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage({ params }: { params: { locale: Locale } }) {
  const t = getDictionary(params.locale);
  return (
    <main>
      <Section>
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold text-gold">Soft Launch</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold">{t.register.title}</h1>
            <p className="mt-5 text-forest/70">
              Registration creates a pending membership. Staff activate membership after payment confirmation.
            </p>
          </div>
          <RegisterForm locale={params.locale} />
        </div>
      </Section>
    </main>
  );
}
