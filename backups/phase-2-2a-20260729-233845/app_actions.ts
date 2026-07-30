"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { BRAND } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bootstrapSuperAdminSchema, loginSchema, pointsAdjustmentSchema, registerSchema } from "@/lib/validation";

type ActionState = {
  ok: boolean;
  message: string;
};

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Admin authentication required.");

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, staff_role_assignments(roles(role_code))")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!staff) throw new Error("Admin permission required.");
  return user;
}

export async function registerMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
    password: formData.get("password"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    referralCode: formData.get("referralCode") || undefined,
    termsConsent: formData.get("termsConsent") === "on",
    privacyConsent: formData.get("privacyConsent") === "on",
    marketingConsent: formData.get("marketingConsent") === "on"
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const rate = checkRateLimit(`register:${parsed.data.email}`);
  if (!rate.ok) return { ok: false, message: "Too many attempts. Please try again later." };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
        mobile: parsed.data.mobile
      }
    });

    if (error || !data.user) {
      return { ok: false, message: error?.message ?? "Unable to create account." };
    }

    const { error: profileError } = await supabase.rpc("register_member_profile", {
      new_auth_user_id: data.user.id,
      brand_code_value: "QYJ",
      full_name_value: parsed.data.fullName,
      mobile_value: parsed.data.mobile,
      email_value: parsed.data.email,
      date_of_birth_value: parsed.data.dateOfBirth || null,
      referral_code_value: parsed.data.referralCode || null,
      terms_version_value: "membership-terms-v1",
      privacy_version_value: "privacy-policy-v1",
      marketing_consent_value: parsed.data.marketingConsent,
      source_value: "web_registration"
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return { ok: false, message: profileError.message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach Supabase.";
    return { ok: false, message: `Unable to complete registration: ${message}` };
  }

  return {
    ok: true,
    message: `Account created. Your ${BRAND.membershipDays}-day membership is pending admin activation.`
  };
}

export async function loginMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) return { ok: false, message: "Enter a valid email and password." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };

  redirect("/en/member");
}

export async function logoutMember() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/en/login");
}

export async function bootstrapSuperAdmin(_: ActionState, formData: FormData): Promise<ActionState> {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!configuredSiteUrl.startsWith("http://localhost")) {
    return { ok: false, message: "Super Admin bootstrap is available only for local development." };
  }

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!email) return { ok: false, message: "ADMIN_BOOTSTRAP_EMAIL is missing." };

  const parsed = bootstrapSuperAdminSchema.safeParse({
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid password." };
  }

  try {
    const supabase = createServiceClient();
    let authUserId: string | undefined;

    const created = await supabase.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        role: "super_admin",
        bootstrap: true
      }
    });

    if (created.data.user) {
      authUserId = created.data.user.id;
    } else if (created.error?.message.toLowerCase().includes("already")) {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) return { ok: false, message: listError.message };
      authUserId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
      if (authUserId) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: {
            role: "super_admin",
            bootstrap: true
          }
        });
        if (updateError) return { ok: false, message: updateError.message };
      }
    } else if (created.error) {
      return { ok: false, message: created.error.message };
    }

    if (!authUserId) return { ok: false, message: "Unable to resolve bootstrap Auth user." };

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("legal_name", BRAND.company)
      .eq("status", "active")
      .single();
    if (companyError || !company) return { ok: false, message: companyError?.message ?? "Active company not found." };

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("role_code", "super_admin")
      .eq("status", "active")
      .single();
    if (roleError || !role) return { ok: false, message: roleError?.message ?? "Super Admin role not found." };

    const { data: staff, error: staffError } = await supabase
      .from("staff_users")
      .upsert(
        {
          auth_user_id: authUserId,
          staff_no: "QYJSA001",
          full_name: "Qing Yun Jian Super Admin",
          email_raw: email,
          created_by: authUserId,
          updated_by: authUserId
        },
        { onConflict: "auth_user_id" }
      )
      .select("id")
      .single();
    if (staffError || !staff) return { ok: false, message: staffError?.message ?? "Unable to create staff user." };

    const { data: existingAssignment, error: existingError } = await supabase
      .from("staff_role_assignments")
      .select("id")
      .eq("staff_user_id", staff.id)
      .eq("role_id", role.id)
      .eq("scope_type", "company")
      .eq("company_id", company.id)
      .is("brand_id", null)
      .is("store_id", null)
      .eq("status", "active")
      .maybeSingle();
    if (existingError) return { ok: false, message: existingError.message };

    if (!existingAssignment) {
      const { error: assignmentError } = await supabase.from("staff_role_assignments").insert({
        staff_user_id: staff.id,
        role_id: role.id,
        scope_type: "company",
        company_id: company.id,
        created_by: authUserId,
        updated_by: authUserId
      });
      if (assignmentError) return { ok: false, message: assignmentError.message };
    }

    return { ok: true, message: `Super Admin ready for ${email}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bootstrap Super Admin.";
    return { ok: false, message };
  }
}

export async function activateMembership(formData: FormData) {
  await assertAdmin();
  const customerId = String(formData.get("customerId"));
  const brandId = String(formData.get("brandId"));
  const supabase = createClient();
  await supabase.rpc("activate_membership", {
    target_customer_id: customerId,
    target_brand_id: brandId,
    idempotency_key_value: randomUUID(),
    reference_no_value: String(formData.get("referenceNo") || "")
  });
  revalidatePath("/en/admin");
}

export async function submitPointsAdjustment(_: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const parsed = pointsAdjustmentSchema.safeParse({
    pointsAccountId: formData.get("pointsAccountId"),
    transactionType: formData.get("transactionType"),
    points: formData.get("points"),
    description: formData.get("description"),
    referenceNumber: formData.get("referenceNumber") || undefined
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("record_points_transaction", {
    target_points_account_id: parsed.data.pointsAccountId,
    transaction_type_value: parsed.data.transactionType,
    points_delta_value: parsed.data.points,
    description_value: parsed.data.description,
    reference_no_value: parsed.data.referenceNumber ?? null,
    idempotency_key_value: randomUUID()
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/en/admin");
  return { ok: true, message: "Points transaction recorded." };
}
