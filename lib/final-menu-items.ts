import type { MenuItem } from "@/lib/menu-types";

export const finalMenuItems: MenuItem[] = [
  {
    id: "qyj-luna-tide",
    name_en: "Luna Tide",
    name_zh: "月汐",
    description_en: "Osmanthus jasmine fizz with jasmine xue ya tea, osmanthus jelly, lemon slice and osmanthus essence.",
    description_zh: "茉莉雪芽气泡茶，融合桂花冻、柠檬片与桂花精露。",
    regular_price: 6.9,
    member_price: null,
    image_url: "/assets/menu/01-luna-tide.PNG",
    is_featured: true,
    menu_categories: { name_en: "Signature Sparkling Tea", name_zh: "招牌气泡茶" }
  },
  {
    id: "qyj-night-nectar",
    name_en: "Night Nectar",
    name_zh: "星津",
    description_en: "Strawberry jasmine fizz with jasmine xue ya tea, strawberry and grape sparkle.",
    description_zh: "草莓茉莉气泡茶，融合茉莉雪芽茶、草莓与葡萄气泡。",
    regular_price: 7.9,
    member_price: 6,
    image_url: "/assets/menu/02-night-nectar.PNG",
    is_featured: true,
    menu_categories: { name_en: "Signature Sparkling Tea", name_zh: "招牌气泡茶" }
  },
  {
    id: "qyj-evenfall",
    name_en: "Evenfall",
    name_zh: "归岚",
    description_en: "Berry milk jasmine with strawberry, light fresh milk and jasmine xue ya tea.",
    description_zh: "桂里草莓、轻牛奶与茉莉雪芽茶交织的鲜奶茶。",
    regular_price: 6.9,
    member_price: 5,
    image_url: "/assets/menu/03-evenfall.PNG",
    is_featured: true,
    menu_categories: { name_en: "Signature Milk Tea", name_zh: "招牌鲜奶茶" }
  },
  {
    id: "qyj-clearsky",
    name_en: "Clearsky",
    name_zh: "破云",
    description_en: "Passionfruit rock oolong with bright tropical clarity and a sparkling finish.",
    description_zh: "百香果与大红袍乌龙交织，带来明亮热带果香与清爽气泡感。",
    regular_price: 7.9,
    member_price: 6,
    image_url: "/assets/menu/04-clear-sky.PNG",
    is_featured: false,
    menu_categories: { name_en: "House Sparkling Tea", name_zh: "青云气泡茶" }
  },
  {
    id: "qyj-glowstate",
    name_en: "GlowState",
    name_zh: "浮光",
    description_en: "Peach oolong sparkling tea with honeyed fruit brightness and a clean jasmine xue ya finish.",
    description_zh: "水蜜桃与单丛乌龙气泡茶，果香明亮，茉莉雪芽尾韵清爽。",
    regular_price: 6.9,
    member_price: 5,
    image_url: "/assets/menu/05-glowstate.PNG",
    is_featured: false,
    menu_categories: { name_en: "House Sparkling Tea", name_zh: "青云气泡茶" }
  },
  {
    id: "qyj-monsoon",
    name_en: "Monsoon",
    name_zh: "长风",
    description_en: "Guava oolong sparkling tea with jasmine xue ya craft and a clean fruit lift.",
    description_zh: "芭乐与单丛乌龙的气泡茶，果香明亮，茶韵清扬。",
    regular_price: 6.9,
    member_price: 5,
    image_url: "/assets/menu/06-monsoon.PNG",
    is_featured: false,
    menu_categories: { name_en: "House Sparkling Tea", name_zh: "青云气泡茶" }
  },
  {
    id: "qyj-stillearth",
    name_en: "Stillearth",
    name_zh: "山止",
    description_en: "Da hong pao fresh milk tea with a grounded tea body and smooth milk finish.",
    description_zh: "大红袍鲜牛奶茶，茶体沉稳，奶感顺滑。",
    regular_price: 6.9,
    member_price: 5,
    image_url: "/assets/menu/07-stillearth.PNG",
    is_featured: false,
    menu_categories: { name_en: "Signature Milk Tea", name_zh: "招牌鲜奶茶" }
  },
  {
    id: "qyj-cloudlift",
    name_en: "Cloudlift",
    name_zh: "扶摇",
    description_en: "Grape and cherry oolong sparkling tea with lifted tea fragrance and a graceful airy finish.",
    description_zh: "葡萄、樱桃与单丛乌龙气泡茶，茶香上扬，尾韵轻盈舒展。",
    regular_price: 7.9,
    member_price: 6,
    image_url: "/assets/menu/08-cloudlift.PNG",
    is_featured: false,
    menu_categories: { name_en: "House Sparkling Tea", name_zh: "青云气泡茶" }
  },
  {
    id: "qyj-drift",
    name_en: "Drift",
    name_zh: "云隐",
    description_en: "Peach dice with premium oolong tea, soft fruit clarity and a cloud-light sparkling texture.",
    description_zh: "蜜桃丁与高级乌龙茶交织，果感柔和，气泡轻盈。",
    regular_price: 6.9,
    member_price: 5,
    image_url: "/assets/menu/09-drift.PNG",
    is_featured: false,
    menu_categories: { name_en: "House Sparkling Tea", name_zh: "青云气泡茶" }
  }
];
