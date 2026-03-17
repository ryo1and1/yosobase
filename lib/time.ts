const JST_ZONE = "Asia/Tokyo";

export function currentJstYear(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: JST_ZONE,
      year: "numeric"
    }).format(new Date())
  );
}

export function currentJstYearMonth(): { year: number; month: number } {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: JST_ZONE,
    year: "numeric",
    month: "2-digit"
  }).format(new Date());
  const [yearText, monthText] = formatted.split("-");
  return {
    year: Number.parseInt(yearText, 10),
    month: Number.parseInt(monthText, 10)
  };
}

export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: JST_ZONE }).format(new Date());
}

export function formatJstDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

export function formatJstDateTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function formatJstTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function toJstDateTimeLocalValue(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: JST_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(" ", "T");
}

export function getDateRangeJst(dateText: string): { startIso: string; endIso: string } {
  const start = new Date(`${dateText}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function minutesUntil(startAt: string): number {
  const now = Date.now();
  const target = new Date(startAt).getTime();
  return Math.floor((target - now) / 60000);
}
