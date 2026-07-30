import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { Section } from "@/components/ui";

export default async function DevFixturesPage({ params }: { params: { locale: Locale } }) {
  const { role } = await requireAdmin(params.locale);

  if (!(process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://localhost") || role !== "super_admin") {
    return (
      <main>
        <Section>
          <p>Development fixtures are available only to a local Super Admin.</p>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Section>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold text-gold">Local Verification</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">Staff and Manager Fixtures</h1>
          <form action="/api/admin/dev-fixtures" className="mt-8 grid gap-4 bg-white p-6 shadow-soft" method="post">
            <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="staffEmail" placeholder="Staff email" required type="email" />
            <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="staffPassword" placeholder="Staff temporary password" required type="password" />
            <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="managerEmail" placeholder="Manager email" required type="email" />
            <input className="focus-ring min-h-12 rounded-sm border border-forest/15 bg-white px-4 text-base text-forest transition duration-200 placeholder:text-forest/35 hover:border-forest/30" name="managerPassword" placeholder="Manager temporary password" required type="password" />
            <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink" type="submit">
              Create Fixtures
            </button>
          </form>
        </div>
      </Section>
    </main>
  );
}
