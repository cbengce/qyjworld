import type { SupabaseClient } from "@supabase/supabase-js";
import { APPZPOS_REPORT_FLOOR, syncHealth, type PollState } from "@/lib/pos/appzpos/monitoring";
type Mapping = { id: string; enabled: boolean; stores: { name: string } | null; pos_poll_state: PollState | PollState[] | null };
const time = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("en-SG", { timeZone: "Asia/Singapore" }) : "—";

// Only render beneath the calling page's Super Admin gate. Never expose raw error text or credentials.
export async function AppzposSyncStatus({ client }: { client: SupabaseClient }) {
  const [mappings, unmatched] = await Promise.all([
    client.from("pos_provider_store_mappings").select("id,enabled,stores(name),pos_poll_state(last_success_at,last_successful_to,last_attempt_at,last_error,lease_expires_at)").eq("provider", "appzpos"),
    client.from("pos_provider_orders").select("id", { count: "exact", head: true }).eq("provider", "appzpos").in("referral_match_status", ["unknown", "inactive"]).gte("order_created_at", APPZPOS_REPORT_FLOOR + "T00:00:00+08:00")
  ]);
  if (mappings.error || unmatched.error) return <section className="mt-6 rounded-2xl border border-forest/10 bg-white p-5"><h2 className="font-bold">POS sync status unavailable</h2><p className="mt-2 text-sm text-ink/60">Unable to read sync records. Order totals do not confirm sync health.</p></section>;
  const rows = (mappings.data ?? []) as unknown as Mapping[];
  return <section className="mt-6 rounded-2xl border border-forest/10 bg-white p-5">
    <h2 className="font-bold">Automatic POS sync · All stores</h2>
    <p className="mt-2 text-sm text-ink/60">Scheduled every 15 minutes. Refresh this page to check. Times shown in Singapore time.</p>
    {!rows.length ? <p className="mt-3 text-sm">No APPZPOS store mapping configured.</p> : null}
    <div className="mt-4 grid gap-3 md:grid-cols-2">{rows.map(row => {
      const state = Array.isArray(row.pos_poll_state) ? row.pos_poll_state[0] ?? null : row.pos_poll_state;
      const health = syncHealth(row.enabled, state);
      return <article key={row.id} className="rounded-xl bg-paper p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{row.stores?.name ?? "Store"}</p><p className={health === "Up to date" ? "text-sm font-bold text-forest" : "text-sm font-bold text-amber-800"}>{health}</p></div><dl className="mt-3 grid gap-1 text-sm"><dt className="text-ink/60">Last successful run</dt><dd>{time(state?.last_success_at ?? null)}</dd><dt className="mt-2 text-ink/60">Orders fetched through</dt><dd>{time(state?.last_successful_to ?? null)}</dd><dt className="mt-2 text-ink/60">Last attempt</dt><dd>{time(state?.last_attempt_at ?? null)}</dd></dl></article>;
    })}</div>
    <p className="mt-4 text-sm"><strong>{unmatched.count ?? "Unknown"}</strong> orders with an unknown or inactive Partner Code since 27 September 2026. Ordinary orders without a Partner Code are excluded from this count.</p>
  </section>;
}
