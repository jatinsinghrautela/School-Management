import { localDate, parseDate } from "./dates.ts";
export type CalendarEntry = {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  kind?: string;
  cancelled?: boolean;
};
export function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1, 12),
    last = new Date(year, month + 1, 0, 12);
  return [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: last.getDate() }, (_, i) =>
      localDate(new Date(year, month, i + 1, 12)),
    ),
  ] as (string | null)[];
}
export function eventsOn(entries: CalendarEntry[], date: string) {
  return entries.filter(
    (e) =>
      !e.cancelled &&
      !!parseDate(e.startDate || "") &&
      !!parseDate(e.endDate || "") &&
      e.startDate! <= date &&
      e.endDate! >= date,
  );
}
export function monthEvents(
  entries: CalendarEntry[],
  year: number,
  month: number,
) {
  const start = localDate(new Date(year, month, 1, 12)),
    end = localDate(new Date(year, month + 1, 0, 12));
  return entries
    .filter(
      (e) =>
        !e.cancelled &&
        !!parseDate(e.startDate || "") &&
        !!parseDate(e.endDate || "") &&
        e.startDate! <= end &&
        e.endDate! >= start,
    )
    .sort((a, b) => a.startDate!.localeCompare(b.startDate!));
}
