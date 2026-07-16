function getLocalParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === '24' ? '0' : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function formatYmd(date: Date, timeZone: string): string {
  const p = getLocalParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

function zonedDateTimeToUtc(
  ymd: string,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let i = 0; i < 4; i += 1) {
    const local = getLocalParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    utc += target - asUtc;
  }

  return new Date(utc);
}

function startOfNextLocalDay(date: Date, timeZone: string): Date {
  const tomorrow = addDaysToYmd(formatYmd(date, timeZone), 1);
  return zonedDateTimeToUtc(tomorrow, timeZone, 0, 0, 0);
}

function nextDueFromTake(
  takenAt: Date,
  intervalDays: number,
  timeZone: string,
): Date {
  const takeDay = formatYmd(takenAt, timeZone);
  const dueDay = addDaysToYmd(takeDay, Math.max(1, intervalDays));
  return zonedDateTimeToUtc(dueDay, timeZone, 0, 0, 0);
}

function calendarDaysUntil(
  from: Date,
  to: Date,
  timeZone: string,
): number {
  const a = formatYmd(from, timeZone);
  const b = formatYmd(to, timeZone);
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, am - 1, ad);
  const end = Date.UTC(by, bm - 1, bd);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function localNowParts(timeZone: string) {
  return getLocalParts(new Date(), timeZone);
}

export {
  formatYmd,
  addDaysToYmd,
  zonedDateTimeToUtc,
  startOfNextLocalDay,
  nextDueFromTake,
  calendarDaysUntil,
  localNowParts,
  getLocalParts,
};
