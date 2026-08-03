import type { AscendProfile } from "./profiles";

export function buildShareCaption(profile: Pick<AscendProfile, "nameEn" | "title" | "quote">, shareUrl: string) {
  return [
    "I discovered where I belong.",
    "",
    `Today, I am ${profile.nameEn} — ${profile.title}.`,
    "",
    profile.quote,
    "",
    "Born to Ascend.",
    "",
    shareUrl,
    "",
    "#QingYunJian",
    "#BornToAscend",
    "#AscendTeaProfile",
    "#TeaJourney",
    "#TeaPersonality"
  ].join("\n");
}
