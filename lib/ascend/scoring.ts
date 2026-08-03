import { ascendProfileOrder, type AscendProfileSlug } from "./profiles";

export const ascendQuestions = [
  { id: "feeling", prompt: "How do you feel today?", options: [["calm", "Calm"], ["energetic", "Energetic"], ["curious", "Curious"], ["tired", "Tired"], ["adventurous", "Adventurous"]] },
  { id: "flavour", prompt: "What kind of flavour feels right today?", options: [["bright", "Bright and refreshing"], ["floral", "Floral and elegant"], ["fruity", "Fruity and lively"], ["smooth", "Smooth and comforting"], ["bold", "Bold and tea-forward"]] },
  { id: "need", prompt: "What do you need most right now?", options: [["focus", "Focus"], ["refreshment", "Refreshment"], ["inspiration", "Inspiration"], ["comfort", "Comfort"], ["balance", "Balance"]] },
  { id: "image", prompt: "Choose the image that feels closest to you today.", options: [["moon", "Moon"], ["stars", "Stars"], ["clear-sky", "Clear sky"], ["wind", "Wind"], ["mountain", "Mountain"]] },
  { id: "outcome", prompt: "How would you like to leave feeling?", options: [["clear", "Clear"], ["uplifted", "Uplifted"], ["recharged", "Recharged"], ["grounded", "Grounded"], ["leave-calm", "Calm"]] }
] as const;

export type AscendAnswer = (typeof ascendQuestions)[number]["options"][number][0];

const weights: Record<string, Partial<Record<AscendProfileSlug, number>>> = {
  calm: { "luna-tide": 3, evenfall: 2, stillearth: 1 }, energetic: { "night-nectar": 3, monsoon: 2, cloudlift: 1 }, curious: { "night-nectar": 2, clearsky: 2, drift: 1 }, tired: { evenfall: 3, stillearth: 2, "luna-tide": 1 }, adventurous: { monsoon: 3, drift: 2, cloudlift: 1 },
  bright: { clearsky: 3, cloudlift: 2, "luna-tide": 1 }, floral: { "luna-tide": 3, evenfall: 2, "night-nectar": 1 }, fruity: { "night-nectar": 3, drift: 2, monsoon: 1 }, smooth: { evenfall: 3, stillearth: 2, "luna-tide": 1 }, bold: { stillearth: 3, monsoon: 2, clearsky: 1 },
  focus: { stillearth: 3, "luna-tide": 2, clearsky: 1 }, refreshment: { clearsky: 3, monsoon: 2, drift: 1 }, inspiration: { cloudlift: 3, "night-nectar": 2, drift: 1 }, comfort: { evenfall: 3, "luna-tide": 2, stillearth: 1 }, balance: { "luna-tide": 3, stillearth: 2, evenfall: 1 },
  moon: { "luna-tide": 4 }, stars: { "night-nectar": 4, cloudlift: 1 }, "clear-sky": { clearsky: 4, cloudlift: 1 }, wind: { monsoon: 3, drift: 3 }, mountain: { stillearth: 4 },
  clear: { clearsky: 3, "luna-tide": 2 }, uplifted: { cloudlift: 4, "night-nectar": 1 }, recharged: { monsoon: 3, "night-nectar": 2 }, grounded: { stillearth: 4, evenfall: 1 }, "leave-calm": { evenfall: 3, "luna-tide": 2 }
};

export function scoreAscendAnswers(answers: readonly string[]): AscendProfileSlug {
  const scores = Object.fromEntries(ascendProfileOrder.map((slug) => [slug, 0])) as Record<AscendProfileSlug, number>;
  for (const answer of answers) for (const [slug, score] of Object.entries(weights[answer] ?? {})) scores[slug as AscendProfileSlug] += score ?? 0;
  return ascendProfileOrder.reduce((winner, slug) => scores[slug] > scores[winner] ? slug : winner, ascendProfileOrder[0]);
}
