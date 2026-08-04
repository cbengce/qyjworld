import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/lib/constants";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/admin";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/ascend/leaderboard",
    title: "School Cup Leaderboard | QING YUN JIAN",
    description: "Follow the Top 10 schools in the QING YUN JIAN cup leaderboard.",
    keywords: ["school cup leaderboard", "Qing Yun Jian", "student leaderboard"],
    includeLanguageAlternates: false
  });
}

type SchoolLeaderboardRow = {
  rank_position: number;
  school_id: string;
  school_name: string;
  total_cups: number;
  last_updated: string;
};

type ActiveSchoolRow = { id: string; school_name: string };
type CupEventRow = { school_id: string; cups: number; created_at: string };

const dateTime = new Intl.DateTimeFormat("en-SG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Singapore"
});

export default async function AscendLeaderboardPage({ params }: { params: { locale: Locale } }) {
  if (params.locale === "zh") redirect("/en/ascend/leaderboard");
  noStore();
  const service = createServiceClient();
  const [schoolResult, eventResult] = await Promise.all([
    service.from("ascend_schools").select("id,school_name").eq("is_active", true),
    service.from("ascend_school_cup_events").select("school_id,cups,created_at")
  ]);
  const error = schoolResult.error ?? eventResult.error;
  const totals = new Map<string, SchoolLeaderboardRow>();

  for (const school of (schoolResult.data ?? []) as ActiveSchoolRow[]) {
    totals.set(school.id, {
      rank_position: 0,
      school_id: school.id,
      school_name: school.school_name,
      total_cups: 0,
      last_updated: ""
    });
  }

  for (const event of (eventResult.data ?? []) as CupEventRow[]) {
    const school = totals.get(event.school_id);
    if (!school) continue;
    school.total_cups += event.cups;
    if (!school.last_updated || event.created_at > school.last_updated) school.last_updated = event.created_at;
  }

  const schools = Array.from(totals.values())
    .filter((school) => school.total_cups >= 1)
    .sort((a, b) => b.total_cups - a.total_cups || a.school_name.localeCompare(b.school_name) || a.school_id.localeCompare(b.school_id))
    .slice(0, 10)
    .map((school, index) => ({ ...school, rank_position: index + 1 }));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071d18] text-white">
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "School Cup Leaderboard", path: "/ascend/leaderboard" }])} />
      <section className="px-5 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">QING YUN JIAN / STUDENT MONTH</p>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-none sm:text-7xl">SCHOOL CUP LEADERBOARD</h1>

          {error ? (
            <div className="mt-14 border border-white/15 bg-white/[0.04] p-8"><h2 className="font-serif text-3xl">The leaderboard is temporarily unavailable.</h2><p className="mt-3 text-white/60">Please return shortly.</p></div>
          ) : schools.length ? (
            <ol aria-label="Top 10 schools by cups" className="mt-14 grid gap-3">
              {schools.map((school) => (
                <li className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border border-white/12 bg-white/[0.045] p-5 md:grid-cols-[88px_minmax(0,1fr)_auto] md:gap-6 md:p-7" key={school.school_id}>
                  <p aria-label={`Rank ${school.rank_position}`} className="font-serif text-3xl font-semibold text-gold md:text-4xl">{String(school.rank_position).padStart(2, "0")}</p>
                  <h2 className="min-w-0 text-base font-bold tracking-[0.06em] md:text-lg">{school.school_name}</h2>
                  <div className="text-right">
                    <p className="text-2xl font-bold md:text-3xl">{Number(school.total_cups).toLocaleString("en-SG")}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-white/45">cups</p>
                    <p className="mt-2 text-xs text-white/40">Last updated {dateTime.format(new Date(school.last_updated))}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-14 border border-white/15 bg-white/[0.04] p-8 text-center md:p-14"><h2 className="font-serif text-4xl">Leaderboard coming soon.</h2><p className="mx-auto mt-4 max-w-xl text-white/60">Schools appear after their first recorded cup.</p></div>
          )}
          <p className="mt-8 text-xs leading-6 text-white/40">Top 10 active schools with at least 1 recorded cup.</p>
        </div>
      </section>
    </main>
  );
}
