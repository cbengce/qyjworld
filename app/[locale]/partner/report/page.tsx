import Link from "next/link";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/constants";
import { getPartnerReport, PartnerReportError, type ReportSearch } from "@/lib/partners/report";
import { PrintReportButton } from "@/components/partner/print-report-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner Daily Report | QINGYUNJIAN", robots: { index: false, follow: false } };
const money = (minor: number) => `S$${(minor/100).toFixed(2)}`;
export default async function PartnerReportPage({ params,searchParams }: { params:{locale:Locale};searchParams:ReportSearch }) {
  let report;
  try { report = await getPartnerReport(searchParams); }
  catch (error) {
    if (error instanceof PartnerReportError) {
      if (error.code === "login_required") redirect(`/${params.locale}/partner/login`);
      if (error.code === "password_required") redirect(`/${params.locale}/partner/reset-password`);
      return <main className="mx-auto max-w-3xl px-5 py-12"><h1 className="font-serif text-3xl">Report unavailable</h1><p className="mt-4">{error.message}</p><Link className="mt-5 inline-block underline" href={`/${params.locale}/partner/dashboard`}>Back to dashboard</Link></main>;
    }
    throw error;
  }
  const query = new URLSearchParams({from:report.from,to:report.to,format:"xlsx"});
  if (searchParams.partner) query.set("partner",searchParams.partner);
  if (searchParams.store) query.set("store",searchParams.store);
  return <main className="partner-print-report mx-auto max-w-6xl px-4 py-8 text-forest md:px-8">
    <style>{`@media print { @page { size: A4 landscape; margin: 12mm; } header, footer, nav, .report-no-print { display: none !important; } html, body { background: white !important; } .partner-print-report { max-width: none !important; padding: 0 !important; color: black !important; font-size: 11pt; } .partner-print-report table { width: 100%; table-layout: fixed; } .partner-print-report th, .partner-print-report td { padding: 6px; overflow-wrap: anywhere; } .partner-print-report thead { display: table-header-group; } .partner-print-report tfoot { display: table-row-group; } .partner-print-report tr { break-inside: avoid; } .partner-print-report .report-table-wrap { overflow: visible !important; } }`}</style>
    <div className="report-no-print mb-6 flex flex-wrap gap-3"><PrintReportButton/><a className="min-h-12 rounded-full border border-forest/20 px-6 py-3 text-sm font-bold" href={`/api/partner/report?${query}`}>Download Excel (.xlsx)</a><Link className="px-4 py-3 text-sm underline" href={`/${params.locale}/partner/dashboard`}>Back to dashboard</Link></div>
    <p className="text-sm font-bold tracking-widest">QINGYUNJIAN</p><h1 className="mt-2 font-serif text-3xl font-semibold">Partner Daily Report</h1>
    <p className="mt-3 font-bold">{report.scopeName} · {report.storeName}</p><p className="mt-2 text-sm">{report.from} to {report.to} · Singapore time</p>
    <p className="mt-1 text-xs text-ink/60">Generated {new Date(report.generatedAt).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</p>
    <p className="mt-4 text-sm leading-6">Paid and completed orders only. Pending and cancelled orders are excluded. Commission uses recorded order-linked amounts.</p>
    {report.totals.missingCommission ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Commission is pending review for {report.totals.missingCommission} orders. Incomplete daily and period commission totals are shown as pending, rather than zero.</p> : null}
    <div className="report-table-wrap mt-6 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="bg-forest/5"><tr>{["Date (SGT)","Partner","Paid orders","Cups","Paid sales","Commission","Commission status"].map(label=><th key={label} className="border border-forest/15 p-3">{label}</th>)}</tr></thead><tbody>{report.daily.map(row=><tr key={`${row.day}:${row.partnerCode}`}><td className="border border-forest/15 p-3">{row.day}</td><td className="border border-forest/15 p-3">{row.partnerName} ({row.partnerCode})</td><td className="border border-forest/15 p-3">{row.orders}</td><td className="border border-forest/15 p-3">{row.cups}</td><td className="border border-forest/15 p-3">{money(row.paidMinor)}</td><td className="border border-forest/15 p-3">{row.missingCommission ? "Pending" : money(row.commissionMinor)}</td><td className="border border-forest/15 p-3">{row.missingCommission ? `${row.missingCommission} to review` : "Complete"}</td></tr>)}</tbody><tfoot><tr className="bg-forest/5 font-bold"><td colSpan={2} className="border border-forest/15 p-3">Period total</td>{[report.totals.orders,report.totals.cups,money(report.totals.paidMinor),report.totals.missingCommission?"Pending":money(report.totals.commissionMinor),report.totals.missingCommission?`${report.totals.missingCommission} to review`:"Complete"].map((value,i)=><td key={i} className="border border-forest/15 p-3">{value}</td>)}</tr></tfoot></table></div>
    {!report.details.length ? <p className="mt-4 text-sm">No paid partner orders in this period.</p> : null}
  </main>;
}
