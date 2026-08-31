"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { COMBINED_PARTNER_RATE_ERROR, validatePartnerCommercialRates } from "@/lib/partners/commercial-rates";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const percentageSchema = (label: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return Number(value);
    },
    z
      .number({
        required_error: `${label} is required.`,
        invalid_type_error: `${label} must be a valid number.`
      })
      .finite(`${label} must be a valid number.`)
      .min(0, `${label} cannot be negative.`)
      .max(30, `${label} cannot exceed 30%.`)
  );

function validateCombinedRate(
  values: { customerDiscountRate: number; partnerRewardRate: number },
  context: z.RefinementCtx
) {
  if (validatePartnerCommercialRates(values.customerDiscountRate, values.partnerRewardRate) === "combined") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: COMBINED_PARTNER_RATE_ERROR,
      path: ["partnerRewardRate"]
    });
  }
}

const partnerSchema = z.object({
  locale: z.string().default("en"),
  partnerCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/),
  partnerName: z.string().trim().min(2).max(160),
  partnerType: z.string().trim().min(2).max(80),
  customerDiscountRate: percentageSchema("Customer Benefit"),
  partnerRewardRate: percentageSchema("Partner Commission"),
  status: z.enum(["active", "inactive"]),
  contactName: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  authUserId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional()
}).superRefine(validateCombinedRate);

export async function savePartner(formData: FormData) {
  const parsed = partnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid partner details.");
  const values = parsed.data;
  const authorization = await requireAdminPermission(values.locale, "settings.manage");
  const service = createServiceClient();
  const record = {
    partner_code: values.partnerCode,
    partner_name: values.partnerName,
    partner_type: values.partnerType,
    status: values.status,
    contact_name: values.contactName || null,
    contact_email: values.contactEmail || null,
    notes: values.notes || null,
    updated_at: new Date().toISOString()
  };
  const result = await service.from("partners").insert({
    ...record,
    customer_discount_rate: values.customerDiscountRate / 100,
    partner_reward_rate: values.partnerRewardRate / 100
  }).select("id").single();
  if (result.error) throw new Error(result.error.message);
  if (values.authUserId) {
    const { data: existingMappings, error: existingMappingError } = await service
      .from("partner_users")
      .select("partner_id")
      .eq("auth_user_id", values.authUserId)
      .eq("status", "active")
      .neq("partner_id", result.data.id);
    if (existingMappingError) throw new Error(existingMappingError.message);
    if (existingMappings?.length) throw new Error("This Auth user is already linked to another active partner.");
    const mapping = await service.from("partner_users").upsert({ partner_id: result.data.id, auth_user_id: values.authUserId, status: "active" }, { onConflict: "partner_id,auth_user_id" });
    if (mapping.error) throw new Error(mapping.error.message);
  }
  const { error: auditError } = await service.from("audit_logs").insert({
    actor_staff_user_id: authorization.staff.id,
    action: "partner.create",
    entity_type: "partners",
    entity_id: result.data.id,
    idempotency_key: `partner-create:${result.data.id}:${randomUUID()}`,
    metadata: { partner_code: values.partnerCode },
    created_by: authorization.user.id
  });
  if (auditError) throw new Error(auditError.message);
  revalidatePath(`/${values.locale}/admin/partners`);
}

const partnerDetailsSchema = z.object({
  locale: z.string().default("en"),
  id: z.string().uuid(),
  partnerName: z.string().trim().min(2).max(160),
  partnerType: z.string().trim().min(2).max(80),
  status: z.enum(["active", "inactive"]),
  contactName: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional()
});

