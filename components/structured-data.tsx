type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

export function StructuredData({ data }: { data: StructuredDataValue }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
      type="application/ld+json"
    />
  );
}
