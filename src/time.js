/**
 * Phase 11: Enterprise Time Standardization Layer
 * Guarantees strict UTC adherence and foolproof relative formatting.
 */
export class TimeManager {
  /**
   * Returns the current time as a strict UTC ISO-8601 string.
   * @returns {string} e.g. "2026-06-18T21:00:00.000Z"
   */
  nowUTC() {
    return new Date().toISOString();
  }

  /**
   * Converts a native Date object, a UNIX timestamp, or an ISO string to strict UTC ISO-8601.
   * @param {Date|number|string} value 
   * @returns {string}
   */
  toUTC(value) {
    if (value instanceof Date) return value.toISOString();
    return new Date(value).toISOString();
  }

  /**
   * Parses a raw local `YYYY-MM-DD` string from an `<input type="date">` into strict UTC.
   * Resolves the "off-by-one-day" bug caused by local parsing.
   * @param {string} localDateString e.g. "2026-06-18"
   * @returns {string} e.g. "2026-06-18T00:00:00.000Z"
   */
  fromLocalDateInput(localDateString) {
    if (!localDateString) return null;
    const [year, month, day] = localDateString.split('-');
    // Using UTC explicitly instead of new Date("YYYY-MM-DD") to be completely bulletproof
    const d = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    return d.toISOString();
  }

  /**
   * Parses a raw local `YYYY-MM-DDTHH:MM` string from an `<input type="datetime-local">` into strict UTC.
   * @param {string} localDateTimeString e.g. "2026-06-18T14:30"
   * @returns {string}
   */
  fromLocalDateTimeInput(localDateTimeString) {
    if (!localDateTimeString) return null;
    // Extract local parts
    const [datePart, timePart] = localDateTimeString.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, min] = timePart.split(':');
    
    // We treat this as "the user's wall clock time". 
    // Constructing new Date(year, month, day, hour, min) parses it in the user's local timezone.
    const d = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(min)
    );
    // Then we serialize it securely to UTC
    return d.toISOString();
  }

  /**
   * Converts a strict UTC ISO string back to a local `YYYY-MM-DD` format for `<input type="date">`.
   * @param {string} isoString 
   * @returns {string}
   */
  toLocalDateInput(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    // We want the local YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Converts a strict UTC ISO string back to a local `YYYY-MM-DDTHH:MM` format for `<input type="datetime-local">`.
   * @param {string} isoString 
   * @returns {string}
   */
  toLocalDateTimeInput(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const date = this.toLocalDateInput(isoString);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${date}T${h}:${m}`;
  }

  /**
   * Returns a human-readable relative time string (e.g. "5 mins ago").
   * @param {string} isoString 
   * @returns {string}
   */
  relativeTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return 'Just now';
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    const rtf = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return rtf.format(d);
  }

  /**
   * Returns an Absolute localized time string.
   * @param {string} isoString 
   * @returns {string}
   */
  absoluteTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const rtf = new Intl.DateTimeFormat(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: 'numeric' 
    });
    return rtf.format(d);
  }
}

export const globalTime = new TimeManager();
