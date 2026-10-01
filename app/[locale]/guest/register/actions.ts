"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicSiteUrl } from "@/lib/partners/referral-url";
const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), phone: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/), password: z.string().min(8).max(128), privacy: z.literal(true), website: z.literal(""), locale: z.enum(["en", "zh"]) });
export async function registerGuest(_: { ok: boolean; message: string }, form: FormData) {
  const value = schema.safeParse({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password"), privacy: form.get("privacy") === "on", website: form.get("website") || "", locale: form.get("locale") });
  if (!value.success) return { ok: false, message: "Please check your details. Passwords need at least 8 characters. / 请检查资料，密码至少需要8位。" };
  if (!checkRateLimit(`guest-register:${headers().get("x-forwarded-for")?.split(",")[0] || "unknown"}`).ok) return { ok: false, message: "Please wait a minute and try again. / 请稍后重试。" };
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email: value.data.email, password: value.data.password, options: { emailRedirectTo: `${getPublicSiteUrl()}/api/auth/callback?next=${encodeURIComponent(`/${value.data.locale}/guest`)}`, data: { full_name: value.data.name, mobile: value.data.phone, account_type: "guest", locale: value.data.locale, privacy_consent_at: new Date().toISOString() } } });
  if (error) return { ok: false, message: "We could not complete registration. Please try again or use guest checkout. / 暂时无法注册，您仍可直接以访客身份提交团单。" };
  if (data.session) redirect(`/${value.data.locale}/guest`);
  return { ok: true, message: "If your email is eligible for registration, check your inbox for a confirmation link. If you already have an account, sign in instead. No paid membership has been created. / 请查看邮箱中的确认链接；已有账号请直接登录。此操作不会开通付费会员。" };
}
