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

  if (isSameMonth(rangeStart, rangeEnd)) {
    return buildWeeklyBuckets(rangeStart, rangeEnd).map((bucket) => ({
      ...bucket,
      intervalLabel: 'Weekly',
    }));
  }

  const totalMonths =
    (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12 +
    rangeEnd.getMonth() -
    rangeStart.getMonth() +
    1;
  const intervalMonths = totalMonths <= 12 ? 1 : totalMonths <= 36 ? 3 : totalMonths <= 72 ? 6 : 12;

  const firstMonthEnd = endOfDay(new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0));
  const lastMonthStart = startOfDay(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1));
  const firstMonthBuckets = buildWeeklyBuckets(rangeStart, firstMonthEnd);
  const lastMonthBuckets = buildWeeklyBuckets(lastMonthStart, rangeEnd);
  const middleStart = startOfDay(new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1));
  const middleEnd = endOfDay(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 0));
  const middleBuckets =
    middleStart <= middleEnd ? buildMonthBuckets(middleStart, middleEnd, intervalMonths) : [];
  const intervalLabel = middleBuckets.length
    ? `Weekly first/last month · ${monthIntervalLabel(intervalMonths)} middle`
    : 'Weekly by month';

  return [...firstMonthBuckets, ...middleBuckets, ...lastMonthBuckets].map((bucket) => ({
    ...bucket,
    intervalLabel,
  }));
}

function buildWeeklyBuckets(start: Date, end: Date): DashboardTimeBucket[] {
  const buckets: DashboardTimeBucket[] = [];
  let cursor = startOfDay(start);

  while (cursor <= end) {
    const weekNumber = Math.floor((cursor.getDate() - 1) / 7) + 1;
    const calendarWeekEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      Math.min(weekNumber * 7, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()),
    );
    const bucketEnd = new Date(Math.min(end.getTime(), endOfDay(calendarWeekEnd).getTime()));
    buckets.push({
      key: `${toInputDate(cursor)}:${toInputDate(bucketEnd)}`,
      label: formatWeekLabel(cursor, weekNumber),
      start: cursor,
      end: bucketEnd,
      intervalLabel: 'Weekly',
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

function monthIntervalLabel(intervalMonths: number): string {
  if (intervalMonths === 1) return 'Monthly';
  if (intervalMonths === 3) return 'Every 3 months';
  if (intervalMonths === 6) return 'Every 6 months';
  return 'Yearly';
}

function isSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function formatWeekLabel(date: Date, weekNumber: number): string {
  const month = date.toLocaleDateString('en-MY', { month: 'short' });
  const shortYear = String(date.getFullYear()).slice(-2);
  return `${month} ’${shortYear} – Week ${weekNumber}`;
}

function formatMonthRange(start: Date, end: Date): string {
  const month = (date: Date) => date.toLocaleDateString('en-MY', { month: 'short' });
  const shortYear = (date: Date) => String(date.getFullYear()).slice(-2);

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${month(start)} ’${shortYear(start)}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${month(start)}–${month(end)} ’${shortYear(end)}`;
  }
  return `${month(start)} ’${shortYear(start)}–${month(end)} ’${shortYear(end)}`;
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
