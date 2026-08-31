import { addPartnerLoginMapping, archivePartner, deactivatePartnerLoginMapping, restorePartner, savePartner, updatePartnerCommercialRates, updatePartnerDetails } from "./actions";
import { PartnerCommercialRateFields } from "@/components/admin/partner-commercial-rate-fields";
import type { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { getPartnerReferralUrl } from "@/lib/partners/referral-url";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams: {
    notice?: string;
    error?: string;
    edit?: string;
    customerDiscountRate?: string;
    partnerRewardRate?: string;
  };
}) {
  await requireAdmin(params.locale);
  const service = createServiceClient();
  const { data: partners } = await service
    .from("partners")
    .select("*,partner_users(id,auth_user_id,status),partner_referral_sessions(count),pos_transactions(id,payment_status,gross_amount),partner_commission_ledger(reward_amount)")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper px-5 py-12 text-forest md:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Admin / Revenue</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">Corporate Partners</h1>

        {searchParams.notice ? (
          <p className="mt-6 border border-forest/20 bg-white p-4 font-semibold" role="status">{searchParams.notice}</p>
        ) : null}
        {searchParams.error ? (
          <p className="mt-6 border border-red-700/30 bg-white p-4 font-semibold text-red-800" role="alert">{searchParams.error}</p>
        ) : null}

        <form action={savePartner} className="mt-10 grid gap-4 border border-forest/10 bg-white p-6 md:grid-cols-2">
          <input name="locale" type="hidden" value={params.locale} />
          <label>Partner code<input className="mt-2 w-full border p-3" name="partnerCode" required /></label>
          <label>Partner name<input className="mt-2 w-full border p-3" name="partnerName" required /></label>
          <label>Partner type<input className="mt-2 w-full border p-3" defaultValue="corporate" name="partnerType" required /></label>
          <label>Status<select className="mt-2 w-full border p-3" name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <PartnerCommercialRateFields customerBenefit="0" inputClassName="mt-2 w-full border p-3" partnerCommission="0" />
          <label>Contact name<input className="mt-2 w-full border p-3" name="contactName" /></label>
          <label>Contact email<input className="mt-2 w-full border p-3" name="contactEmail" type="email" /></label>
          <label>Partner auth user UUID (optional)<input className="mt-2 w-full border p-3" name="authUserId" /></label>
          <label>Notes<textarea className="mt-2 w-full border p-3" name="notes" /></label>
          <button className="min-h-12 bg-forest px-6 font-bold text-white md:col-span-2" type="submit">Create Partner</button>
        </form>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[1250px] bg-white text-left">
            <thead><tr><th className="p-4">Partner</th><th>Code</th><th>Status</th><th>Customer Benefit</th><th>Partner Commission</th><th>QR landing URL</th><th>Scans</th><th>Paid sales</th><th>Commission</th><th>Manage</th></tr></thead>
            <tbody>{(partners ?? []).map((partner) => {
              const transactions = (partner.pos_transactions ?? []) as Array<{ payment_status: string; gross_amount: number }>;
              const ledger = (partner.partner_commission_ledger ?? []) as Array<{ reward_amount: number }>;
              const customerBenefit = Number(partner.customer_discount_rate) * 100;
              const partnerCommission = Number(partner.partner_reward_rate) * 100;
              const archived = Boolean(partner.archived_at);
              return (
                <tr className="border-t" key={partner.id}>
                  <td className="p-4 font-bold">{partner.partner_name}</td>
                  <td>{partner.partner_code}</td>
                  <td>{archived ? "Archived" : partner.status}</td>
                  <td>{customerBenefit.toFixed(2)}%</td>
                  <td>{partnerCommission.toFixed(2)}%</td>
                  <td className="max-w-xs break-all">{getPartnerReferralUrl(partner.partner_code)}</td>
                  <td>{partner.partner_referral_sessions?.[0]?.count ?? 0}</td>
                  <td>{transactions.filter((transaction) => transaction.payment_status === "paid").length}</td>
                  <td>S${ledger.reduce((sum, row) => sum + Number(row.reward_amount), 0).toFixed(2)}</td>
                  <td>
                    <details open={searchParams.edit === partner.id}>
                      <summary className="cursor-pointer font-bold">Edit / Manage</summary>
                      <form action={updatePartnerDetails} className="mt-4 grid w-72 gap-2 border-t border-forest/10 pt-4">
                        <input name="locale" type="hidden" value={params.locale} />
                        <input name="id" type="hidden" value={partner.id} />
                        <label>Partner Code<input className="mt-1 w-full border bg-paper p-2" readOnly value={partner.partner_code} /></label>
                        <p className="text-xs text-forest/60">Partner Code is permanent because historical attribution records retain it.</p>
                        <label>Partner Name<input className="mt-1 w-full border p-2" defaultValue={partner.partner_name} name="partnerName" required /></label>
                        <label>Partner Type<input className="mt-1 w-full border p-2" defaultValue={partner.partner_type} name="partnerType" required /></label>
                        {archived ? <><input name="status" type="hidden" value="inactive" /><p>Status: <strong>Archived</strong></p></> : <label>Status<select className="mt-1 w-full border p-2" defaultValue={partner.status} name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
                        <label>Contact Name<input className="mt-1 w-full border p-2" defaultValue={partner.contact_name ?? ""} name="contactName" /></label>
                        <label>Contact Email<input className="mt-1 w-full border p-2" defaultValue={partner.contact_email ?? ""} name="contactEmail" type="email" /></label>
                        <label>Notes<textarea className="mt-1 w-full border p-2" defaultValue={partner.notes ?? ""} name="notes" /></label>
                        <button className="bg-forest p-2 text-white" type="submit">Save Partner Details</button>
                      </form>
                      <form action={updatePartnerCommercialRates} className="mt-4 grid w-72 gap-2 border-t border-forest/10 pt-4">
                        <input name="locale" type="hidden" value={params.locale} />
                        <input name="id" type="hidden" value={partner.id} />
                        <p className="font-bold">{partner.partner_name}</p>
                        <p className="text-sm text-forest/70">Partner Code: {partner.partner_code}</p>
                        {searchParams.error && searchParams.edit === partner.id ? (
                          <p className="border border-red-700/30 p-3 text-sm font-semibold text-red-800" role="alert">{searchParams.error}</p>
                        ) : null}
                        <PartnerCommercialRateFields
                          customerBenefit={searchParams.edit === partner.id ? searchParams.customerDiscountRate ?? customerBenefit.toFixed(2) : customerBenefit.toFixed(2)}
                          inputClassName="mt-1 w-full border p-2"
                          partnerCommission={searchParams.edit === partner.id ? searchParams.partnerRewardRate ?? partnerCommission.toFixed(2) : partnerCommission.toFixed(2)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button className="bg-forest p-2 text-white" type="submit">Save</button>
                          <a className="border border-forest/20 p-2 text-center" href={`/${params.locale}/admin/partners`}>Cancel</a>
                        </div>
                      </form>
                      <div className="mt-4 w-72 border-t border-forest/10 pt-4">
                        <p className="font-bold">Partner Login Users</p>
                        <div className="mt-2 grid gap-2">{(partner.partner_users ?? []).map((mapping: { id: string; auth_user_id: string; status: string }) => <div className="border p-2 text-xs" key={mapping.id}><p className="break-all">{mapping.auth_user_id}</p><p className="mt-1 capitalize text-forest/60">{mapping.status}</p>{mapping.status === "active" ? <form action={deactivatePartnerLoginMapping} className="mt-2"><input name="locale" type="hidden" value={params.locale} /><input name="partnerId" type="hidden" value={partner.id} /><input name="mappingId" type="hidden" value={mapping.id} /><button className="border border-forest/20 px-2 py-1" type="submit">Remove Access</button></form> : null}</div>)}</div>
                        <form action={addPartnerLoginMapping} className="mt-3 grid gap-2">
                          <input name="locale" type="hidden" value={params.locale} />
                          <input name="partnerId" type="hidden" value={partner.id} />
                          <label>Supabase Auth user UUID<input className="mt-1 w-full border p-2" name="authUserId" required /></label>
                          <button className="bg-forest p-2 text-white" type="submit">Add Login User</button>
                        </form>
                      </div>
                      <div className="mt-4 w-72 border-t border-forest/10 pt-4">
                        {archived ? <form action={restorePartner} className="grid gap-2"><input name="locale" type="hidden" value={params.locale} /><input name="partnerId" type="hidden" value={partner.id} /><p className="text-sm">Restoring keeps this partner inactive. It will not restore operational access automatically.</p><button className="border border-forest/30 p-2 font-bold" type="submit">Restore as Inactive</button></form> : <form action={archivePartner} className="grid gap-2"><input name="locale" type="hidden" value={params.locale} /><input name="partnerId" type="hidden" value={partner.id} /><label className="flex items-start gap-2 text-sm"><input className="mt-1" name="confirmArchive" required type="checkbox" value="yes" />I confirm this partner will become inactive and unable to generate new referrals.</label><button className="border border-red-700/40 p-2 font-bold text-red-800" type="submit">Archive Partner</button></form>}
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
