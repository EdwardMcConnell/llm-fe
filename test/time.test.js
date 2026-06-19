import { describe, it, expect, vi } from 'vitest';
import { globalTime } from '../src/time.js';

describe('TimeManager (Phase 11)', () => {
  it('should parse local date input strictly into UTC', () => {
    // A raw string from <input type="date">
    const localDate = "2026-06-18";
    const utc = globalTime.fromLocalDateInput(localDate);
    
    // It should strictly be midnight UTC on that date
    expect(utc).toBe('2026-06-18T00:00:00.000Z');
  });

  it('should parse local datetime-local input strictly into UTC', () => {
    // A raw string from <input type="datetime-local">
    // Assume the user is in America/New_York (UTC-4) for this test if possible,
    // but Date(Y,M,D,h,m) uses the environment's timezone.
    const localDateTime = "2026-06-18T14:30";
    const utc = globalTime.fromLocalDateTimeInput(localDateTime);
    
    // We can't strictly assert the exact UTC string because Vitest runs in the host's timezone.
    // But we can assert it produces a valid ISO string.
    expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // The inverse should be close or identical
    const backToLocal = globalTime.toLocalDateTimeInput(utc);
    expect(backToLocal).toBe("2026-06-18T14:30");
  });

  it('should format UTC back to local date input safely', () => {
    // E.g. Midnight UTC should stay the same date regardless of timezone (usually)
    // Actually, converting a UTC midnight to local time might shift it back a day in America!
    // That's exactly why timezones are hard. globalTime handles this natively via Date() mapping.
    const utc = '2026-06-18T00:00:00.000Z';
    const local = globalTime.toLocalDateInput(utc);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should compute relative times', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-18T21:00:00Z'));

    const fiveMinsAgo = new Date('2026-06-18T20:55:00Z').toISOString();
    expect(globalTime.relativeTime(fiveMinsAgo)).toBe('5 mins ago');

    const oneHourAgo = new Date('2026-06-18T20:00:00Z').toISOString();
    expect(globalTime.relativeTime(oneHourAgo)).toBe('1 hour ago');

    vi.useRealTimers();
  });
});
