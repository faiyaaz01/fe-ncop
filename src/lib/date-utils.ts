export type SupportedTimezone = "LOCAL" | "IST" | "PT" | "UTC" | "ET";

export const TIMEZONE_OPTIONS: { value: SupportedTimezone; label: string; timeZone?: string }[] = [
  { value: "LOCAL", label: "Local Time" },
  { value: "IST", label: "IST (India Standard Time)", timeZone: "Asia/Kolkata" },
  { value: "PT", label: "PT (Pacific Time)", timeZone: "America/Los_Angeles" },
  { value: "ET", label: "ET (Eastern Time)", timeZone: "America/New_York" },
  { value: "UTC", label: "UTC (Coordinated Universal)", timeZone: "UTC" },
];

/**
 * Format an ISO date or timestamp into a readable date string in the chosen timezone
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  tz: SupportedTimezone = "LOCAL"
): string {
  if (!dateInput) return "—";

  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";

    const tzOption = TIMEZONE_OPTIONS.find((t) => t.value === tz);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };

    if (tzOption?.timeZone) {
      options.timeZone = tzOption.timeZone;
      options.timeZoneName = "short";
    } else {
      options.timeZoneName = "short";
    }

    return new Intl.DateTimeFormat("en-IN", options).format(d);
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Short date format without seconds (e.g. 19 Aug 2026, 11:08 AM)
 */
export function formatShortDateTime(
  dateInput: string | number | Date | null | undefined,
  tz: SupportedTimezone = "LOCAL"
): string {
  if (!dateInput) return "—";

  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";

    const tzOption = TIMEZONE_OPTIONS.find((t) => t.value === tz);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    if (tzOption?.timeZone) {
      options.timeZone = tzOption.timeZone;
      options.timeZoneName = "short";
    } else {
      options.timeZoneName = "short";
    }

    return new Intl.DateTimeFormat("en-IN", options).format(d);
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Get timezone abbreviation for the current browser environment
 */
export function getLocalTimezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}
