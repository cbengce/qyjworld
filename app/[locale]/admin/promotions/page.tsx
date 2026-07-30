import Link from "next/link";
import { deletePromotion, savePromotion, updatePromotionStatus } from "@/app/actions";
import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { localizedPath } from "@/lib/i18n/routing";
import { Promotion } from "@/lib/promotions";
import { createServiceClient } from "@/lib/supabase/admin";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { CmsSubmitButton } from "@/components/admin/cms-submit-button";
import { PromotionImageUploader } from "@/components/admin/promotion-image-uploader";
import { Section } from "@/components/ui";

function Message({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return (
    <p className={`mt-6 border p-4 font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-forest/10 bg-white text-forest"}`}>
      {error || notice}
    </p>
  );
}

function PromotionFields({ locale, promotion }: { locale: Locale; promotion?: Promotion }) {
  return (
    <>
      <input name="locale" type="hidden" value={locale} />
      {promotion ? <input name="id" type="hidden" value={promotion.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Title
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.title ?? ""} name="title" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Slug
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.slug ?? ""} name="slug" placeholder="student-month" required />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-forest">
        Subtitle
        <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.subtitle ?? ""} name="subtitle" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-forest">
        Description
        <textarea className="focus-ring min-h-28 border border-forest/15 bg-white px-4 py-3" defaultValue={promotion?.description ?? ""} name="description" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 text-sm font-semibold text-forest">
          Homepage Cover Image
          <PromotionImageUploader
            emptyMessage="No cover image uploaded. Homepage cards will fall back to the poster image."
            fieldName="coverImageUrl"
            initialUrl={promotion?.cover_image_url}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest/45">Recommended: 1600 x 900 landscape cover.</p>
        </div>
        <div className="grid gap-2 text-sm font-semibold text-forest">
          Full Poster Image
          <PromotionImageUploader emptyMessage="No poster image uploaded." initialUrl={promotion?.image_url} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest/45">Recommended: 1080 x 1350 portrait poster or A4 ratio.</p>
        </div>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-forest">
        Image Display Mode
        <select className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.image_display_mode ?? "auto"} name="imageDisplayMode">
          <option value="auto">Auto</option>
          <option value="portrait">Portrait Poster</option>
          <option value="landscape">Landscape Cover</option>
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-forest">
          CTA Label
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.cta_label ?? ""} name="ctaLabel" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          CTA URL
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.cta_url ?? ""} name="ctaUrl" placeholder="/en/register" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Start Date
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.start_date?.slice(0, 16) ?? ""} name="startDate" type="datetime-local" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          End Date
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.end_date?.slice(0, 16) ?? ""} name="endDate" type="datetime-local" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Display Order
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.display_order ?? 0} name="displayOrder" type="number" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Status
          <select className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={promotion?.status ?? "draft"} name="status">
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-forest">
        <input defaultChecked={promotion?.show_on_homepage ?? false} name="showOnHomepage" type="checkbox" />
        Show on homepage
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-forest">
        <input defaultChecked={promotion?.show_ascend_community_cta ?? false} name="showAscendCommunityCta" type="checkbox" />
        Show Ascend Community CTA
      </label>
    </>
  );
}

export default async function AdminPromotionsPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams: { edit?: string; error?: string; notice?: string };
}) {
  await requireAdmin(params.locale);
  const supabase = createServiceClient();
  const { data } = await supabase.from("promotions").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false });
  const promotions = (data ?? []) as Promotion[];

  return (
    <main className="overflow-hidden">
      <Section>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-gold">Admin</p>
              <h1 className="mt-3 font-serif text-6xl font-semibold">Promotions</h1>
            </div>
            <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest" href={localizedPath(params.locale, "/promotions")}>
              Preview Public Page
            </Link>
          </div>
          <AdminNavigation locale={params.locale} />
          <Message error={searchParams.error} notice={searchParams.notice} />

          <form action={savePromotion} className="mt-8 grid gap-5 bg-white p-6 shadow-soft">
            <h2 className="font-serif text-3xl font-semibold text-forest">Create Promotion</h2>
            <PromotionFields locale={params.locale} />
            <CmsSubmitButton className="w-fit" pendingLabel="Saving promotion...">
              Save Promotion
            </CmsSubmitButton>
          </form>

          <div className="mt-8 grid gap-5">
            {promotions.map((promotion) => (
              <details
                {...(searchParams.edit === promotion.id ? { open: true } : {})}
                id={`promotion-${promotion.id}`}
                key={promotion.id}
                className="bg-white p-6 shadow-soft"
              >
                <summary className="cursor-pointer font-serif text-3xl font-semibold text-forest">
                  {promotion.title} <span className="text-base font-sans text-forest/50">({promotion.status})</span>
                </summary>
                <form action={savePromotion} className="mt-6 grid gap-5">
                  <PromotionFields locale={params.locale} promotion={promotion} />
                  <div className="flex flex-wrap gap-3">
                    <CmsSubmitButton pendingLabel="Updating promotion...">
                      Update
                    </CmsSubmitButton>
                  </div>
                </form>
                <div className="mt-5 flex flex-wrap gap-3 border-t border-forest/10 pt-5">
                  <Link
                    className="focus-ring inline-flex min-h-10 items-center rounded-full border border-forest/20 px-4 text-xs font-bold uppercase tracking-[0.14em] text-forest"
                    href={`/${params.locale}/admin/promotions/${promotion.id}/preview`}
                    target="_blank"
                  >
                    Preview
                  </Link>
                  {[
                    { label: "Save as Draft", status: "draft" },
                    { label: "Schedule", status: "scheduled" },
                    { label: "Publish", status: "active" },
                    { label: "Unpublish", status: "draft" },
                    { label: "Archive", status: "ended" }
                  ].map((item) => (
                    <form action={updatePromotionStatus} key={`${item.label}-${item.status}`}>
                      <input name="locale" type="hidden" value={params.locale} />
                      <input name="id" type="hidden" value={promotion.id} />
                      <input name="status" type="hidden" value={item.status} />
                      <button className="focus-ring min-h-10 rounded-full border border-forest/20 px-4 text-xs font-bold uppercase tracking-[0.14em] text-forest" type="submit">
                        {item.label}
                      </button>
                    </form>
                  ))}
                  <form action={deletePromotion} className="flex flex-wrap items-center gap-3">
                    <input name="locale" type="hidden" value={params.locale} />
                    <input name="id" type="hidden" value={promotion.id} />
                    <label className="flex items-center gap-2 text-xs font-semibold text-red-700">
                      <input name="confirmDelete" type="checkbox" /> Confirm delete
                    </label>
                    <button className="focus-ring min-h-10 rounded-full border border-red-200 px-4 text-xs font-bold uppercase tracking-[0.14em] text-red-700" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
