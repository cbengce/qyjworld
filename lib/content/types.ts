export type ContentKind = "article" | "guide";

export type ContentFaq = {
  question: string;
  answer: string;
};

export type ContentAuthor = {
  name: string;
  role: string;
  bio: string;
};

export type ContentEntry = {
  kind: ContentKind;
  slug: string;
  title: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  author: ContentAuthor;
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
  keywords: string[];
  category: string;
  categorySlug: string;
  markdown: string;
  faq: ContentFaq[];
  relatedSlugs: string[];
};

export type ContentProfile = {
  slug: string;
  title: string;
  description: string;
  category: string;
  focus: string;
  ingredients: string;
  audience: string;
  localAngle: string;
  takeaway: string;
  keywords: string[];
  heroImage: string;
};
