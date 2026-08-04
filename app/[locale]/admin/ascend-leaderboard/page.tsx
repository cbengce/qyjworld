import { AdminNavigation } from "@/components/admin/admin-navigation";
import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { mapAscendLeaderboardRow, type AscendLeaderboardEntry } from "@/lib/ascend/leaderboard";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminAscendLeaderboardPage({ params }: { params: { locale: Locale } }) {
  await requireAdmin(params.locale);
  const supabase = createServiceClient();
  const [summary, top, recent] = await Promise.all([
    supabase.from("ascend_referrals").select("visits,completed_tests,shares", { count: "exact" }),
    supabase.rpc("get_ascend_public_leaderboard", { p_limit: 10 }),
    supabase.from("ascend_referral_events").select("id,metric,created_at,ascend_referrals!inner(referral_code)").order("created_at", { ascending: false }).limit(20)
  ]);
  const rows = summary.data ?? [];
  const totals = rows.reduce((value, row) => ({
    completions: value.completions + Number(row.completed_tests),
    shares: value.shares + Number(row.shares),
    flags: value.flags + (Number(row.completed_tests) > Number(row.visits) ? 1 : 0)
  }), { completions: 0, shares: 0, flags: 0 });
  const entries: AscendLeaderboardEntry[] = (top.data ?? []).map(mapAscendLeaderboardRow);

  return <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Admin · ASCEND</p><h1 className="mt-4 font-serif text-5xl font-semibold">Referral leaderboard</h1><p className="mt-4 max-w-2xl text-forest/60">Read-only operational summary. Rankings come directly from verified ASCEND referral counters.</p>
    <AdminNavigation locale={params.locale} />
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Referral records', summary.count ?? 0], ['Completed referrals', totals.completions], ['Shares', totals.shares], ['Review flags', totals.flags]].map(([label, value]) => <div className="border border-forest/10 bg-white p-5 shadow-soft" key={label}><p className="text-xs font-bold uppercase tracking-[0.14em] text-forest/50">{label}</p><p className="mt-2 font-serif text-4xl font-semibold">{value}</p></div>)}
    </section>
    <section className="mt-8 border border-forest/10 bg-white p-6 shadow-soft"><h2 className="font-serif text-3xl font-semibold">Top 10</h2>{entries.length ? <ol className="mt-5 divide-y divide-forest/10">{entries.map((entry) => <li className="grid gap-2 py-4 sm:grid-cols-[60px_1fr_auto]" key={`${entry.rank}-${entry.displayIdentity}`}><strong>#{entry.rank}</strong><span>{entry.displayIdentity} · {entry.level.name}</span><span>{entry.successfulReferrals} completions</span></li>)}</ol> : <p className="mt-4 text-forest/55">No completed referrals yet.</p>}</section>
    <section className="mt-8 border border-forest/10 bg-white p-6 shadow-soft"><h2 className="font-serif text-3xl font-semibold">Recent referral activity</h2>{recent.data?.length ? <ul className="mt-5 divide-y divide-forest/10 text-sm">{recent.data.map((event: { id: string; metric: string; created_at: string }) => <li className="flex flex-wrap justify-between gap-3 py-3" key={event.id}><span>{event.metric.replaceAll('_', ' ')}</span><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</time></li>)}</ul> : <p className="mt-4 text-forest/55">No idempotent activity events recorded yet.</p>}</section>
  </div></main>;
}
