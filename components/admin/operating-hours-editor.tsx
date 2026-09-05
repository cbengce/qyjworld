import { saveWeeklyHours } from "@/app/[locale]/admin/stores/actions";
import { assessWeeklyHoursEditorSafety } from "@/lib/store-types";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OperatingHoursEditor({ locale, storeId, hours, canEdit }: { locale: string; storeId: string; hours: any[]; canEdit: boolean }) {
  const safety = assessWeeklyHoursEditorSafety(hours, storeId);
  const editorEnabled = canEdit && safety.safe;
  const byDay = new Map(hours.filter((hour) => hour.interval_no === 1).map((hour) => [hour.day_of_week, hour]));
  return <form action={saveWeeklyHours} className="bg-white p-6 shadow-soft">
    <input name="locale" type="hidden" value={locale} /><input name="storeId" type="hidden" value={storeId} />
    <h2 className="font-serif text-3xl text-forest">Weekly operating hours</h2>
    <p className="mt-2 text-sm text-forest/60">No hours are published until saved. Phase 1A.1 supports one same-day interval per day; the database is ready for future split and overnight intervals.</p>
    {!safety.safe && <p className="mt-4 border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900" role="alert">Advanced schedule data exists for {safety.unsupportedDays.map((day) => days[day]).join(", ")}. This editor is locked so split or overnight hours cannot be overwritten.</p>}
    <div className="mt-6 grid gap-3">
      {days.map((day, index) => { const current = byDay.get(index); return <div className="grid items-center gap-3 border-b border-forest/10 py-3 sm:grid-cols-[8rem_1fr_1fr_auto]" key={day}>
        <strong>{day}</strong>
        <input aria-label={`${day} opens`} className="min-h-11 border border-forest/15 px-3" disabled={!editorEnabled} name={`opens-${index}`} type="time" defaultValue={current?.opens_at?.slice(0, 5) ?? ""} />
        <input aria-label={`${day} closes`} className="min-h-11 border border-forest/15 px-3" disabled={!editorEnabled} name={`closes-${index}`} type="time" defaultValue={current?.closes_at?.slice(0, 5) ?? ""} />
        <label className="flex items-center gap-2"><input disabled={!editorEnabled} name={`closed-${index}`} type="checkbox" defaultChecked={current?.is_closed ?? false} /> Closed</label>
      </div>; })}
    </div>
    {editorEnabled && <button className="mt-6 min-h-12 bg-forest px-6 font-bold text-white" type="submit">Save operating hours</button>}
  </form>;
}
