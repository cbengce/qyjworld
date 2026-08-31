"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { BRAND } from "@/lib/constants";
import { getAdminAuthorizationForUser } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapSuperAdminSchema,
  clearLeaderboardSchema,
  deleteLeaderboardEntrySchema,
  deletePromotionSchema,
  leaderboardEntrySchema,
  leaderboardMoveSchema,
  leaderboardPublicationSchema,
  loginSchema,
  passwordRecoverySchema,
  passwordResetSchema,
  pointsAdjustmentSchema,
  promotionSchema,
  promotionStatusSchema,
  registerSchema
} from "@/lib/validation";

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

  const authorization = await getAdminAuthorizationForUser(user.id);
  if (!authorization) throw new Error("Admin permission required.");
  return user;
}

function getSafeLoginDestination({
  locale,
  returnTo,
  isAdmin
}: {
  locale: string;
  returnTo?: FormDataEntryValue | null;
  isAdmin: boolean;
}) {
  const defaultDestination = isAdmin ? `/${locale}/admin/promotions` : `/${locale}/member`;
  if (typeof returnTo !== "string" || !returnTo) return defaultDestination;
  if (!returnTo.startsWith(`/${locale}/`) || returnTo.startsWith("//") || returnTo.includes("://")) return defaultDestination;
  if (returnTo.startsWith(`/${locale}/admin`) && !isAdmin) return defaultDestination;
  return returnTo;
}

function redirectWithAdminNotice(locale: string, path: string, key: "notice" | "error", message: string): never {
  redirect(`/${locale}${path}?${key}=${encodeURIComponent(message)}`);
}

function campaignStoragePathFromPublicUrl(url?: string | null) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/campaigns/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

async function removeCampaignImage(supabase: ReturnType<typeof createServiceClient>, url?: string | null) {
  const path = campaignStoragePathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from("campaigns").remove([path]);
}

async function removeUnusedCampaignImages(
  supabase: ReturnType<typeof createServiceClient>,
  previousUrls: Array<string | null>,
  nextUrls: Array<string | null>
) {
  const nextUrlSet = new Set(nextUrls.filter(Boolean));
  const staleUrls = [...new Set(previousUrls.filter((url): url is string => Boolean(url) && !nextUrlSet.has(url)))];
  await Promise.all(staleUrls.map((url) => removeCampaignImage(supabase, url)));
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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };

  const locale = String(formData.get("locale") || "en");
  const authorization = data.user ? await getAdminAuthorizationForUser(data.user.id) : null;
  const destination = getSafeLoginDestination({
    locale,
    returnTo: formData.get("returnTo"),
    isAdmin: Boolean(authorization)
  });

  redirect(destination);
}

export async function logoutMember() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/en/login");
}

export async function logoutPartner() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/en/partner/login");
}

