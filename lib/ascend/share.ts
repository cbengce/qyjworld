import type { AscendProfile } from "./profiles";

export const ASCEND_SHARE_HASHTAGS = [
  "#QingYunJian",
  "#BornToAscend",
  "#AscendTeaProfile",
  "#TeaJourney",
  "#TeaPersonality"
] as const;

export function buildShareCaption(profile: Pick<AscendProfile, "nameEn" | "title" | "quote">, shareUrl: string) {
  return [
    "I discovered my place.",
    "",
    `Today, I am ${profile.nameEn} - ${profile.title}.`,
    "",
    profile.quote,
    "",
    "Born to Ascend.",
    "",
    shareUrl
  ].join("\n");
}

export function buildShareHashtags() {
  return ASCEND_SHARE_HASHTAGS.join(" ");
}

export function buildShareText(profile: Pick<AscendProfile, "nameEn" | "title" | "quote">, shareUrl: string) {
  return `${buildShareCaption(profile, shareUrl)}\n\n${buildShareHashtags()}`;
}
