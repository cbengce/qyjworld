export type AscendEventName = "ascend_start_quiz" | "ascend_question_completed" | "ascend_complete_quiz" | "ascend_profile_completed" | "ascend_result_viewed" | "ascend_card_generated" | "ascend_download_card" | "ascend_card_downloaded" | "ascend_share_card" | "ascend_native_share" | "ascend_caption_copied" | "ascend_link_copied" | "ascend_referral_progress_viewed" | "ascend_try_again" | "ascend_menu_clicked" | "ascend_referral_visit" | "ascend_referral_completion" | "ascend_reward_unlock";
export type AscendEventProperties = { locale: string; profile?: string; referral_code?: string; reward?: string; device?: "mobile" | "tablet" | "desktop" };

declare global { interface Window { gtag?: (command: "event", name: string, properties?: Record<string, unknown>) => void } }

export function trackAscendEvent(name: AscendEventName, properties: AscendEventProperties) {
  try {
    if (typeof window !== "undefined") window.gtag?.("event", name, properties);
  } catch {
    // Analytics must never interrupt the customer experience.
  }
}
