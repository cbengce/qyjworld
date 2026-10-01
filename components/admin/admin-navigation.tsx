import Link from "next/link";
import { logoutMember } from "@/app/actions";
import { requireAdmin } from "@/lib/data";
import { Locale } from "@/lib/constants";

export async function AdminNavigation({ locale }: { locale: Locale }) {
  const { role } = await requireAdmin(locale);
  return (
    <div className="mt-8 flex flex-col justify-between gap-3 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
      <nav aria-label="Admin navigation" className="flex flex-wrap gap-3">
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:border-forest/40" href={`/${locale}/admin`}>
          {locale === "zh" ? "后台首页" : "Admin Home"}
        </Link>
        {(role === "super_admin" || role === "manager") && <Link className="focus-ring rounded-full bg-forest px-5 py-3 text-sm font-bold text-white transition duration-300 hover:bg-ink" href={`/${locale}/admin/group-orders`}>
          {locale === "zh" ? "团单管理" : "Group Orders · 团单管理"}
        </Link>}
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/stores`}>
          Stores
        </Link>
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/menu`}>
          Menu CMS
        </Link>
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/promotions`}>
          Promotions
        </Link>
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/leaderboard`}>
          Leaderboard
        </Link>
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/partner-transactions`}>
          Partner Transactions
        </Link>
      </nav>
      <form action={logoutMember}>
        <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink" type="submit">
          Logout
        </button>
      </form>
    </div>
  );
}
