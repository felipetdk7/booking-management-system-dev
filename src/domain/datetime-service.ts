import { toZonedTime, format } from "date-fns-tz";

const TIME_ZONE = "America/Bogota";

export class DateTimeService {
  /**
   * Returns the parts of the date in America/Bogota timezone.
   */
  static getBogotaParts(date: Date) {
    const zoned = toZonedTime(date, TIME_ZONE);
    return {
      year: zoned.getFullYear(),
      month: zoned.getMonth() + 1, // 1-indexed
      day: zoned.getDate(),
      hours: zoned.getHours(),
      minutes: zoned.getMinutes(),
      dayOfWeek: zoned.getDay(), // 0 = Sunday, 1 = Monday, etc.
    };
  }

  /**
   * Checks if a date is Sunday in America/Bogota timezone.
   */
  static isSunday(date: Date): boolean {
    const parts = this.getBogotaParts(date);
    return parts.dayOfWeek === 0;
  }

  /**
   * Checks if the reservation timeframe is within operating hours (07:00 - 19:00 Bogotá time).
   * Note: The service duration might cause the reservation to end after 19:00.
   * Both start and end must be within 07:00 and 19:00.
   */
  static isWithinOperatingHours(start: Date, end: Date): boolean {
    const startParts = this.getBogotaParts(start);
    const endParts = this.getBogotaParts(end);

    // Start time must be >= 07:00 and <= 19:00
    const startMinutes = startParts.hours * 60 + startParts.minutes;
    const endMinutes = endParts.hours * 60 + endParts.minutes;

    const limitStart = 7 * 60; // 07:00
    const limitEnd = 19 * 60;  // 19:00

    // Check if start is within bounds
    if (startMinutes < limitStart || startMinutes > limitEnd) {
      return false;
    }

    // Check if end is within bounds
    if (endMinutes < limitStart || endMinutes > limitEnd) {
      return false;
    }

    // Also check if the end date is on a different day (cross-day is not allowed)
    if (
      startParts.year !== endParts.year ||
      startParts.month !== endParts.month ||
      startParts.day !== endParts.day
    ) {
      return false;
    }

    return true;
  }

  /**
   * Returns difference in hours between two dates.
   */
  static getHoursDifference(from: Date, to: Date): number {
    return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Formats a date under America/Bogota timezone.
   */
  static formatBogota(date: Date, formatStr: string = "yyyy-MM-dd HH:mm:ss"): string {
    return format(date, formatStr, { timeZone: TIME_ZONE });
  }

  /**
   * Parse a local date string (interpreted as America/Bogota local time) to a UTC Date.
   * If string contains an offset (like 'Z' or '-05:00'), it respects the offset.
   * If it doesn't, it parses it as America/Bogota local time.
   */
  static parseToBogotaUTC(dateStr: string): Date {
    // Check if it has a timezone specifier
    const hasTimezone = /Z|([+-]\d{2}:?\d{2})$/i.test(dateStr);
    if (hasTimezone) {
      return new Date(dateStr);
    }

    // If no timezone is specified, parse as America/Bogota local time
    // We can parse with timezone option in date-fns-tz, or append the Bogota offset (-05:00)
    // Bogota offset is UTC-5
    // Normalize format to ISO-like first if needed
    let normalized = dateStr;
    if (dateStr.includes(" ")) {
      normalized = dateStr.replace(" ", "T");
    }

    // Check if we need to append offset
    if (!normalized.includes("T")) {
      // It's just a date, e.g. "2026-06-20", default to start of day
      normalized = normalized + "T00:00:00";
    }

    // Append Bogota offset (UTC-5)
    return new Date(normalized + "-05:00");
  }
}
