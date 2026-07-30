import { Locale } from "@/lib/constants";
import { getPublicLeaderboardEntries } from "@/lib/promotions";
import { Section } from "@/components/ui";

export default async function LeaderboardPage({ params }: { params: { locale: Locale } }) {
  const entries = await getPublicLeaderboardEntries();

  return (
    <main className="overflow-hidden bg-[#f8f5ed]">
      <Section className="pt-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">QING YUN JIAN</p>
          <h1 className="mt-5 break-words font-serif text-5xl font-semibold leading-[0.98] text-forest md:text-7xl">
            COMMUNITY LEADERBOARD
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-forest/60">
            Celebrating community participation, one shared journey at a time.
          </p>

          <div className="mt-12 overflow-hidden bg-white shadow-[0_28px_75px_rgba(10,24,20,0.08)]">
            {entries.length ? (
              <div className="divide-y divide-forest/10">
                {entries.slice(0, 10).map((entry, index) => (
                  <div key={entry.id} className="grid grid-cols-[4rem_1fr] items-center gap-4 px-5 py-5 md:grid-cols-[6rem_1fr] md:px-8">
                    <p className="font-serif text-3xl font-semibold text-gold">{String(index + 1).padStart(2, "0")}</p>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-forest md:text-lg">{entry.school_name}</p>
                      {entry.short_note ? <p className="mt-1 text-sm leading-6 text-forest/55">{entry.short_note}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center md:p-14">
                <p className="font-serif text-4xl font-semibold text-forest">Rankings will be announced soon.</p>
              </div>
            )}
          </div>

          <p className="mt-8 text-sm leading-7 text-forest/50">
            This community leaderboard is organised independently by QING YUN JIAN for promotional participation purposes.
            It is not an academic ranking and does not imply endorsement by any school or public authority.
          </p>
        </div>
      </Section>
    </main>
  );
}
