import { redirect } from "next/navigation";
export default function SearchLocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) { if (params.locale !== "en") redirect("/en/search"); return children; }
