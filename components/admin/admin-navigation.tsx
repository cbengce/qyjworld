import Link from "next/link";
import { logoutMember } from "@/app/actions";
import { Locale } from "@/lib/constants";

export function AdminNavigation({ locale }: { locale: Locale }) {
  return (
    <div className="mt-8 flex flex-col justify-between gap-3 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
      <nav aria-label="Admin navigation" className="flex flex-wrap gap-3">
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/promotions`}>
          Promotions
        </Link>
        <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:border-forest/40" href={`/${locale}/admin/leaderboard`}>
          Leaderboard
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
