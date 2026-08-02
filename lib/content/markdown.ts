export type MarkdownBlock =
  | { type: "heading"; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function headingId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const chunks = markdown.trim().split(/\n\s*\n/);
  return chunks.map((chunk) => {
    const value = chunk.trim();
    if (value.startsWith("## ")) {
      const text = value.slice(3).trim();
      return { type: "heading", text, id: headingId(text) };
    }
    if (value.split("\n").every((line) => line.startsWith("- "))) {
      return { type: "list", items: value.split("\n").map((line) => line.slice(2).trim()) };
    }
    return { type: "paragraph", text: value.replace(/\n+/g, " ") };
  });
}
