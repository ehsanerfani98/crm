/**
 * Persian/Jalali date and number utilities.
 * Pure helpers — safe to use on both client and server.
 */
import {
  toJalaali,
  toGregorian,
  jalaaliMonthLength,
  isValidJalaaliDate,
} from "jalaali-js";

/** Convert latin digits to Persian digits. */
export function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return String(input).replace(/[0-9]/g, (d) => persian[Number(d)]);
}

/** Convert Persian/Arabic digits to Latin digits. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Format a number with thousand separators, in Persian digits. */
export function formatNumber(n: number | null | undefined, options?: { digits?: boolean }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("en-US").format(n);
  return options?.digits === false ? formatted : toPersianDigits(formatted);
}

/** Format currency in Rial with Persian digits. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${formatNumber(Math.round(amount))} تومان`;
}

/** Format currency in Toman (compact for large numbers). */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${formatNumber((amount / 1_000_000_000).toFixed(1))} میلیارد ت`;
  if (abs >= 1_000_000) return `${formatNumber((amount / 1_000_000).toFixed(1))} میلیون ت`;
  if (abs >= 1_000) return `${formatNumber(Math.round(amount / 1_000))} هزار ت`;
  return `${formatNumber(Math.round(amount))} ت`;
}

export type JalaliDate = {
  jy: number;
  jm: number;
  jd: number;
};

/** Convert a Date to a Jalali object. */
export function toJalali(date: Date): JalaliDate {
  return toJalaali(date);
}

/** Convert a Jalali date to a JS Date. */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd);
}

export const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export const PERSIAN_WEEKDAYS = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
export const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** Get the Persian weekday index (Saturday=0, Friday=6) from a Date. */
export function persianWeekday(date: Date): number {
  // JS: Sunday=0 ... Saturday=6
  // Persian week starts Saturday=0
  const map = [1, 2, 3, 4, 5, 6, 0]; // index by JS getDay()
  return map[date.getDay()];
}

/** Format a Date to "۱۴۰۳/۰۹/۱۴" style Persian date string. */
export function formatDate(date: Date | string | null | undefined, withTime = false): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const { jy, jm, jd } = toJalali(d);
  const datePart = `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, "0"))}/${toPersianDigits(String(jd).padStart(2, "0"))}`;
  if (!withTime) return datePart;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} - ${toPersianDigits(`${hh}:${mm}`)}`;
}

/** Format a Date to relative time in Persian (e.g. "۳ ساعت پیش"). */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "لحظاتی پیش";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toPersianDigits(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${toPersianDigits(day)} روز پیش`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${toPersianDigits(month)} ماه پیش`;
  const year = Math.floor(month / 12);
  return `${toPersianDigits(year)} سال پیش`;
}

/** Format a Date to "جمعه ۱۴ شهریور ۱۴۰۳" style Persian long date. */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const { jy, jm, jd } = toJalali(d);
  return `${PERSIAN_WEEKDAYS[persianWeekday(d)]} ${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/** Format time only: "۱۴:۳۰" */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${hh}:${mm}`);
}

/** Get start of day (00:00:00) for a given Date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day (23:59:59.999) for a given Date. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get the Saturday that starts the Persian week containing the given date. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const wd = persianWeekday(d); // 0=Sat
  d.setDate(d.getDate() - wd);
  return d;
}

/** Get the Friday that ends the Persian week containing the given date. */
export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

/** Get start of Jalali month. */
export function startOfMonth(date: Date): Date {
  const j = toJalali(date);
  return fromJalali(j.jy, j.jm, 1);
}

/** Get end of Jalali month. */
export function endOfMonth(date: Date): Date {
  const j = toJalali(date);
  const daysInMonth = jalaaliMonthLength(j.jy, j.jm);
  const last = fromJalali(j.jy, j.jm, daysInMonth);
  return endOfDay(last);
}

/** Get a date X days ago. */
export function daysAgo(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

/** Get a date X days in the future. */
export function daysFromNow(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** Build a Jalali YYYY/MM/DD string for an input of type date (latin). */
export function gregorianDateStringToJalali(greg: string): string {
  if (!greg) return "";
  const d = new Date(greg);
  if (Number.isNaN(d.getTime())) return "";
  const { jy, jm, jd } = toJalali(d);
  return `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, "0"))}/${toPersianDigits(String(jd).padStart(2, "0"))}`;
}

/** Parse a Jalali date string (1403/09/14) into a JS Date at local midnight. */
export function parseJalali(input: string): Date | null {
  const cleaned = toLatinDigits(input).replace(/[\\/\-.]/g, "/");
  const parts = cleaned.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  const [jy, jm, jd] = parts;
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  return fromJalali(jy, jm, jd);
}

/** Returns today's Jalali long date. */
export function todayLong(): string {
  return formatDateLong(new Date());
}

/** Returns today's Jalali short date. */
export function todayShort(): string {
  return formatDate(new Date());
}
