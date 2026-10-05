import type { Locale } from "@/lib/constants";

export function PriceOverview({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const ranges = [
    { en: "Milk Tea", zh: "奶茶", price: "S$5.90–8.90" },
    { en: "Other Tea Drinks", zh: "其他茶饮", price: "S$6.90–8.90" },
    { en: "Sports & Functional Tea", zh: "运动及功能茶饮", price: "S$7.90–9.90" }
  ];
  return (
    <section aria-label={zh ? "茶饮价格区间" : "Tea price ranges"} className="rounded-2xl border border-forest/10 bg-[#f8f5ed] p-6 md:p-8">
      <h2 className="font-serif text-3xl font-semibold text-forest">{zh ? "茶饮价格区间" : "Tea price ranges"}</h2>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {ranges.map(range => <div key={range.en} className="rounded-xl bg-white p-5">
          <dt className="text-sm font-semibold text-forest/70">{zh ? range.zh : range.en}</dt>
          <dd className="mt-3 text-2xl font-bold text-forest">{range.price}</dd>
        </div>)}
      </dl>
      <p className="mt-5 text-sm leading-6 text-forest/65">{zh ? "以上为各类茶饮的一般价格区间。具体饮品及选项的价格，请在订购时确认；会员优惠按适用条件执行。" : "These are general price ranges by tea category. Confirm the price of your drink and options when ordering; membership benefits are subject to their applicable terms."}</p>
    </section>
  );
}
