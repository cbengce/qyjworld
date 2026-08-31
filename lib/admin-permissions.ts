import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export type PermissionScope = { brandId?: string | null; storeId?: string | null; companyId?: string | null };

export async function hasAdminPermission(permission: string, scope: PermissionScope = {}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("staff_has_permission", {
    permission_code_value: permission,
    brand_id_value: scope.brandId ?? null,
    store_id_value: scope.storeId ?? null,
    company_id_value: scope.companyId ?? null
  });
  return !error && data === true;
}

export async function requireAdminPermission(locale: string, permission: string, scope: PermissionScope = {}) {
  const authorization = await requireAdmin(locale);
  if (!(await hasAdminPermission(permission, scope))) redirect(`/${locale}/admin`);
  return authorization;
}