export async function updatePartnerDetails(formData: FormData) {
  const parsed = partnerDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid partner details.");
  const values = parsed.data;
  const authorization = await requireAdminPermission(values.locale, "settings.manage");
  const service = createServiceClient();
  const { data: previous, error: previousError } = await service
    .from("partners")
    .select("partner_code,partner_name,partner_type,status,contact_name,contact_email,notes,archived_at")
    .eq("id", values.id)
    .single();
  if (previousError) throw new Error(previousError.message);
  if (previous.archived_at && values.status !== "inactive") throw new Error("Archived partners must remain inactive.");

  const next = {
    partner_name: values.partnerName,
    partner_type: values.partnerType,
    status: values.status,
    contact_name: values.contactName || null,
    contact_email: values.contactEmail || null,
    notes: values.notes || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await service.from("partners").update(next).eq("id", values.id);
  if (error) throw new Error(error.message);
  const { error: auditError } = await service.from("audit_logs").insert({
    actor_staff_user_id: authorization.staff.id,
    action: "partner.details.update",
    entity_type: "partners",
    entity_id: values.id,
    idempotency_key: `partner-details:${values.id}:${randomUUID()}`,
    metadata: { partner_code: previous.partner_code, old_value: previous, new_value: next },
    created_by: authorization.user.id
  });
  if (auditError) throw new Error(auditError.message);
  revalidatePath(`/${values.locale}/admin/partners`);
  redirectWithRateNotice(values.locale, "notice", "Partner details updated successfully.");
}

const partnerMappingSchema = z.object({
  locale: z.string().default("en"),
  partnerId: z.string().uuid(),
  authUserId: z.string().uuid()
});

export async function addPartnerLoginMapping(formData: FormData) {
  const parsed = partnerMappingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Enter a valid Supabase Auth user UUID.");
  const values = parsed.data;
  const authorization = await requireAdminPermission(values.locale, "settings.manage");
  const service = createServiceClient();
  const { data: existing, error: existingError } = await service
    .from("partner_users")
    .select("partner_id")
    .eq("auth_user_id", values.authUserId)
    .eq("status", "active")
    .neq("partner_id", values.partnerId);
  if (existingError) throw new Error(existingError.message);
  if (existing?.length) throw new Error("This Auth user is already linked to another active partner.");

  const { error } = await service.from("partner_users").upsert(
    { partner_id: values.partnerId, auth_user_id: values.authUserId, status: "active" },
    { onConflict: "partner_id,auth_user_id" }
  );
  if (error) throw new Error(error.message);
  const { error: auditError } = await service.from("audit_logs").insert({
    actor_staff_user_id: authorization.staff.id,
    action: "partner.login_mapping.activate",
    entity_type: "partner_users",
    entity_id: values.partnerId,
    idempotency_key: `partner-mapping-activate:${values.partnerId}:${values.authUserId}:${randomUUID()}`,
    metadata: { partner_id: values.partnerId, auth_user_id: values.authUserId },
    created_by: authorization.user.id
  });
  if (auditError) throw new Error(auditError.message);
  revalidatePath(`/${values.locale}/admin/partners`);
  redirectWithRateNotice(values.locale, "notice", "Partner login access updated successfully.");
}

export async function deactivatePartnerLoginMapping(formData: FormData) {
  const mappingId = z.string().uuid().parse(formData.get("mappingId"));
  const partnerId = z.string().uuid().parse(formData.get("partnerId"));
  const locale = String(formData.get("locale") || "en");
  const authorization = await requireAdminPermission(locale, "settings.manage");
  const service = createServiceClient();
  const { data: mapping, error: mappingError } = await service
    .from("partner_users")
    .update({ status: "inactive" })
    .eq("id", mappingId)
    .eq("partner_id", partnerId)
    .select("auth_user_id")
    .single();
  if (mappingError) throw new Error(mappingError.message);
  const { error: auditError } = await service.from("audit_logs").insert({
    actor_staff_user_id: authorization.staff.id,
    action: "partner.login_mapping.deactivate",
    entity_type: "partner_users",
    entity_id: mappingId,
    idempotency_key: `partner-mapping-deactivate:${mappingId}:${randomUUID()}`,
    metadata: { partner_id: partnerId, auth_user_id: mapping.auth_user_id },
    created_by: authorization.user.id
  });
  if (auditError) throw new Error(auditError.message);
  revalidatePath(`/${locale}/admin/partners`);
  redirectWithRateNotice(locale, "notice", "Partner login access removed successfully.");
}

const partnerLifecycleSchema = z.object({
  locale: z.string().default("en"),
  partnerId: z.string().uuid()
});

export async function archivePartner(formData: FormData) {
  const parsed = partnerLifecycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid partner archive request.");
  if (formData.get("confirmArchive") !== "yes") throw new Error("Archive confirmation is required.");
  const values = parsed.data;
  await requireAdminPermission(values.locale, "settings.manage");
  const client = createClient();
  const { error } = await client.rpc("archive_partner", { p_partner_id: values.partnerId });
  if (error) redirectWithRateNotice(values.locale, "error", error.message);
  revalidatePath(`/${values.locale}/admin/partners`);
  redirectWithRateNotice(values.locale, "notice", "Partner archived successfully.");
}

export async function restorePartner(formData: FormData) {
  const parsed = partnerLifecycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid partner restore request.");
  const values = parsed.data;
  await requireAdminPermission(values.locale, "settings.manage");
  const client = createClient();
  const { error } = await client.rpc("restore_partner", { p_partner_id: values.partnerId });
  if (error) redirectWithRateNotice(values.locale, "error", error.message);
  revalidatePath(`/${values.locale}/admin/partners`);
  redirectWithRateNotice(values.locale, "notice", "Partner restored as inactive.");
}

const partnerRateSchema = z.object({
  locale: z.string().default("en"),
  id: z.string().uuid(),
  customerDiscountRate: percentageSchema("Customer Benefit"),
  partnerRewardRate: percentageSchema("Partner Commission")
}).superRefine(validateCombinedRate);

function redirectWithRateNotice(
  locale: string,
  type: "notice" | "error",
  message: string,
  attemptedValues?: { partnerId: string; customerDiscountRate: string; partnerRewardRate: string }
): never {
  const params = new URLSearchParams({ [type]: message });
  if (attemptedValues) {
    params.set("edit", attemptedValues.partnerId);
    params.set("customerDiscountRate", attemptedValues.customerDiscountRate);
    params.set("partnerRewardRate", attemptedValues.partnerRewardRate);
  }
  redirect(`/${locale}/admin/partners?${params.toString()}`);
}

export async function updatePartnerCommercialRates(formData: FormData) {
  const attemptedValues = {
    partnerId: String(formData.get("id") || ""),
    customerDiscountRate: String(formData.get("customerDiscountRate") || ""),
    partnerRewardRate: String(formData.get("partnerRewardRate") || "")
  };
  const parsed = partnerRateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const locale = String(formData.get("locale") || "en");
    redirectWithRateNotice(
      locale,
      "error",
      parsed.error.issues[0]?.message || "Invalid commercial rates.",
      attemptedValues
    );
  }
  const values = parsed.data;
  await requireAdminPermission(values.locale, "settings.manage");

  const client = createClient();
  const { error } = await client.rpc("update_partner_commercial_rates", {
    p_partner_id: values.id,
    p_customer_discount_rate: values.customerDiscountRate / 100,
    p_partner_reward_rate: values.partnerRewardRate / 100
  });
  if (error) redirectWithRateNotice(values.locale, "error", error.message, attemptedValues);

  revalidatePath(`/${values.locale}/admin/partners`);
  redirectWithRateNotice(values.locale, "notice", "Partner rates updated successfully.");
}
