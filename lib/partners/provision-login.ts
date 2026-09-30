import type { SupabaseClient } from "@supabase/supabase-js";

// Called only after the server action has checked settings.manage permission.
export async function provisionPartnerLogin(service: SupabaseClient, partnerId: string, email: string, password: string) {
  const { data: partner, error: partnerError } = await service.from("partners")
    .select("id,status,archived_at").eq("id", partnerId).single();
  if (partnerError || !partner || partner.status !== "active" || partner.archived_at) {
    throw new Error("Login accounts can only be created for an active partner.");
  }
  const created = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { partner_password_change_required: true }
  });
  if (created.error || !created.data.user) {
    throw new Error("Unable to create this account. The email may already have an account; existing accounts and passwords are never overwritten.");
  }
  const userId = created.data.user.id;
  const { error: mappingError } = await service.from("partner_users").insert({
    partner_id: partnerId, auth_user_id: userId, status: "active"
  });
  if (mappingError) {
    const cleanup = await service.auth.admin.deleteUser(userId);
    throw new Error(cleanup.error
      ? "Account access could not be linked. An administrator must remove the unused Auth account before retrying."
      : "Account access could not be linked. No login account was retained; please try again.");
  }
  return userId;
}
