import { createClient } from "@/lib/supabase/server";

export type PromotionStatus = "draft" | "scheduled" | "active" | "ended";
export type PromotionImageDisplayMode = "auto" | "portrait" | "landscape";

export type Promotion = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  image_url: string | null;
  image_display_mode: PromotionImageDisplayMode;
  cta_label: string | null;
  cta_url: string | null;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  show_on_homepage: boolean;
  show_ascend_community_cta: boolean;
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
};

export type LeaderboardEntry = {
  id: string;
  campaign_slug: string;
  school_name: string;
  internal_participant_count: number;
  rank: number | null;
  score: number | null;
  status: "draft" | "ready" | "published" | "archived";
  short_note: string | null;
  display_order: number;
  is_qualified: boolean;
  is_published: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicLeaderboardEntry = Pick<
  LeaderboardEntry,
  "id" | "campaign_slug" | "school_name" | "rank" | "display_order" | "short_note" | "published_at" | "created_at" | "updated_at"
>;

export function promotionStatusLabel(promotion: Pick<Promotion, "status" | "start_date" | "end_date">) {
  const now = Date.now();
  const start = promotion.start_date ? new Date(promotion.start_date).getTime() : null;
  const end = promotion.end_date ? new Date(promotion.end_date).getTime() : null;

  if (promotion.status === "ended" || (end !== null && Number.isFinite(end) && now > end)) return "ENDED";
  if (promotion.status === "scheduled" || (start !== null && Number.isFinite(start) && now < start)) return "COMING SOON";
  return "LIVE NOW";
}

export function formatPromotionDateRange(startDate: string | null, endDate: string | null) {
  const withYear = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric" });
  const withoutYear = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short" });
  const normalize = (value: string) => value.replace(/\bSep\b/g, "Sept");
  const startValue = startDate ? new Date(startDate) : null;
  const endValue = endDate ? new Date(endDate) : null;
  const start = startValue && Number.isFinite(startValue.getTime()) ? startValue : null;
  const end = endValue && Number.isFinite(endValue.getTime()) ? endValue : null;

  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = normalize((sameYear ? withoutYear : withYear).format(start));
    const endLabel = normalize(withYear.format(end));
    return `${startLabel} – ${endLabel}`;
  }
  if (start) return `From ${normalize(withYear.format(start))}`;
  if (end) return `Until ${normalize(withYear.format(end))}`;
  return "Dates to be announced";
}

export async function getHomepagePromotions() {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("show_on_homepage", true)
    .in("status", ["active", "scheduled"])
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(2);

  return (data ?? []) as Promotion[];
}

export async function getPublicPromotions() {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .in("status", ["active", "scheduled", "ended"])
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (data ?? []) as Promotion[];
}

export async function getPublicPromotion(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("slug", slug)
    .in("status", ["active", "scheduled", "ended"])
    .maybeSingle();

  return data as Promotion | null;
}

export async function getPublicLeaderboardEntries(campaignSlug?: string) {
  const supabase = createClient();
  let query = supabase
    .from("public_community_leaderboard_entries")
    .select("id, campaign_slug, school_name, rank, display_order, short_note, published_at, created_at, updated_at")
    .order("rank", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true })
    .limit(10);

  if (campaignSlug) query = query.eq("campaign_slug", campaignSlug);

  const { data } = await query;
  return (data ?? []) as PublicLeaderboardEntry[];
}
