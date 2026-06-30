type DateInput = string | number | Date | null | undefined;

const locale = "ar-SA";
const baseOptions: Intl.DateTimeFormatOptions = { calendar: "gregory" };
const minute = 60 * 1000;
const day = 24 * 60 * minute;

function toDate(value: DateInput) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatAppDate(value: DateInput, fallback = "غير محدد") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatAppTime(value: DateInput, fallback = "غير محدد") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAppDateTime(value: DateInput, fallback = "غير محدد") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAppFullDateTime(value: DateInput, fallback = "غير محدد") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAppRelativeTime(value: DateInput, fallback = "غير محدد") {
  const date = toDate(value);
  if (!date) return fallback;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return "الآن";
  if (diffSeconds < 3600) return `منذ ${Math.floor(diffSeconds / 60)} د`;
  if (diffSeconds < 86400) return `منذ ${Math.floor(diffSeconds / 3600)} س`;
  return `منذ ${Math.floor(diffSeconds / 86400)} يوم`;
}

export function formatAppDateRange(start: DateInput, end: DateInput, fallback = "غير محدد") {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate && !endDate) return fallback;
  if (startDate && !endDate) return `من ${formatAppDate(startDate)}`;
  if (!startDate && endDate) return `حتى ${formatAppDate(endDate)}`;
  return `${formatAppDate(startDate)} - ${formatAppDate(endDate)}`;
}

export function toDateInputValue(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateTimeLocalValue(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fromDateInputValue(value: string | null | undefined, boundary: "start" | "end" = "start") {
  if (!value) return null;
  const time = boundary === "end" ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fromDateAndTimeValues(dateValue: string | null | undefined, timeValue: string | null | undefined) {
  if (!dateValue) return null;
  const time = timeValue || "00:00";
  const date = new Date(`${dateValue}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeAppDateRange(start: string | null | undefined, end: string | null | undefined) {
  const startIso = fromDateInputValue(start, "start");
  const endIso = fromDateInputValue(end, "end");
  if (startIso && endIso && new Date(startIso).getTime() > new Date(endIso).getTime()) {
    return { startIso: endIso, endIso: startIso };
  }
  return { startIso, endIso };
}

export function addAppDays(value: DateInput, amount: number) {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getTime() + amount * day);
}
