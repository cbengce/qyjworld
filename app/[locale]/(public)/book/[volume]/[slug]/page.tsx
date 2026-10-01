import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NEW_BOOK_STORIES, bookStoryText, newBookStoryPath } from "@/lib/book-stories";
import { type Locale } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";
import { NewStoryChapter } from "@/components/book/new-story-chapter";

type Params = { params: { locale: Locale; volume: string; slug: string } };
const findStory = ({ volume, slug }: Params["params"]) => NEW_BOOK_STORIES.find(story => story.volume.toLowerCase() === volume && story.slug === slug);

export function generateMetadata({ params }: Params): Metadata {
  const story = findStory(params);
  if (!story) return {};
  const copy = bookStoryText(story, params.locale);
  return createPageMetadata({ locale: "zh" in story ? params.locale : "en", path: newBookStoryPath(story), title: `${copy.title} | The Book of Qing Yun Jian`, description: copy.description, includeLanguageAlternates: "zh" in story });
}

export default function BookStoryPage({ params }: Params) {
  const story = findStory(params);
  if (!story) notFound();
  if (params.locale !== "en" && !("zh" in story)) redirect(`/en${newBookStoryPath(story)}`);
  return <NewStoryChapter story={story} locale={params.locale}/>;
}
