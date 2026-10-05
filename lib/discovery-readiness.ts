import type { ContentEntry } from "./content/types";
import type { MenuItem } from "./menu-types";

export function discoveryReadiness(content: ContentEntry[], menu: MenuItem[]) {
  return {
    articles: content.filter(entry => entry.kind === "article").length,
    guides: content.filter(entry => entry.kind === "guide").length,
    bilingual: content.filter(entry => Boolean(entry.zh)).length,
    untranslated: content.filter(entry => !entry.zh).map(entry => entry.slug),
    products: menu.map(item => ({
      id: item.id, productId: item.product_id, name: item.name_zh || item.name_en,
      missing: [
        !item.name_zh && "中文名称 / Chinese name",
        !item.description_en?.trim() && "英文介绍 / English description",
        !item.description_zh?.trim() && "中文介绍 / Chinese description",
        item.regular_price === null && "普通价格 / Regular price",
        !item.image_url && "产品图片 / Product image"
      ].filter((value): value is string => Boolean(value))
    }))
  };
}
