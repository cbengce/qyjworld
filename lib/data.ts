import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { daysRemaining } from "@/lib/membership";

export type AdminRole = "super_admin" | "manager" | "staff";

type StaffRoleAssignment = {
  status?: string | null;
  deleted_at?: string | null;
  roles?: {
    role_code?: string | null;
    status?: string | null;
    deleted_at?: string | null;
  } | null;
};

type StaffAuthorizationRecord = {
  id: string;
  status?: string | null;
  deleted_at?: string | null;
  staff_role_assignments?: StaffRoleAssignment[] | null;
};

const ADMIN_ROLE_CODES: AdminRole[] = ["super_admin", "manager", "staff"];

export async function getAdminAuthorizationForUser(userId: string) {
  const supabase = createServiceClient();
  const { data: staff, error } = await supabase
    .from("staff_users")
    .select("id, status, deleted_at, staff_role_assignments(status, deleted_at, roles(role_code, status, deleted_at))")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !staff) return null;

  const staffRecord = staff as StaffAuthorizationRecord;
  const assignment = staffRecord.staff_role_assignments?.find((item) => {
    const roleCode = item.roles?.role_code;
    return (
      item.status === "active" &&
      !item.deleted_at &&
      item.roles?.status === "active" &&
      !item.roles?.deleted_at &&
      ADMIN_ROLE_CODES.includes(roleCode as AdminRole)
    );
  });

  const role = assignment?.roles?.role_code as AdminRole | undefined;
  if (!role) return null;

  return {
    staff: { id: staffRecord.id },
    role
  };
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

export async function getMemberDashboard(userId: string) {
  const supabase = createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*, customer_profiles(*), referral_codes(*), points_accounts(*)")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!customer) {
    return {
      customer: null,
      profile: null,
      referralCode: null,
      pointsAccount: null,
      membership: null,
      transactions: [],
      activity: [],
      pointsBalance: 0,
      daysRemaining: 0
    };
  }

  const customerId = customer?.id;
  const pointsAccount = customer?.points_accounts?.[0];

  const { data: membership } = await supabase
    .from("customer_memberships")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: transactions }, { data: activity }] = await Promise.all([
    supabase
      .from("points_transactions")
      .select("*")
      .eq("points_account_id", pointsAccount?.id)
      .order("created_at", { ascending: false })
      .limit(10),
    membership?.id
      ? supabase
          .from("membership_events")
          .select("*")
          .eq("customer_membership_id", membership.id)
          .order("created_at", { ascending: false })
          .limit(10)
      : supabase.from("membership_events").select("*").limit(0)
  ]);

  const pointsBalance =
    transactions?.[0]?.balance_after ??
    0;

  return {
    customer,
    profile: Array.isArray(customer?.customer_profiles) ? customer?.customer_profiles[0] : customer?.customer_profiles,
    referralCode: Array.isArray(customer?.referral_codes) ? customer?.referral_codes[0] : customer?.referral_codes,
    pointsAccount,
    membership,
    transactions: transactions ?? [],
    activity: activity ?? [],
    pointsBalance,
    daysRemaining: daysRemaining(membership?.expires_at)
  };
}

export async function requireAdmin(locale: string) {
  const user = await requireUser(locale);
  const authorization = await getAdminAuthorizationForUser(user.id);

  if (!authorization) redirect(`/${locale}/member`);
  return { user, ...authorization };
}
