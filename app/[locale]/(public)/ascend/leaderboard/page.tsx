import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { StructuredData } from "@/components/structured-data";
import { ASCEND_LEADERBOARD_LIMIT, mapAscendLeaderboardRow, type AscendLeaderboardEntry } from "@/lib/ascend/leaderboard";
import type { Locale } from "@/lib/constants";
import { breadcrumbSchema, createPageMetadata } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/admin";

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return createPageMetadata({
    locale: params.locale,
    path: "/ascend/leaderboard",
    title: "ASCEND Leaderboard | QING YUN JIAN",
    description: "Follow the journeys shaping the QING YUN JIAN ASCEND community through completed tea-profile referrals.",
    keywords: ["ASCEND leaderboard", "Qing Yun Jian community", "tea profile referrals"],
    includeLanguageAlternates: false
  });
}

function updatedLabel(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 60) return "Updated recently";
  if (elapsedMinutes < 1_440) return `Updated ${Math.floor(elapsedMinutes / 60)}h ago`;
  return `Updated ${Math.floor(elapsedMinutes / 1_440)}d ago`;
}

export default async function AscendLeaderboardPage({ params }: { params: { locale: Locale } }) {
  if (params.locale === "zh") redirect("/en/ascend/leaderboard");
  noStore();
  const { data, error } = await createServiceClient().rpc("get_ascend_public_leaderboard", { p_limit: ASCEND_LEADERBOARD_LIMIT });
  const entries: AscendLeaderboardEntry[] = error ? [] : (data ?? []).map(mapAscendLeaderboardRow);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071d18] text-white">
      <StructuredData data={breadcrumbSchema(params.locale, [{ name: "Home" }, { name: "ASCEND", path: "/ascend" }, { name: "Leaderboard", path: "/ascend/leaderboard" }])} />
      <section className="px-5 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">QING YUN JIAN · BORN TO ASCEND</p>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-none sm:text-7xl">ASCEND LEADERBOARD</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Every journey begins with one step. Every ascent leaves a trace.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="focus-ring inline-flex min-h-12 items-center rounded-full bg-gold px-7 font-bold text-[#071d18]" href="/en/ascend">Discover Your Profile</Link>
            <Link className="focus-ring inline-flex min-h-12 items-center rounded-full border border-white/25 px-7 font-bold" href="/en/ascend/result">Your ASCEND Result</Link>
          </div>

          {error ? (
            <div className="mt-14 border border-white/15 bg-white/[0.04] p-8"><h2 className="font-serif text-3xl">The ascent is temporarily out of view.</h2><p className="mt-3 text-white/60">Please return shortly.</p></div>
          ) : entries.length ? (
            <ol aria-label="Top ASCEND participants" className="mt-14 grid gap-3">
              {entries.map((entry) => (
                <li className="grid min-w-0 gap-5 border border-white/12 bg-white/[0.045] p-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center md:p-7" key={`${entry.rank}-${entry.displayIdentity}`}>
                  <p className="font-serif text-4xl font-semibold text-gold" aria-label={`Rank ${entry.rank}`}>{String(entry.rank).padStart(2, "0")}</p>
                  <div className="min-w-0"><h2 className="truncate text-base font-bold tracking-[0.12em]">{entry.displayIdentity}</h2><p className="mt-2 text-sm text-white/55">Level {entry.level.level} · {entry.level.name} · {updatedLabel(entry.updatedAt)}</p></div>
                  <div className="grid grid-cols-2 gap-6 sm:text-right">
                    <div><p className="text-2xl font-bold">{entry.successfulReferrals}</p><p className="text-xs uppercase tracking-[0.12em] text-white/45">Successful referrals</p></div>
                    <div><p className="text-2xl font-bold">{entry.totalProfileCompletions}</p><p className="text-xs uppercase tracking-[0.12em] text-white/45">Profile completions</p></div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-14 border border-white/15 bg-white/[0.04] p-8 text-center md:p-14"><h2 className="font-serif text-4xl">The first ascent is still being written.</h2><p className="mx-auto mt-4 max-w-xl text-white/60">Complete your ASCEND profile and share your card to begin the journey.</p></div>
          )}
          <p className="mt-8 text-xs leading-6 text-white/40">Rankings use completed ASCEND profile referrals only. Engagement levels do not include monetary rewards or membership entitlements.</p>
        </div>
      </section>
    </main>
  );
}
