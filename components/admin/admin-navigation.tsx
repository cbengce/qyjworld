import Link from "next/link";
import { logoutMember } from "@/app/actions";
import { requireAdmin } from "@/lib/data";
import { Locale } from "@/lib/constants";

export async function AdminNavigation({ locale }: { locale: Locale }) {
  const { role } = await requireAdmin(locale);
  const zh = locale === "zh";
  const button = "focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest transition hover:border-forest/40";
  const tool = "focus-ring rounded-xl border border-forest/10 bg-paper/40 p-3 text-sm text-forest";
  return <div className="mt-8 flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft sm:flex-row sm:items-start">
    <nav aria-label="Admin navigation" className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-3">
        <Link className={button} href={`/${locale}/admin`}>{zh ? "后台首页 · 会员" : "Admin Home · Members"}</Link>
        {role === "super_admin" && <>
          <Link className="focus-ring rounded-full bg-forest px-5 py-3 text-sm font-bold text-white" href={`/${locale}/admin/sales`}>{zh ? "全店业绩" : "Store Sales · 全店业绩"}</Link>
          <Link className={button} href={`/${locale}/admin/partner-dashboard`}>{zh ? "合作伙伴业绩" : "Partner Dashboard"}</Link>
        </>}
        {(role === "super_admin" || role === "manager") && <Link className={button} href={`/${locale}/admin/group-orders`}>{zh ? "团单管理" : "Group Orders · 团单管理"}</Link>}
        {(role === "super_admin" || role === "manager") && <Link className={button} href={`/${locale}/admin/gallery`}>{zh ? "画廊管理" : "Art Gallery"}</Link>}
      </div>
      <details className="mt-3 rounded-xl border border-forest/10">
        <summary className="focus-ring cursor-pointer px-4 py-3 text-sm font-bold text-forest">{zh ? "设置与工具" : "Settings & tools"}</summary>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link className={tool} href={`/${locale}/admin/stores`}><strong>{zh ? "门店管理" : "Stores · 门店管理"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "门店资料、营业时间与临时休息。" : "Store details, opening hours and exceptions."}</span></Link>
          <Link className={tool} href={`/${locale}/admin/menu`}><strong>{zh ? "菜单与价格" : "Menu & prices"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "饮品、图片、门店价格与供应状态。" : "Drinks, images, outlet prices and availability."}</span></Link>
          <Link className={tool} href={`/${locale}/admin/promotions`}><strong>{zh ? "活动管理" : "Promotions · 活动管理"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "网站活动海报、排期与发布状态。" : "Website campaign posters, schedules and publication."}</span></Link>
          {role === "super_admin" && <Link className={tool} href={`/${locale}/admin/traffic`}><strong>{zh ? "网站访问统计" : "Website traffic"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "浏览量、热门页面与搜索／AI 来源。" : "Recorded views, popular pages and search / AI sources."}</span></Link>}
          {role === "super_admin" && <Link className={tool} href={`/${locale}/admin/partners`}><strong>{zh ? "合作伙伴设置" : "Partner settings"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "管理伙伴资料与合作条件。" : "Manage partner details and commercial terms."}</span></Link>}
          {(role === "super_admin" || role === "manager") && <Link className={tool} href={`/${locale}/admin/discovery`}><strong>{zh ? "SEO / GEO 检查" : "SEO / GEO checks"}</strong><span className="mt-1 block text-xs leading-5 text-ink/65">{zh ? "内容资料、收录准备及团单来源检查。" : "Content completeness, indexing readiness and request sources."}</span></Link>}
        </div>
      </details>
    </nav>
    <form action={logoutMember}><button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white" type="submit">{zh ? "退出" : "Logout"}</button></form>
  </div>;
}

