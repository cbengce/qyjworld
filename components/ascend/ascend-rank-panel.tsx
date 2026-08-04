import Link from "next/link";
import { progressToNextAscendLevel, type AscendPersonalRank } from "@/lib/ascend/leaderboard";

export function AscendRankPanel({ locale, rank }: { locale: string; rank: AscendPersonalRank | null }) {
  const referrals = rank?.successfulReferrals ?? 0;
  const progress = progressToNextAscendLevel(referrals);
  return (
    <section aria-labelledby="ascend-rank-heading" className="mt-8 border border-forest/15 bg-white p-6 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Your journey</p>
      <h2 className="mt-3 font-serif text-3xl font-semibold" id="ascend-rank-heading">YOUR ASCEND RANK</h2>
      {rank ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-forest/50">Current rank</p><p className="mt-2 font-serif text-4xl font-semibold">#{rank.rank}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-forest/50">Successful referrals</p><p className="mt-2 font-serif text-4xl font-semibold">{referrals}</p></div>
          </div>
          <p className="mt-5 text-sm font-semibold text-forest/70">Level {rank.level.level} - {rank.level.name}</p>
          <div aria-label={`${progress.percent}% progress to next level`} className="mt-3 h-2 overflow-hidden rounded-full bg-forest/10">
            <div className="h-full rounded-full bg-gold" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-forest/60">{progress.remaining ? `${progress.remaining} more completed referral${progress.remaining === 1 ? "" : "s"} to the next milestone.` : "Highest MVP level reached."}</p>
        </>
      ) : (
        <><p className="mt-5 font-serif text-2xl font-semibold">Start your ASCEND journey</p><p className="mt-2 text-forest/60">0 successful referrals. Share your card to begin.</p></>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="focus-ring inline-flex min-h-11 items-center rounded-full border border-forest/20 px-5 text-sm font-bold" href={`/${locale}/ascend/leaderboard`}>View Leaderboard</Link>
        <a className="focus-ring inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-bold text-white" href="#ascend-share-card">Share Your ASCEND Card</a>
      </div>
    </section>
  );
}
