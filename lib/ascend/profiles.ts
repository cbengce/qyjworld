export const ascendProfileOrder = [
  "luna-tide",
  "night-nectar",
  "evenfall",
  "clearsky",
  "monsoon",
  "drift",
  "stillearth",
  "cloudlift"
] as const;

export type AscendProfileSlug = (typeof ascendProfileOrder)[number];

export type AscendProfile = {
  slug: AscendProfileSlug;
  nameEn: string;
  nameZh: string;
  title: string;
  keywords: readonly [string, string, string, string];
  message: readonly [string, string, string, string];
  quote: string;
  image: string;
  theme: { background: string; accent: string; glow: string };
};

export const ascendProfiles: Record<AscendProfileSlug, AscendProfile> = {
  "luna-tide": { slug: "luna-tide", nameEn: "LUNA TIDE", nameZh: "月汐", title: "CALM CLARITY", keywords: ["Quiet strength", "Gentle confidence", "Reflective", "Balanced"], message: ["You do not need to rush to move forward.", "Today is a day for quiet clarity, thoughtful choices and a steadier rhythm.", "Move gently.", "Rise steadily."], quote: "Move gently. Rise steadily.", image: "/assets/menu/01-luna-tide.PNG", theme: { background: "#071d18", accent: "#d7b56d", glow: "#8db2a7" } },
  "night-nectar": { slug: "night-nectar", nameEn: "NIGHT NECTAR", nameZh: "星津", title: "TRANSFORMATIVE ALLURE", keywords: ["Imaginative", "Expressive", "Curious", "Lively"], message: ["Your energy grows when ideas are allowed to move freely.", "Today is a day to explore, create and follow the spark that others may overlook.", "Stay curious.", "Let inspiration rise."], quote: "Stay curious. Let inspiration rise.", image: "/assets/menu/02-night-nectar.PNG", theme: { background: "#11182d", accent: "#e5b96c", glow: "#a47bb4" } },
  evenfall: { slug: "evenfall", nameEn: "EVENFALL", nameZh: "归岚", title: "GENTLE WARMTH", keywords: ["Warm", "Comforting", "Thoughtful", "Kind"], message: ["You bring calm to the people and places around you.", "Today is a day for warmth, familiar moments and meaningful company.", "Stay gentle.", "Keep moving upward."], quote: "Stay gentle. Keep moving upward.", image: "/assets/menu/03-evenfall.PNG", theme: { background: "#37251f", accent: "#e3b87e", glow: "#c98579" } },
  clearsky: { slug: "clearsky", nameEn: "CLEARSKY", nameZh: "破云", title: "CLEAR RESOLVE", keywords: ["Clear-minded", "Refreshing", "Optimistic", "Direct"], message: ["Sometimes the next step appears only after the clouds begin to part.", "Today is a day to clear the noise and see things differently.", "Breathe deeply.", "Begin again."], quote: "Breathe deeply. Begin again.", image: "/assets/menu/04-clear-sky.PNG", theme: { background: "#173847", accent: "#e5ba67", glow: "#5a8492" } },
  monsoon: { slug: "monsoon", nameEn: "MONSOON", nameZh: "长风", title: "RESTLESS MOMENTUM", keywords: ["Adventurous", "Confident", "Restless", "Open-minded"], message: ["You are drawn toward movement, discovery and what lies beyond the familiar.", "Today is a day to choose the road you have not taken before.", "Move boldly.", "Ascend freely."], quote: "Move boldly. Ascend freely.", image: "/assets/menu/06-monsoon.PNG", theme: { background: "#10372d", accent: "#efbd65", glow: "#5d8c78" } },
  drift: { slug: "drift", nameEn: "DRIFT", nameZh: "云隐", title: "QUIET FREEDOM", keywords: ["Independent", "Relaxed", "Intuitive", "Unhurried"], message: ["Not every meaningful journey follows a straight line.", "Today is a day to trust your pace and leave room for surprise.", "Flow naturally.", "Rise in your own way."], quote: "Flow naturally. Rise in your own way.", image: "/assets/menu/09-drift.PNG", theme: { background: "#3f2f32", accent: "#e4aa98", glow: "#956f72" } },
  stillearth: { slug: "stillearth", nameEn: "STILLEARTH", nameZh: "山止", title: "GROUNDED STRENGTH", keywords: ["Stable", "Patient", "Dependable", "Composed"], message: ["Your strength does not need to announce itself.", "Today is a day to stay grounded, act with purpose and trust what you have built.", "Stand steady.", "Ascend with purpose."], quote: "Stand steady. Ascend with purpose.", image: "/assets/menu/07-stillearth.PNG", theme: { background: "#28251f", accent: "#c79b58", glow: "#766b58" } },
  cloudlift: { slug: "cloudlift", nameEn: "CLOUDLIFT", nameZh: "扶摇", title: "RISING POSSIBILITY", keywords: ["Hopeful", "Upward-looking", "Bright", "Ambitious"], message: ["You see possibility where others see distance.", "Today is a day to believe in what has not happened yet.", "Look upward.", "Let the journey lift you."], quote: "Look upward. Let the journey lift you.", image: "/assets/menu/08-cloudlift.PNG", theme: { background: "#dce8eb", accent: "#8f67a5", glow: "#ffffff" } }
};

export function isAscendProfileSlug(value: string | null): value is AscendProfileSlug {
  return value !== null && ascendProfileOrder.includes(value as AscendProfileSlug);
}
