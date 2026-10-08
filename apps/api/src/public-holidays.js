import Holidays from "date-holidays";
import { india2026 } from "./india-holidays-2026.js";
const catalog = new Holidays();
export const holidayCountries = () => catalog.getCountries("en");
export const holidayStates = (country) =>
  catalog.getStates(country, "en") || {};
export const holidayRegions = (country, state) =>
  catalog.getRegions(country, state, "en") || {};
export function holidayPreferences(input) {
  const country = input.country || "",
    state = input.state || "",
    region = input.region || "",
    publicHolidays = input.publicHolidays ?? false;
  const invalid = () => {
    throw Object.assign(
      new Error("Choose a supported country and region for public holidays"),
      { status: 400 },
    );
  };
  if (
    typeof publicHolidays !== "boolean" ||
    typeof country !== "string" ||
    typeof state !== "string" ||
    typeof region !== "string"
  )
    invalid();
  if (
    (publicHolidays && !country) ||
    (country && !Object.hasOwn(holidayCountries(), country)) ||
    (state && (!country || !Object.hasOwn(holidayStates(country), state))) ||
    (region &&
      (!state || !Object.hasOwn(holidayRegions(country, state), region)))
  )
    invalid();
  return { publicHolidays, country, state, region };
}
export function publicHolidayDates(prefs) {
  const map = new Map();
  if (!prefs.country) return map;
  const h = new Holidays(
    prefs.country,
    prefs.state || undefined,
    prefs.region || undefined,
    { languages: ["en"], types: ["public"] },
  );
  for (const item of h
    .getHolidays(prefs.year)
    .filter((h) => h.type === "public")) {
    // Use local calendar dates, not UTC instants, and expand multi-day holidays.
    const date = item.date.slice(0, 10),
      duration = Math.max(1, Math.round((item.end - item.start) / 86400000));
    for (let n = 0; n < duration; n++) {
      const d = new Date(`${date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      const key = d.toISOString().slice(0, 10);
      if (!key.startsWith(`${prefs.year}-`)) continue;
      const names = map.get(key) || [];
      if (!names.includes(item.name)) names.push(item.name);
      map.set(key, names);
    }
  }
  if (prefs.country === "IN" && prefs.year === 2026)
    for (const [date, name] of india2026) {
      const names = map.get(date) || [];
      if (!names.includes(name)) names.push(name);
      map.set(date, names);
    }
  return map;
}
