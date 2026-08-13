export const MAX_DASHBOARD_RANGE_YEARS = 10;

export interface DashboardTimeBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  intervalLabel: string;
}

export function dashboardMaxEndDate(startDate: string): string {
  const start = parseInputDate(startDate);
  return isValidDate(start)
    ? toInputDate(addCalendarYears(start, MAX_DASHBOARD_RANGE_YEARS))
    : startDate;
}

export function buildDashboardTimeBuckets(
  startDate: string,
  endDate: string,
): DashboardTimeBucket[] {
  const rangeStart = startOfDay(parseInputDate(startDate));
  const rangeEnd = endOfDay(parseInputDate(endDate));

  if (
    !isValidDate(rangeStart) ||
    !isValidDate(rangeEnd) ||
    rangeStart > rangeEnd ||
    rangeEnd > endOfDay(addCalendarYears(rangeStart, MAX_DASHBOARD_RANGE_YEARS))
  ) {
    return [];
  }

  const totalDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
  if (totalDays < 31 && !isFullCalendarMonth(rangeStart, rangeEnd)) {
    return buildDayBuckets(rangeStart, rangeEnd, 10);
  }

  const totalMonths =
    (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12 +
    rangeEnd.getMonth() -
    rangeStart.getMonth() +
    1;
  const intervalMonths = totalMonths <= 6 ? 1 : totalMonths <= 12 ? 3 : totalMonths < 36 ? 6 : 12;

  return intervalMonths === 12
    ? buildYearBuckets(rangeStart, rangeEnd)
    : buildMonthBuckets(rangeStart, rangeEnd, intervalMonths);
}

function buildDayBuckets(start: Date, end: Date, intervalDays: number): DashboardTimeBucket[] {
  const buckets: DashboardTimeBucket[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    const bucketEnd = new Date(
      Math.min(end.getTime(), endOfDay(addDays(cursor, intervalDays - 1)).getTime()),
    );
    buckets.push({
      key: `${toInputDate(cursor)}:${toInputDate(bucketEnd)}`,
      label: formatDayRange(cursor, bucketEnd),
      start: cursor,
      end: bucketEnd,
      intervalLabel: 'Every 10 days',
    });
    cursor = addDays(startOfDay(bucketEnd), 1);
  }

  return buckets;
}

function buildMonthBuckets(start: Date, end: Date, intervalMonths: number): DashboardTimeBucket[] {
  const buckets: DashboardTimeBucket[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + intervalMonths, 1);
    const bucketEnd = new Date(Math.min(end.getTime(), endOfDay(addDays(nextMonth, -1)).getTime()));
    buckets.push({
      key: `${toInputDate(cursor)}:${toInputDate(bucketEnd)}`,
      label: formatMonthRange(cursor, bucketEnd),
      start: cursor,
      end: bucketEnd,
      intervalLabel: monthIntervalLabel(intervalMonths),
    });
    cursor = nextMonth;
  }

  return buckets;
}

function buildYearBuckets(start: Date, end: Date): DashboardTimeBucket[] {
  const buckets: DashboardTimeBucket[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const bucketEnd = new Date(
      Math.min(end.getTime(), endOfDay(new Date(year, 11, 31)).getTime()),
    );
    buckets.push({
      key: `${toInputDate(cursor)}:${toInputDate(bucketEnd)}`,
      label: String(year),
      start: cursor,
      end: bucketEnd,
      intervalLabel: 'Yearly',
    });
    cursor = startOfDay(new Date(year + 1, 0, 1));
  }

  return buckets;
}

function monthIntervalLabel(intervalMonths: number): string {
  if (intervalMonths === 1) return 'Monthly';
  if (intervalMonths === 3) return 'Every 3 months';
  if (intervalMonths === 6) return 'Every 6 months';
  return 'Yearly';
}

function formatMonthRange(start: Date, end: Date): string {
  const month = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' });
  const shortYear = (date: Date) => String(date.getFullYear()).slice(-2);

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${month(start)} ’${shortYear(start)}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${month(start)}–${month(end)} ’${shortYear(end)}`;
  }
  return `${month(start)} ’${shortYear(start)}–${month(end)} ’${shortYear(end)}`;
}

function formatDayRange(start: Date, end: Date): string {
  const format = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${day} ${month} ’${String(date.getFullYear()).slice(-2)}`;
  };
  return `${format(start)}–${format(end)}`;
}

function isFullCalendarMonth(start: Date, end: Date): boolean {
  const finalDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return (
    start.getDate() === 1 &&
    end.getDate() === finalDay &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  );
}

function parseInputDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addCalendarYears(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years;
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
