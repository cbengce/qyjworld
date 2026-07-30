export type MenuItem = {
  id: string;
  name_en: string;
  name_zh: string;
  description_en: string | null;
  description_zh: string | null;
  regular_price: number | null;
  member_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  menu_categories: {
    name_en: string;
    name_zh: string;
  } | null;
};
