import { notFound } from "next/navigation";
import { BootstrapForm } from "@/components/admin/bootstrap-form";
import { Section } from "@/components/ui";

export default function AdminBootstrapPage() {
  if (!process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://localhost")) {
    notFound();
  }

  return (
    <main>
      <Section>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-gold">Local Setup</p>
            <h1 className="mt-3 font-serif text-6xl font-semibold">Super Admin Bootstrap</h1>
            <p className="mt-4 text-forest/70">
              Uses the configured bootstrap email and the password entered here. No password is stored in source code.
            </p>
          </div>
          <BootstrapForm />
        </div>
      </Section>
    </main>
  );
}
