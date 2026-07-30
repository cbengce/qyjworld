import Link from "next/link";
import {
  clearPublishedLeaderboard,
  deleteLeaderboardEntry,
  moveLeaderboardEntry,
  saveLeaderboardEntry,
  updateLeaderboardPublication
} from "@/app/actions";
import { Locale } from "@/lib/constants";
import { requireAdmin } from "@/lib/data";
import { localizedPath } from "@/lib/i18n/routing";
import { LeaderboardEntry, Promotion } from "@/lib/promotions";
import { createServiceClient } from "@/lib/supabase/admin";
import { AdminNavigation } from "@/components/admin/admin-navigation";
import { CmsSubmitButton } from "@/components/admin/cms-submit-button";
import { Section } from "@/components/ui";

const QUALIFYING_THRESHOLD = 10;

function Message({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return (
    <p className={`mt-6 border p-4 font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-forest/10 bg-white text-forest"}`}>
      {error || notice}
    </p>
  );
}

function qualificationLabel(count = 0) {
  return count >= QUALIFYING_THRESHOLD ? "Qualified - 10 or more" : "Not Yet Qualified - fewer than 10";
}

function statusTone(entry: LeaderboardEntry) {
  if (entry.status === "published") return "bg-forest text-white";
  if (entry.status === "ready") return "bg-gold/15 text-gold";
  if (entry.status === "archived") return "bg-forest/10 text-forest/50";
  return "bg-[#f8f5ed] text-forest/60";
}

function isPublicEligible(entry: LeaderboardEntry) {
  return entry.status === "published" && entry.is_published && entry.is_qualified && entry.internal_participant_count >= QUALIFYING_THRESHOLD;
}

function byPublicOrder(a: LeaderboardEntry, b: LeaderboardEntry) {
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return a.created_at.localeCompare(b.created_at);
}

function EntryFields({ locale, entry, campaignSlug }: { locale: Locale; entry?: LeaderboardEntry; campaignSlug?: string }) {
  const participantCount = entry?.internal_participant_count ?? 0;
  return (
    <>
      <input name="locale" type="hidden" value={locale} />
      {entry ? <input name="id" type="hidden" value={entry.id} /> : null}
      <input name="campaignSlug" type="hidden" value={entry?.campaign_slug ?? campaignSlug ?? "student-month"} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]">
        <label className="grid gap-2 text-sm font-semibold text-forest">
          School / Community
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={entry?.school_name ?? ""} name="schoolName" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Internal Participants
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={participantCount} min={0} name="internalParticipantCount" type="number" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Short Note
          <input className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={entry?.short_note ?? ""} name="shortNote" placeholder="Optional public-safe note" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          Public Status
          <select className="focus-ring min-h-12 border border-forest/15 bg-white px-4" defaultValue={entry?.status ?? "draft"} name="status">
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 border border-forest/10 bg-[#f8f5ed] p-4 text-sm text-forest/65 md:grid-cols-2 md:items-center">
        <div>
          <p className="font-bold text-forest">Qualification</p>
          <p className="mt-1">{qualificationLabel(participantCount)}</p>
        </div>
        <p className="font-semibold">Participant counts are for internal qualification only and will never appear publicly.</p>
      </div>
    </>
  );
}

function StatusAction({
  entry,
  label,
  locale,
  status
}: {
  entry: LeaderboardEntry;
  label: string;
  locale: Locale;
  status: LeaderboardEntry["status"];
}) {
  return (
    <form action={updateLeaderboardPublication}>
      <input name="locale" type="hidden" value={locale} />
      <input name="id" type="hidden" value={entry.id} />
      <input name="status" type="hidden" value={status} />
      <button className="focus-ring min-h-10 rounded-full border border-forest/20 px-4 text-xs font-bold uppercase tracking-[0.14em] text-forest" type="submit">
        {label}
      </button>
    </form>
  );
}

function MoveAction({
  direction,
  disabled,
  entry,
  locale
}: {
  direction: "up" | "down";
  disabled: boolean;
  entry: LeaderboardEntry;
  locale: Locale;
}) {
  return (
    <form action={moveLeaderboardEntry}>
      <input name="locale" type="hidden" value={locale} />
      <input name="id" type="hidden" value={entry.id} />
      <input name="direction" type="hidden" value={direction} />
      <button
        className="focus-ring min-h-10 rounded-full border border-forest/20 px-4 text-xs font-bold uppercase tracking-[0.14em] text-forest disabled:cursor-not-allowed disabled:opacity-35"
        disabled={disabled}
        type="submit"
      >
        Move {direction === "up" ? "Up" : "Down"}
      </button>
    </form>
  );
}

function LeaderboardEntryEditor({
  entry,
  isFirst,
  isLast,
  locale,
  publicPosition
}: {
  entry: LeaderboardEntry;
  isFirst: boolean;
  isLast: boolean;
  locale: Locale;
  publicPosition?: number;
}) {
  const eligible = isPublicEligible(entry);

  return (
    <details className="bg-white p-6 shadow-soft">
      <summary className="cursor-pointer">
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-serif text-3xl font-semibold text-forest">{entry.school_name}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusTone(entry)}`}>{entry.status}</span>
          <span className="text-sm font-semibold text-forest/50">{qualificationLabel(entry.internal_participant_count)}</span>
          <span className="text-sm font-bold text-gold">
            Current Public Position: {publicPosition ? `#${publicPosition}` : "Not public"}
          </span>
        </span>
      </summary>
      <form action={saveLeaderboardEntry} className="mt-6 grid gap-5">
        <EntryFields entry={entry} locale={locale} />
        <CmsSubmitButton className="w-fit" pendingLabel="Updating entry...">
          Save Draft
        </CmsSubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-forest/10 pt-5">
        <StatusAction entry={entry} label="Mark Ready" locale={locale} status="ready" />
        <StatusAction entry={entry} label="Publish" locale={locale} status="published" />
        <StatusAction entry={entry} label="Unpublish" locale={locale} status="ready" />
        <StatusAction entry={entry} label="Archive" locale={locale} status="archived" />
        {eligible ? (
          <>
            <MoveAction direction="up" disabled={isFirst} entry={entry} locale={locale} />
            <MoveAction direction="down" disabled={isLast} entry={entry} locale={locale} />
          </>
        ) : null}
      </div>
      <form action={deleteLeaderboardEntry} className="mt-5 flex flex-wrap items-center gap-3 border-t border-forest/10 pt-5">
        <input name="locale" type="hidden" value={locale} />
        <input name="id" type="hidden" value={entry.id} />
        <label className="flex items-center gap-2 text-xs font-semibold text-red-700">
          <input name="confirmDelete" type="checkbox" /> Confirm delete
        </label>
        <button className="focus-ring min-h-10 rounded-full border border-red-200 px-4 text-xs font-bold uppercase tracking-[0.14em] text-red-700" type="submit">
          Delete
        </button>
      </form>
    </details>
  );
}

export default async function AdminLeaderboardPage({
  params,
  searchParams
}: {
  params: { locale: Locale };
  searchParams: { campaign?: string; error?: string; notice?: string };
}) {
  await requireAdmin(params.locale);
  const supabase = createServiceClient();
  const [{ data: promotions }, { data: entries }] = await Promise.all([
    supabase.from("promotions").select("slug, title, status").order("display_order", { ascending: true }),
    supabase
      .from("community_leaderboard_entries")
      .select("*")
      .order("campaign_slug", { ascending: true })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
  ]);
  const promotionOptions = (promotions ?? []) as Pick<Promotion, "slug" | "title" | "status">[];
  const campaignSlug = searchParams.campaign ?? promotionOptions.find((promotion) => promotion.slug === "student-month")?.slug ?? promotionOptions[0]?.slug ?? "student-month";
  const allEntries = (entries ?? []) as LeaderboardEntry[];
  const filteredEntries = allEntries.filter((entry) => entry.campaign_slug === campaignSlug);
  const publicEntries = filteredEntries.filter(isPublicEligible).sort(byPublicOrder).slice(0, 10);
  const privateEntries = filteredEntries
    .filter((entry) => !isPublicEligible(entry))
    .sort((a, b) => a.status.localeCompare(b.status) || b.updated_at.localeCompare(a.updated_at));
  const publicPositionById = new Map(publicEntries.map((entry, index) => [entry.id, index + 1]));
  const draftCount = filteredEntries.filter((entry) => entry.status === "draft").length;
  const qualifiedCount = filteredEntries.filter((entry) => entry.internal_participant_count >= QUALIFYING_THRESHOLD).length;
  const publishedCount = publicEntries.length;
  const publicSlots = Math.max(0, 10 - publishedCount);

  return (
    <main className="overflow-hidden">
      <Section>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-gold">Admin</p>
              <h1 className="mt-3 font-serif text-6xl font-semibold">Community Leaderboard</h1>
            </div>
            <Link className="focus-ring rounded-full border border-forest/20 px-5 py-3 text-sm font-bold text-forest" href={localizedPath(params.locale, "/leaderboard")}>
              Public Preview
            </Link>
          </div>
          <AdminNavigation locale={params.locale} />
          <Message error={searchParams.error} notice={searchParams.notice} />

          <form className="mt-8 flex flex-col gap-3 bg-white p-5 shadow-soft sm:flex-row">
            <label className="sr-only" htmlFor="campaign">Campaign</label>
            <select id="campaign" className="focus-ring min-h-12 flex-1 border border-forest/15 bg-white px-4" defaultValue={campaignSlug} name="campaign">
              {promotionOptions.map((promotion) => (
                <option key={promotion.slug} value={promotion.slug}>
                  {promotion.title}
                </option>
              ))}
              {promotionOptions.length ? null : <option value="student-month">Student Month</option>}
            </select>
            <button className="focus-ring min-h-12 rounded-full bg-forest px-6 text-sm font-bold text-white" type="submit">
              Choose Campaign
            </button>
          </form>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Draft Entries", draftCount],
              ["Qualified Entries", qualifiedCount],
              ["Published Entries", publishedCount],
              ["Public Slots", `${publicSlots} / 10`]
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-5 shadow-soft">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest/45">{label}</p>
                <p className="mt-3 font-serif text-4xl font-semibold text-forest">{value}</p>
              </div>
            ))}
          </div>

          <form action={saveLeaderboardEntry} className="mt-8 grid gap-5 bg-white p-6 shadow-soft">
            <h2 className="font-serif text-3xl font-semibold text-forest">Add Leaderboard Entry</h2>
            <EntryFields campaignSlug={campaignSlug} locale={params.locale} />
            <CmsSubmitButton className="w-fit" pendingLabel="Saving draft...">
              Save Draft
            </CmsSubmitButton>
          </form>

          <div className="mt-8 grid gap-8">
            <section className="grid gap-5">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-forest">Published Top 10</h2>
                <p className="mt-2 text-sm font-semibold text-forest/55">
                  Public ranks are assigned automatically from this order.
                </p>
              </div>
              {publicEntries.map((entry, index) => (
                <LeaderboardEntryEditor
                  key={entry.id}
                  entry={entry}
                  isFirst={index === 0}
                  isLast={index === publicEntries.length - 1}
                  locale={params.locale}
                  publicPosition={publicPositionById.get(entry.id)}
                />
              ))}
              {publicEntries.length ? null : <div className="bg-white p-8 text-forest/60 shadow-soft">No published qualified entries for this campaign yet.</div>}
            </section>

            <section className="grid gap-5">
              <div>
                <h2 className="font-serif text-3xl font-semibold text-forest">Not Yet Published</h2>
                <p className="mt-2 text-sm font-semibold text-forest/55">
                  Draft, unqualified, unpublished and archived entries do not receive public ranks.
                </p>
              </div>
              {privateEntries.map((entry) => (
                <LeaderboardEntryEditor
                  key={entry.id}
                  entry={entry}
                  isFirst={false}
                  isLast={false}
                  locale={params.locale}
                />
              ))}
              {privateEntries.length ? null : <div className="bg-white p-8 text-forest/60 shadow-soft">No private entries for this campaign.</div>}
            </section>
          </div>

          <form action={clearPublishedLeaderboard} className="mt-8 flex flex-wrap items-center gap-3 bg-white p-6 shadow-soft">
            <input name="locale" type="hidden" value={params.locale} />
            <input name="campaignSlug" type="hidden" value={campaignSlug} />
            <label className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <input name="confirmClear" type="checkbox" /> Confirm clearing published rankings for this campaign
            </label>
            <button className="focus-ring min-h-10 rounded-full border border-red-200 px-4 text-xs font-bold uppercase tracking-[0.14em] text-red-700" type="submit">
              Clear Published Rankings
            </button>
          </form>
        </div>
      </Section>
    </main>
  );
}