export async function requestPartnerPasswordRecovery(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordRecoverySchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale")
  });
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };

  const rate = checkRateLimit(`partner-password-recovery:${parsed.data.email.toLowerCase()}`);
  if (!rate.ok) return { ok: false, message: "Too many attempts. Please try again later." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return { ok: false, message: "Password recovery is not configured for this environment." };

  try {
    const redirectTo = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(`/${parsed.data.locale}/partner/reset-password`)}`;
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  } catch {
    // Do not reveal whether an account exists for the submitted email.
  }

  return { ok: true, message: "If this email is linked to an account, a password recovery email has been sent." };
}

export async function resetPartnerPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordResetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    locale: formData.get("locale")
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid password." };

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "This recovery link is invalid or has expired. Request a new recovery email." };

  const { count, error: mappingError } = await supabase
    .from("partner_users")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (mappingError || count !== 1) return { ok: false, message: "This account is not linked to one active corporate partner." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  redirect(`/${parsed.data.locale}/partner/dashboard`);
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

export async function savePromotion(formData: FormData) {
  await assertAdmin();
  const parsed = promotionSchema.safeParse({
    id: formData.get("id") || undefined,
    locale: formData.get("locale") || "en",
    slug: formData.get("slug"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    imageDisplayMode: formData.get("imageDisplayMode") || "auto",
    ctaLabel: formData.get("ctaLabel") || undefined,
    ctaUrl: formData.get("ctaUrl") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
    showOnHomepage: formData.get("showOnHomepage") === "on",
    showAscendCommunityCta: formData.get("showAscendCommunityCta") === "on",
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirectWithAdminNotice("en", "/admin/promotions", "error", parsed.error.issues[0]?.message ?? "Invalid promotion.");
  }

  const values = parsed.data;
  const supabase = createServiceClient();
  let previousCoverImageUrl: string | null = null;
  let previousImageUrl: string | null = null;

  if (values.id) {
    const { data: existingPromotion, error: existingError } = await supabase
      .from("promotions")
      .select("cover_image_url, image_url")
      .eq("id", values.id)
      .maybeSingle();
    if (existingError) redirectWithAdminNotice(values.locale, "/admin/promotions", "error", existingError.message);
    previousCoverImageUrl = existingPromotion?.cover_image_url ?? null;
    previousImageUrl = existingPromotion?.image_url ?? null;
  }

  const payload = {
    slug: values.slug,
    title: values.title,
    subtitle: values.subtitle,
    description: values.description,
    cover_image_url: values.coverImageUrl,
    image_url: values.imageUrl,
    image_display_mode: values.imageDisplayMode,
    cta_label: values.ctaLabel,
    cta_url: values.ctaUrl,
    start_date: values.startDate,
    end_date: values.endDate,
    display_order: values.displayOrder,
    show_on_homepage: values.showOnHomepage,
    show_ascend_community_cta: values.showAscendCommunityCta,
    status: values.status
  };

  const result = values.id
    ? await supabase.from("promotions").update(payload).eq("id", values.id)
    : await supabase.from("promotions").insert(payload);

  if (result.error) {
    redirectWithAdminNotice(values.locale, "/admin/promotions", "error", result.error.message);
  }

  await removeUnusedCampaignImages(supabase, [previousCoverImageUrl, previousImageUrl], [values.coverImageUrl, values.imageUrl]);

  revalidatePath(`/${values.locale}`);
  revalidatePath(`/${values.locale}/promotions`);
  redirectWithAdminNotice(values.locale, "/admin/promotions", "notice", values.id ? "Promotion updated." : "Promotion created.");
}

export async function updatePromotionStatus(formData: FormData) {
  await assertAdmin();
  const parsed = promotionStatusSchema.safeParse({
    locale: formData.get("locale") || "en",
    id: formData.get("id"),
    status: formData.get("status")
  });

  if (!parsed.success) redirectWithAdminNotice("en", "/admin/promotions", "error", "Invalid promotion status.");

  const supabase = createServiceClient();
  const { error } = await supabase.from("promotions").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) redirectWithAdminNotice(parsed.data.locale, "/admin/promotions", "error", error.message);

  revalidatePath(`/${parsed.data.locale}`);
  revalidatePath(`/${parsed.data.locale}/promotions`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/promotions", "notice", "Promotion status updated.");
}

export async function deletePromotion(formData: FormData) {
  await assertAdmin();
  const parsed = deletePromotionSchema.safeParse({
    locale: formData.get("locale") || "en",
    id: formData.get("id"),
    confirmDelete: formData.get("confirmDelete") === "on"
  });

  if (!parsed.success) redirectWithAdminNotice("en", "/admin/promotions", "error", "Confirm deletion before deleting.");

  const supabase = createServiceClient();
  const { data: existingPromotion, error: existingError } = await supabase
    .from("promotions")
    .select("cover_image_url, image_url")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (existingError) redirectWithAdminNotice(parsed.data.locale, "/admin/promotions", "error", existingError.message);

  const { error } = await supabase.from("promotions").delete().eq("id", parsed.data.id);
  if (error) redirectWithAdminNotice(parsed.data.locale, "/admin/promotions", "error", error.message);

  await removeUnusedCampaignImages(supabase, [existingPromotion?.cover_image_url ?? null, existingPromotion?.image_url ?? null], []);

  revalidatePath(`/${parsed.data.locale}`);
  revalidatePath(`/${parsed.data.locale}/promotions`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/promotions", "notice", "Promotion deleted.");
}

export async function saveLeaderboardEntry(formData: FormData) {
  await assertAdmin();
  const parsed = leaderboardEntrySchema.safeParse({
    id: formData.get("id") || undefined,
    locale: formData.get("locale") || "en",
    campaignSlug: formData.get("campaignSlug"),
    schoolName: formData.get("schoolName"),
    internalParticipantCount: formData.get("internalParticipantCount") || 0,
    shortNote: formData.get("shortNote") || undefined,
    status: formData.get("status") || "draft"
  });

  if (!parsed.success) {
    redirectWithAdminNotice("en", "/admin/leaderboard", "error", parsed.error.issues[0]?.message ?? "Invalid leaderboard entry.");
  }

  const values = parsed.data;
  const qualified = values.internalParticipantCount >= 10;
  const isPublishing = values.status === "published";

  if (isPublishing && !qualified) {
    redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", "Cannot publish until the internal participant count reaches 10.");
  }

  const supabase = createServiceClient();
  const { data: existingEntry, error: existingEntryError } = values.id
    ? await supabase
        .from("community_leaderboard_entries")
        .select("id, campaign_slug, display_order, is_published, status")
        .eq("id", values.id)
        .maybeSingle()
    : { data: null, error: null };
  if (existingEntryError) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", existingEntryError.message);

  const duplicateName = await supabase
    .from("community_leaderboard_entries")
    .select("id")
    .eq("campaign_slug", values.campaignSlug)
    .ilike("school_name", values.schoolName)
    .neq("id", values.id ?? "00000000-0000-0000-0000-000000000000")
    .neq("status", "archived")
    .limit(1);
  if (duplicateName.error) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", duplicateName.error.message);
  if ((duplicateName.data ?? []).length > 0) {
    redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", "This school or community already has an entry for this campaign.");
  }

  let nextDisplayOrder = existingEntry?.display_order ?? 0;
  if (isPublishing && !existingEntry?.is_published) {
    const [{ data: lastEntry, error: lastError }, { count, error: countError }] = await Promise.all([
      supabase
        .from("community_leaderboard_entries")
        .select("display_order")
        .eq("campaign_slug", values.campaignSlug)
        .eq("is_published", true)
        .eq("status", "published")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("community_leaderboard_entries")
        .select("id", { count: "exact", head: true })
        .eq("campaign_slug", values.campaignSlug)
        .eq("is_published", true)
        .eq("status", "published")
        .neq("id", values.id ?? "00000000-0000-0000-0000-000000000000")
    ]);
    if (lastError) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", lastError.message);
    if (countError) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", countError.message);
    if ((count ?? 0) >= 10) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", "Only 10 entries can be published for a campaign.");
    nextDisplayOrder = ((lastEntry?.display_order as number | undefined) ?? 0) + 100;
  }

  const payload = {
    campaign_slug: values.campaignSlug,
    school_name: values.schoolName,
    internal_participant_count: values.internalParticipantCount,
    rank: null,
    display_order: nextDisplayOrder,
    short_note: values.shortNote,
    status: values.status,
    is_qualified: qualified,
    is_published: values.status === "published",
    published_at: values.status === "published" ? new Date().toISOString() : null,
    archived_at: values.status === "archived" ? new Date().toISOString() : null
  };

  const result = values.id
    ? await supabase.from("community_leaderboard_entries").update(payload).eq("id", parsed.data.id)
    : await supabase.from("community_leaderboard_entries").insert(payload);

  if (result.error) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", result.error.message);
  if (isPublishing) {
    const { error: normalizeError } = await supabase.rpc("normalize_community_leaderboard_order", { target_campaign_slug: values.campaignSlug });
    if (normalizeError) redirectWithAdminNotice(values.locale, "/admin/leaderboard", "error", normalizeError.message);
  }

  revalidatePath(`/${values.locale}/leaderboard`);
  redirectWithAdminNotice(values.locale, "/admin/leaderboard", "notice", values.id ? "Leaderboard entry updated." : "Leaderboard entry created.");
}

export async function deleteLeaderboardEntry(formData: FormData) {
  await assertAdmin();
  const parsed = deleteLeaderboardEntrySchema.safeParse({
    locale: formData.get("locale") || "en",
    id: formData.get("id"),
    confirmDelete: formData.get("confirmDelete") === "on"
  });

  if (!parsed.success) redirectWithAdminNotice("en", "/admin/leaderboard", "error", "Confirm deletion before deleting.");

  const supabase = createServiceClient();
  const { error } = await supabase.from("community_leaderboard_entries").delete().eq("id", parsed.data.id);
  if (error) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", error.message);

  revalidatePath(`/${parsed.data.locale}/leaderboard`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "notice", "Leaderboard entry deleted.");
}

export async function clearPublishedLeaderboard(formData: FormData) {
  await assertAdmin();
  const parsed = clearLeaderboardSchema.safeParse({
    locale: formData.get("locale") || "en",
    campaignSlug: formData.get("campaignSlug"),
    confirmClear: formData.get("confirmClear") === "on"
  });

  if (!parsed.success) redirectWithAdminNotice("en", "/admin/leaderboard", "error", "Confirm the campaign before clearing published rankings.");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("community_leaderboard_entries")
    .update({ is_published: false, status: "ready" })
    .eq("campaign_slug", parsed.data.campaignSlug);
  if (error) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", error.message);

  revalidatePath(`/${parsed.data.locale}/leaderboard`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "notice", "Published rankings cleared.");
}

export async function updateLeaderboardPublication(formData: FormData) {
  await assertAdmin();
  const parsed = leaderboardPublicationSchema.safeParse({
    locale: formData.get("locale") || "en",
    id: formData.get("id"),
    status: formData.get("status")
  });

  if (!parsed.success) redirectWithAdminNotice("en", "/admin/leaderboard", "error", "Invalid leaderboard publication request.");

  const supabase = createServiceClient();
  const { data: entry, error: fetchError } = await supabase
    .from("community_leaderboard_entries")
      .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (fetchError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", fetchError.message);
  if (!entry) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", "Leaderboard entry not found.");

  const nextStatus = parsed.data.status;
  if (nextStatus === "published") {
    if ((entry.internal_participant_count ?? 0) < 10) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", "Cannot publish until the internal participant count reaches 10.");
    const { count, error: countError } = await supabase
      .from("community_leaderboard_entries")
      .select("id", { count: "exact", head: true })
      .eq("campaign_slug", entry.campaign_slug)
      .eq("is_published", true)
      .eq("status", "published")
      .neq("id", parsed.data.id);
    if (countError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", countError.message);
    if ((count ?? 0) >= 10 && !entry.is_published) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", "Only 10 entries can be published for a campaign.");
  }
  let nextDisplayOrder = entry.display_order;
  if (nextStatus === "published" && !entry.is_published) {
    const { data: lastEntry, error: lastError } = await supabase
      .from("community_leaderboard_entries")
      .select("display_order")
      .eq("campaign_slug", entry.campaign_slug)
      .eq("is_published", true)
      .eq("status", "published")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", lastError.message);
    nextDisplayOrder = ((lastEntry?.display_order as number | undefined) ?? 0) + 100;
  }

  const { error } = await supabase
    .from("community_leaderboard_entries")
    .update({
      status: nextStatus,
      rank: null,
      display_order: nextDisplayOrder,
      is_qualified: (entry.internal_participant_count ?? 0) >= 10,
      is_published: nextStatus === "published",
      published_at: nextStatus === "published" ? new Date().toISOString() : entry.published_at,
      archived_at: nextStatus === "archived" ? new Date().toISOString() : entry.archived_at
    })
    .eq("id", parsed.data.id);
  if (error) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", error.message);
  const { error: normalizeError } = await supabase.rpc("normalize_community_leaderboard_order", { target_campaign_slug: entry.campaign_slug });
  if (normalizeError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", normalizeError.message);

  revalidatePath(`/${parsed.data.locale}/leaderboard`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "notice", `Leaderboard entry marked ${nextStatus}.`);
}

export async function moveLeaderboardEntry(formData: FormData) {
  await assertAdmin();
  const parsed = leaderboardMoveSchema.safeParse({
    locale: formData.get("locale") || "en",
    id: formData.get("id"),
    direction: formData.get("direction")
  });
  if (!parsed.success) redirectWithAdminNotice("en", "/admin/leaderboard", "error", "Invalid move request.");

  const supabase = createServiceClient();
  const { data: entry, error: fetchError } = await supabase
    .from("community_leaderboard_entries")
    .select("id, campaign_slug, display_order, is_published, is_qualified, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (fetchError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", fetchError.message);
  if (!entry || !entry.is_published || !entry.is_qualified || entry.status !== "published") redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", "Only published qualified entries can be reordered.");

  const { error: moveError } = await supabase.rpc("reorder_community_leaderboard_entry", {
    move_direction: parsed.data.direction,
    target_entry_id: parsed.data.id
  });
  if (moveError) redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "error", moveError.message);

  revalidatePath(`/${parsed.data.locale}/leaderboard`);
  redirectWithAdminNotice(parsed.data.locale, "/admin/leaderboard", "notice", "Leaderboard position updated.");
}
