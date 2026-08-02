export function ShareButtons({ title, url }: { title: string; url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` }
  ];
  return (
    <div aria-label="Share this article" className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-forest/45">Share</span>
      {links.map((link) => <a key={link.label} className="focus-ring rounded-full border border-forest/15 px-4 py-2 text-sm font-semibold text-forest hover:border-forest" href={link.href} rel="noopener noreferrer" target={link.label === "Email" ? undefined : "_blank"}>{link.label}</a>)}
    </div>
  );
}
