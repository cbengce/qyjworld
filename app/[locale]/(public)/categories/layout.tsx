import { redirect } from "next/navigation";
export default function CategoriesLocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) { if (params.locale !== "en") redirect("/en/categories"); return children; }
