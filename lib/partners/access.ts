import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActivePartnerForUser(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("partner_users")
    .select("partner_id,partners(partner_name,partner_code,status,archived_at)")
    .eq("auth_user_id", userId).eq("status", "active").limit(2);
  if (error || data?.length !== 1) return null;
  const partner = data[0].partners as unknown as {
    partner_name: string; partner_code: string; status: string; archived_at: string | null;
  } | null;
  if (!partner || partner.status !== "active" || partner.archived_at) return null;
  return { partnerId: data[0].partner_id as string, partner };
}
