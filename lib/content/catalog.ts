import { discoveryEntries } from "./discovery";
import { reviewedEntries } from "./reviewed";
const articleSlugs = ["sparkling-tea-singapore-guide", "best-tea-singapore-how-to-choose", "oriental-tea-modern-meaning", "jasmine-tea-aroma-flavour-guide", "oolong-tea-beginners-guide", "bubble-tea-alternatives-singapore", "tea-for-students-focus-routine", "healthy-beverages-singapore-tea", "premium-tea-quality-signs", "chinese-tea-types-explained", "tea-pairing-singapore-food", "real-fruit-tea-ingredients", "osmanthus-tea-flavour", "sparkling-tea-vs-soda", "sparkling-tea-vs-bubble-tea", "milk-tea-without-heavy-sweetness", "macpherson-tea-guide", "tea-cafes-singapore-etiquette", "tea-sweetness-levels-guide", "iced-tea-singapore-climate", "tea-and-botanicals", "tea-tasting-beginners", "tea-pairing-desserts", "tea-pairing-spicy-food", "jasmine-tea-food-pairing", "oolong-tea-food-pairing", "premium-tea-gift-guide", "tea-caffeine-explained", "tea-hydration-balanced-view", "modern-tea-ritual-singapore"];
const guideSlugs = ["complete-guide-sparkling-tea", "complete-guide-chinese-tea", "singapore-premium-tea-guide", "jasmine-tea-complete-guide", "oolong-tea-complete-guide", "tea-pairing-complete-guide", "healthy-tea-beverages-guide", "tea-culture-modern-singapore-guide", "tea-ingredients-complete-guide", "student-tea-wellbeing-guide"];
const publishedEntries = [...discoveryEntries, ...reviewedEntries];
function publishedEntry(slug: string) {
  const entry = publishedEntries.find(entry => entry.slug === slug);
  if (!entry) throw new Error(`Missing reviewed content: ${slug}`);
  return entry;
}
export const articles = articleSlugs.map(publishedEntry);
export const guides = [...discoveryEntries.filter(entry => entry.kind === "guide"), ...guideSlugs.map(publishedEntry)];
export const allContent = [...articles, ...guides];

export const categories = Array.from(
  allContent.reduce((map, entry) => {
    const current = map.get(entry.categorySlug) ?? { name: entry.category, slug: entry.categorySlug, count: 0 };
    current.count += 1;
    map.set(entry.categorySlug, current);
    return map;
  }, new Map<string, { name: string; slug: string; count: number }>()).values()
).sort((a, b) => a.name.localeCompare(b.name));

export function getArticle(slug: string) {
  return articles.find((entry) => entry.slug === slug);
}

export function getGuide(slug: string) {
  return guides.find((entry) => entry.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getRelatedContent(entry: (typeof allContent)[number]) {
  const pool = allContent;
  return entry.relatedSlugs.map((slug) => pool.find((candidate) => candidate.slug === slug)).filter((candidate): candidate is (typeof pool)[number] => Boolean(candidate));
}

export function getContentSeoImage(entry: (typeof allContent)[number]) {
  const isHomepageHero = entry.heroImage.includes("hero-home") || entry.heroImage.includes("/bright-") || entry.heroImage.includes("sparkling-tea-detail");
  return {
    url: entry.heroImage,
    width: isHomepageHero ? 1672 : entry.heroImage.includes("portrait") ? 864 : 1536,
    height: isHomepageHero ? 941 : entry.heroImage.includes("portrait") ? 1536 : 864,
    alt: entry.heroAlt
  };
}
