const MS_PER_DAY = 86_400_000;

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODateUTCNoon(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function formatLocalDateFromParts(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const dt = parseISODateUTCNoon(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffDaysISO(startISO: string, endISO: string): number {
  const d1 = parseISODateUTCNoon(startISO).getTime();
  const d2 = parseISODateUTCNoon(endISO).getTime();
  return Math.round((d2 - d1) / MS_PER_DAY);
}

export function formatDisplayDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  const dt = parseISODateUTCNoon(iso);
  return dt.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatShortDate(iso: string): string {
  const dt = parseISODateUTCNoon(iso);
  return dt.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYear(year: number, monthIndex0: number): string {
  const dt = new Date(Date.UTC(year, monthIndex0, 15, 12, 0, 0));
  return dt.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthGridDays(year: number, monthIndex0: number): {
  iso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
}[] {
  const firstDay = new Date(Date.UTC(year, monthIndex0, 1, 12, 0, 0));
  const startWeekday = firstDay.getUTCDay(); // 0 = Sun
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0, 12, 0, 0)).getUTCDate();

  const cells: { iso: string; dayOfMonth: number; inCurrentMonth: boolean }[] = [];

  // Leading days from previous month
  const firstISO = formatLocalDateFromParts(year, monthIndex0, 1);
  for (let i = startWeekday; i > 0; i--) {
    const iso = addDaysISO(firstISO, -i);
    const dayNum = Number(iso.split('-')[2]);
    cells.push({ iso, dayOfMonth: dayNum, inCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: formatLocalDateFromParts(year, monthIndex0, d),
      dayOfMonth: d,
      inCurrentMonth: true,
    });
  }

  // Trailing days to complete 6 rows (42 cells) or 5 rows (35 cells)
  const totalNeeded = cells.length <= 35 ? 35 : 42;
  const lastISO = cells[cells.length - 1].iso;
  let offset = 1;
  while (cells.length < totalNeeded) {
    const iso = addDaysISO(lastISO, offset);
    const dayNum = Number(iso.split('-')[2]);
    cells.push({ iso, dayOfMonth: dayNum, inCurrentMonth: false });
    offset++;
  }

  return cells;
}
