// Small date helpers for the content calendar (no external date lib).
export const DAY_MS = 86_400_000;
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function noon(ms: number): number {
  const d = new Date(ms);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function sameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.getTime();
}

export function startOfMonth(ms: number): number {
  const d = new Date(ms);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addMonths(ms: number, n: number): number {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
}

/** 42 cells (6 weeks) covering the month that contains `ms`. */
export function monthGrid(ms: number): number[] {
  const gridStart = startOfWeek(startOfMonth(ms));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function weekGrid(ms: number): number[] {
  const start = startOfWeek(ms);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const dayNum = (ms: number): number => new Date(ms).getDate();
export const isSameMonth = (ms: number, ref: number): boolean =>
  new Date(ms).getMonth() === new Date(ref).getMonth();
export const isToday = (ms: number): boolean => sameDay(ms, Date.now());

export const fmtMonth = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
export const fmtDayLong = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
export const fmtRangeWeek = (ms: number): string => {
  const s = startOfWeek(ms);
  const e = addDays(s, 6);
  return `${new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(e).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};
