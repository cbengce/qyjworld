import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PublicStore } from "@/lib/store-types";

const STORE_SELECT = "id, brand_id, public_slug, name, address_line_1, address_line_2, city, country_code, postal_code, timezone, currency_code, phone, public_email, latitude, longitude, map_url, ordering_url, is_primary, store_operating_hours(id, day_of_week, interval_no, opens_at, closes_at, is_closed), store_hours_exceptions(id, exception_date, interval_no, label, opens_at, closes_at, is_closed)";

export const getPrimaryStore = cache(async (): Promise<PublicStore | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_SELECT)
    .eq("status", "active")
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error(`[QYJ_STORE_DATA_UNAVAILABLE] ${error.message}`);
    return null;
  }
  return data as unknown as PublicStore | null;
});

export async function getAdminStores() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, brand_id, store_code, public_slug, name, address_line_1, address_line_2, city, country_code, postal_code, timezone, currency_code, phone, public_email, latitude, longitude, map_url, ordering_url, is_primary, status")
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
