import { redirect } from "next/navigation";
export default function BlogLocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) { if (params.locale !== "en") redirect("/en/blog"); return children; }
