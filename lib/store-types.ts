export type StoreHour = {
  id: string;
  store_id?: string;
  day_of_week: number;
  interval_no: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  status?: string;
  deleted_at?: string | null;
};

export type StoreHoursException = {
  id: string;
  store_id?: string;
  exception_date: string;
  interval_no: number;
  label: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export type PublicStore = {
  id: string;
  brand_id: string;
  public_slug: string;
  name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  country_code: string;
  postal_code: string | null;
  timezone: string;
  currency_code: string;
  phone: string | null;
  public_email: string | null;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  ordering_url: string | null;
  is_primary: boolean;
  store_operating_hours: StoreHour[];
  store_hours_exceptions: StoreHoursException[];
};

export function storeAddressLines(store: PublicStore) {
  return [store.address_line_1, store.address_line_2, `${store.city}${store.postal_code ? ` ${store.postal_code}` : ""}`].filter(Boolean) as string[];
}

export function storeDirectionsUrl(store: PublicStore) {
  if (store.map_url) return store.map_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddressLines(store).join(" "))}`;
}

export function storeMapEmbedUrl(store: PublicStore) {
  if (store.latitude !== null && store.longitude !== null) {
    return `https://www.google.com/maps?q=${store.latitude},${store.longitude}&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(storeAddressLines(store).join(" "))}&output=embed`;
}

export function formatStoreTime(value: string | null) {
  if (!value) return "";
  const [hourValue, minute] = value.split(":");
  const hour = Number(hourValue);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

export function publicWeeklyHours(store: PublicStore) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return [...store.store_operating_hours]
    .sort((a, b) => a.day_of_week - b.day_of_week || a.interval_no - b.interval_no)
    .map((hour) => ({
      ...hour,
      dayName: names[hour.day_of_week],
      display: hour.is_closed ? "Closed" : `${formatStoreTime(hour.opens_at)} – ${formatStoreTime(hour.closes_at)}`
    }));
}

export type WeeklyHoursEditorSafety = {
  safe: boolean;
  unsupportedDays: number[];
  hasMultipleIntervals: boolean;
  hasOvernightIntervals: boolean;
};

/** The Phase 1 editor must not submit schedules it cannot fully represent. */
export function assessWeeklyHoursEditorSafety(hours: StoreHour[], storeId?: string): WeeklyHoursEditorSafety {
  const currentRows = hours.filter((hour) =>
    (!storeId || !hour.store_id || hour.store_id === storeId)
    && hour.status !== "inactive"
    && hour.status !== "archived"
    && !hour.deleted_at
  );
  const multipleIntervalDays = currentRows
    .filter((hour) => hour.interval_no !== 1)
    .map((hour) => hour.day_of_week);
  const overnightDays = currentRows
    .filter((hour) => !hour.is_closed && Boolean(hour.opens_at) && Boolean(hour.closes_at) && hour.closes_at! <= hour.opens_at!)
    .map((hour) => hour.day_of_week);
  const unsupportedDays = [...new Set([...multipleIntervalDays, ...overnightDays])].sort((a, b) => a - b);

  return {
    safe: unsupportedDays.length === 0,
    unsupportedDays,
    hasMultipleIntervals: multipleIntervalDays.length > 0,
    hasOvernightIntervals: overnightDays.length > 0
  };
}

export type EffectiveStoreHours = {
  date: string;
  dayOfWeek: number;
  source: "weekly" | "exception" | "unconfigured";
  isClosed: boolean;
  intervals: Array<{
    id: string;
    intervalNo: number;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
    label: string | null;
  }>;
};

function storeLocalDate(targetDate: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(targetDate);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/** Resolve one outlet's effective schedule without flattening split or overnight intervals. */
export function resolveEffectiveStoreHours({
  storeId,
  timezone,
  targetDate,
  weeklyHours,
  exceptions
}: {
  storeId: string;
  timezone: string;
  targetDate: Date | string;
  weeklyHours: StoreHour[];
  exceptions: StoreHoursException[];
}): EffectiveStoreHours {
  const date = typeof targetDate === "string" ? targetDate : storeLocalDate(targetDate, timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Target date must use YYYY-MM-DD format.");
  const targetDay = dayOfWeek(date);
  const belongsToStore = (row: { store_id?: string }) => !row.store_id || row.store_id === storeId;
  const datedExceptions = exceptions
    .filter((row) => belongsToStore(row) && row.exception_date === date)
    .sort((a, b) => a.interval_no - b.interval_no);
  const sourceRows = datedExceptions.length
    ? datedExceptions
    : weeklyHours
      .filter((row) => belongsToStore(row) && row.day_of_week === targetDay)
      .sort((a, b) => a.interval_no - b.interval_no);
  const source = datedExceptions.length ? "exception" : sourceRows.length ? "weekly" : "unconfigured";
  const intervals = sourceRows.map((row) => ({
    id: row.id,
    intervalNo: row.interval_no,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
    label: "label" in row ? row.label : null
  }));

  return {
    date,
    dayOfWeek: targetDay,
    source,
    isClosed: intervals.length > 0 && intervals.every((interval) => interval.isClosed),
    intervals
  };
}

export function effectiveStoreHoursForDate(store: PublicStore, targetDate: Date | string = new Date()) {
  return resolveEffectiveStoreHours({
    storeId: store.id,
    timezone: store.timezone,
    targetDate,
    weeklyHours: store.store_operating_hours,
    exceptions: store.store_hours_exceptions
  });
}

export function formatEffectiveStoreHours(hours: EffectiveStoreHours) {
  if (hours.source === "unconfigured") return "";
  if (hours.isClosed) return "Closed";
  return hours.intervals
    .filter((interval) => !interval.isClosed)
    .map((interval) => `${formatStoreTime(interval.opensAt)} – ${formatStoreTime(interval.closesAt)}`)
    .join(", ");
}
