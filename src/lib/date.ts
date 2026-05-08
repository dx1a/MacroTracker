const TZ_KEY = "preferredTimezone";

export function getPreferredTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

export function setPreferredTimezone(tz: string) {
  try {
    localStorage.setItem(TZ_KEY, tz);
  } catch {}
}

// Returns YYYY-MM-DD in the preferred (or system) timezone
export function localDateStr(tz?: string): string {
  const timezone = tz ?? getPreferredTimezone();
  // en-CA locale formats dates as YYYY-MM-DD natively
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
