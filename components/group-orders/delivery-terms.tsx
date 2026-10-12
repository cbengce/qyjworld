export const deliverySummary = {
  en: "Self-collection is free. For delivery within 10km of our store, drink orders of S$150 or more qualify for free delivery; orders below S$150 have a S$15 delivery fee. Delivery beyond 10km is quoted separately before confirmation.",
  zh: "到店自取免配送费。门店10公里内，饮品订单满S$150免费配送；未满S$150收取S$15配送费。超过10公里的配送费用将另行报价，并在确认订单前告知。",
};

export function DeliveryTerms({ locale }: { locale: string }) {
  const zh = locale === "zh";
  const cards = zh ? [
    ["到店自取", "免配送费", "到门店领取您的饮品。"],
    ["10公里内配送", "满S$150免费", "饮品订单未满S$150，配送费S$15。"],
    ["超过10公里", "另行报价", "确认订单前告知配送费用。"],
  ] : [
    ["Self-collection", "No delivery fee", "Collect your drinks from our store."],
    ["Delivery within 10km", "Free from S$150", "A S$15 delivery fee applies to drink orders below S$150."],
    ["Delivery beyond 10km", "Quoted separately", "We will advise the delivery fee before confirming your order."],
  ];
  return <section id="collection-delivery-terms" aria-labelledby="delivery-terms-title" className="rounded-[2rem] border border-forest/10 bg-white p-6 shadow-soft md:p-9">
    <h2 id="delivery-terms-title" className="font-serif text-3xl">{zh ? "直接订购 · 自取与配送" : "Direct orders · self-collection & delivery"}</h2>
    <p className="mt-3 leading-7 text-forest/70">{zh ? "您可以选择到店自取，或配送至指定地址。" : "Choose self-collection or delivery to your preferred address."}</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{cards.map(([title, price, detail]) => <div key={title} className="rounded-2xl bg-[#edf2e9] p-5">
      <h3 className="font-bold">{title}</h3><p className="mt-2 text-2xl font-bold">{price}</p><p className="mt-3 text-sm leading-6 text-forest/70">{detail}</p>
    </div>)}</div>
    <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-forest/70">
      <li>{zh ? "免费配送门槛按折扣后的饮品金额计算，不包括配送费；每笔订单限一个送货地址。" : "The free-delivery threshold is based on the drink subtotal after discounts, excluding delivery fees. Each order covers one delivery address."}</li>
      <li>{zh ? "配送距离从门店出发，按实际行车路线计算。" : "Distance is measured by the driving route from our store."}</li>
      <li>{zh ? "自取或配送日期、时间须由团队确认，并视当天供应及配送安排而定。" : "Collection or delivery dates and times are subject to availability and confirmation by our team."}</li>
    </ul>
  </section>;
}
