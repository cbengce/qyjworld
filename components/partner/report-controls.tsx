import type { Locale } from "@/lib/constants";
import { REPORT_FLOOR } from "@/lib/partners/report";

export function PartnerReportControls({ locale, from, to, partnerId, storeId }: { locale: Locale; from?: string; to?: string; partnerId?: string; storeId?: string }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
  return <section className="mt-6 rounded-2xl border border-forest/10 bg-white p-5">
    <h2 className="font-bold">Daily report · Print or download</h2>
    <p className="mt-2 text-sm leading-6 text-ink/60">Daily cups, paid orders, sales and commission, with a period total. Uses the current partner and store selection. Includes paid and completed orders.</p>
    <form className="mt-4" method="get" target="_blank" action={`/${locale}/partner/report`}>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Start date<input required className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-forest/15 px-3 text-base" type="date" name="from" min={REPORT_FLOOR} max={today} defaultValue={from ?? today.slice(0,8)+"01"}/></label><label className="text-sm font-bold">End date<input required className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-forest/15 px-3 text-base" type="date" name="to" min={REPORT_FLOOR} max={today} defaultValue={to ?? today}/></label></div>
      {partnerId ? <input type="hidden" name="partner" value={partnerId}/> : null}
      {storeId ? <input type="hidden" name="store" value={storeId}/> : null}
      <input type="hidden" name="format" value="xlsx"/>
      <div className="mt-4 flex flex-wrap gap-3"><button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white">View & print report</button><button formAction="/api/partner/report" className="focus-ring min-h-12 rounded-full border border-forest/25 px-6 text-sm font-bold">Download Excel (.xlsx)</button></div>
    </form>
  </section>;
}
