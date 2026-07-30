import { Locale } from "@/lib/constants";
import { getMenuItems } from "@/lib/menu";
import { MenuCatalogue } from "@/components/menu/menu-catalogue";

export default async function MenuPage({ params }: { params: { locale: Locale } }) {
  const items = await getMenuItems();
  return <MenuCatalogue items={items} locale={params.locale} />;
}
