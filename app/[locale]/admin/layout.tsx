import type { Metadata } from "next";
import { requireAdmin } from "@/lib/data";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  await requireAdmin(params.locale);
  return children;
}
