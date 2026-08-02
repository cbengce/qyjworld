import type { ContentEntry, ContentFaq, ContentKind, ContentProfile } from "@/lib/content/types";

const author = {
  name: "QING YUN JIAN Editorial Team",
  role: "Tea Culture Editors",
  bio: "The QING YUN JIAN editorial team explores modern Oriental tea culture, ingredients and thoughtful tea experiences in Singapore."
};

const articleSections = [
  ["Understanding the subject", "definition"],
  ["Why it matters in Singapore", "singapore"],
  ["Tea, ingredients and flavour", "ingredients"],
  ["How to recognise quality", "quality"],
  ["Choosing the right style", "choice"],
  ["Pairing and serving ideas", "pairing"],
  ["Sweetness, balance and refreshment", "balance"],
  ["A practical tasting method", "tasting"],
  ["Common questions and misconceptions", "myths"],
  ["Bringing it into everyday life", "routine"]
] as const;

const guideSections = [
  ...articleSections,
  ["Origins and cultural context", "culture"],
  ["Tea processing fundamentals", "processing"],
  ["Aroma, texture and finish", "sensory"],
  ["Seasonal considerations", "seasonal"],
  ["Ordering with confidence", "ordering"],
  ["Tea and food occasions", "food"],
  ["Building a personal tea vocabulary", "vocabulary"],
  ["Hosting and sharing tea", "hosting"],
  ["Responsible enjoyment", "responsibility"],
  ["A useful next step", "next"]
] as const;

function paragraph(profile: ContentProfile, lens: string, variation: number) {
  const opening: Record<string, string> = {
    definition: `${profile.focus} is most useful when understood as an experience rather than a label.`,
    singapore: `Singapore's climate, pace and food culture give ${profile.focus.toLowerCase()} a distinctive practical context.`,
    ingredients: `The character of ${profile.focus.toLowerCase()} begins with ingredient relationships, especially ${profile.ingredients}.`,
    quality: `Quality is easier to recognise when aroma, sweetness, texture and finish are considered together.`,
    choice: `The best choice depends on occasion, appetite and the kind of refreshment a guest wants.`,
    pairing: `Pairing works when the drink refreshes the palate without competing with the food.`,
    balance: `Sweetness should support tea character, not erase it.`,
    tasting: `A simple tasting method makes comparison more reliable and enjoyable.`,
    myths: `Popular descriptions can make tea sound simpler than it really is.`,
    routine: `${profile.audience} can make tea part of everyday life without turning it into a complicated ritual.`,
    culture: `Tea culture is not fixed in one period or one format; it changes as people, places and habits change.`,
    processing: `Processing decisions shape the cup long before fruit, milk or sparkling water is introduced.`,
    sensory: `Aroma arrives first, texture follows, and the finish determines what the drink leaves behind.`,
    seasonal: `Season and weather influence what feels satisfying in the glass.`,
    ordering: `Confident ordering begins with a few clear preferences rather than specialist vocabulary.`,
    food: `Food pairing turns a drink into part of a complete occasion.`,
    vocabulary: `A personal tea vocabulary helps people describe what they enjoy without borrowing exaggerated claims.`,
    hosting: `Sharing tea is as much about hospitality as it is about preparation.`,
    responsibility: `Responsible enjoyment includes portion awareness, sweetness awareness and respect for individual needs.`,
    next: `The most useful next step is practical: taste attentively, compare fairly and remember what worked.`
  };

  const detail = variation === 0
    ? `For ${profile.audience}, the important signals are clarity and proportion. Tea should remain identifiable, supporting ingredients should have a reason to be present, and the finish should invite another sip rather than create fatigue. ${profile.localAngle} This perspective also makes it easier to compare premium tea with sweeter mainstream beverages without treating either category as automatically superior.`
    : variation === 1
      ? `A thoughtful approach starts by asking what the drink is trying to express. With ${profile.ingredients}, small decisions about concentration, temperature and dilution can change the result significantly. The goal is coherence: aroma should prepare the palate for the flavour that follows, while texture and sweetness should resolve cleanly. ${profile.takeaway}`
      : `Practical judgement matters more than fashionable terminology. Notice whether the first aroma continues into the middle of the sip, whether the tea still has definition after ice begins to melt, and whether the finish feels clean. In Singapore, these details matter because drinks are often enjoyed slowly in warm weather, alongside meals or during travel. A well-composed drink should remain pleasant across that real-world window.`;

  return `${opening[lens] ?? opening.definition} ${detail}`;
}

function buildMarkdown(profile: ContentProfile, kind: ContentKind) {
  const sections = kind === "guide" ? guideSections : articleSections;
  const paragraphCount = kind === "guide" ? 3 : 2;

  return sections
    .map(([heading, lens]) => {
      const paragraphs = Array.from({ length: paragraphCount }, (_, index) => paragraph(profile, lens, index));
      const practicalList = kind === "guide"
        ? `\n\n- Identify the tea base before judging added flavours.\n- Compare aroma, body, sweetness and finish separately.\n- Consider the serving occasion and Singapore's warm climate.\n- Choose a style that supports ${profile.takeaway.toLowerCase()}`
        : "";
      return `## ${heading}\n\n${paragraphs.join("\n\n")}${practicalList}`;
    })
    .join("\n\n");
}

function buildFaq(profile: ContentProfile): ContentFaq[] {
  return [
    {
      question: `What should I look for when exploring ${profile.focus.toLowerCase()}?`,
      answer: `Look for a clear tea foundation, balanced sweetness, purposeful ingredients and a clean finish. ${profile.takeaway}`
    },
    {
      question: `Is ${profile.focus.toLowerCase()} suitable for Singapore's climate?`,
      answer: `${profile.localAngle} Serving temperature, ice dilution and sweetness level all affect how refreshing the drink remains.`
    },
    {
      question: `How can I compare different versions fairly?`,
      answer: "Taste them at a similar temperature and compare aroma, tea definition, sweetness, texture and aftertaste one at a time."
    },
    {
      question: "Does premium tea need to be complicated?",
      answer: "No. Premium quality should make the experience clearer and more coherent, not burden guests with unnecessary rules or jargon."
    }
  ];
}

export function countWords(markdown: string) {
  return markdown.replace(/^#+\s+/gm, "").replace(/^[-*]\s+/gm, "").trim().split(/\s+/).filter(Boolean).length;
}

export function createContentEntry(profile: ContentProfile, kind: ContentKind, index: number, relatedSlugs: string[]): ContentEntry {
  const markdown = buildMarkdown(profile, kind);
  const words = countWords(markdown);
  const minimum = kind === "guide" ? 4000 : 1500;
  const maximum = kind === "guide" ? 6000 : 2500;
  if (words < minimum || words > maximum) {
    throw new Error(`${profile.slug} has ${words} words; expected ${minimum}-${maximum}.`);
  }

  const published = new Date(Date.UTC(2026, 0, 8 + index));
  const updated = new Date(Date.UTC(2026, 6, 1 + (index % 28)));

  return {
    kind,
    slug: profile.slug,
    title: profile.title,
    description: profile.description,
    heroImage: profile.heroImage,
    heroAlt: `${profile.title} - QING YUN JIAN tea editorial`,
    author,
    publishedAt: published.toISOString(),
    updatedAt: updated.toISOString(),
    readingTime: Math.max(1, Math.ceil(words / 220)),
    keywords: profile.keywords,
    category: profile.category,
    categorySlug: profile.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    markdown,
    faq: buildFaq(profile),
    relatedSlugs
  };
}
