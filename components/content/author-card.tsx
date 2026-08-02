import type { ContentAuthor } from "@/lib/content/types";

export function AuthorCard({ author }: { author: ContentAuthor }) {
  return (
    <aside className="border-t border-forest/10 pt-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Written by</p>
      <p className="mt-3 font-serif text-2xl font-semibold text-forest">{author.name}</p>
      <p className="mt-1 text-sm font-semibold text-forest/50">{author.role}</p>
      <p className="mt-4 max-w-2xl leading-7 text-forest/60">{author.bio}</p>
    </aside>
  );
}
