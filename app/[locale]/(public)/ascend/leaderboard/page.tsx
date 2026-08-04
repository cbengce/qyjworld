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
  rank_position: number | string;
  school_id: string;
  school_name: string;
  total_cups: number | string;
  last_updated: string;
};

const dateTime = new Intl.DateTimeFormat("en-SG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Singapore"
});

export default async function AscendLeaderboardPage({ params }: { params: { locale: Locale } }) {
  if (params.locale === "zh") redirect("/en/ascend/leaderboard");
  noStore();
  const { data, error } = await createServiceClient().rpc("get_ascend_school_cup_leaderboard", { p_limit: 10 });
  const schools = (error ? [] : data ?? []) as SchoolLeaderboardRow[];

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
            <div className="mt-14 border border-white/15 bg-white/[0.04] p-8 text-center md:p-14"><h2 className="font-serif text-4xl">Leaderboard coming soon.</h2><p className="mx-auto mt-4 max-w-xl text-white/60">Schools appear after reaching 10 recorded cups.</p></div>
          )}
          <p className="mt-8 text-xs leading-6 text-white/40">Top 10 active schools with at least 10 recorded cups.</p>
        </div>
      </section>
    </main>
  );
}
