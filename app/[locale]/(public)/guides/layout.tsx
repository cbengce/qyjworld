import { redirect } from "next/navigation";
export default function GuidesLocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) { if (params.locale !== "en") redirect("/en/guides"); return children; }
