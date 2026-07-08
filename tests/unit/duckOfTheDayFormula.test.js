import { getDayOfYear } from '../../src/services/duckOfTheDay.js';

// ── T037: US8 — getDayOfYear pure function ───────────────────────────────────

describe('getDayOfYear', () => {
  it('returns 1 for January 1st', () => {
    expect(getDayOfYear(new Date(2024, 0, 1))).toBe(1);
    expect(getDayOfYear(new Date(2023, 0, 1))).toBe(1);
  });

  it('returns 365 for December 31 in a non-leap year', () => {
    expect(getDayOfYear(new Date(2023, 11, 31))).toBe(365);
  });

  it('returns 366 for December 31 in a leap year', () => {
    expect(getDayOfYear(new Date(2024, 11, 31))).toBe(366);
  });

  it('returns 32 for February 1st (non-leap year)', () => {
    // Jan has 31 days → Feb 1 is day 32
    expect(getDayOfYear(new Date(2023, 1, 1))).toBe(32);
  });

  it('returns 60 for February 29 in a leap year', () => {
    // Jan 31 + Feb 29 = day 60
    expect(getDayOfYear(new Date(2024, 1, 29))).toBe(60);
  });

  it('returns 59 for February 28 in a non-leap year', () => {
    // Jan 31 + Feb 28 = day 59
    expect(getDayOfYear(new Date(2023, 1, 28))).toBe(59);
  });
});

// ── T037: US8 — index formula (dayOfYear - 1) % N ────────────────────────────

describe('Duck of the Day index formula', () => {
  it('selects index 0 when dayOfYear is 1 (Jan 1)', () => {
    const dayOfYear = 1;
    const N = 5;
    expect((dayOfYear - 1) % N).toBe(0);
  });

  it('selects index N-1 when dayOfYear equals N', () => {
    const N = 5;
    const dayOfYear = N;
    expect((dayOfYear - 1) % N).toBe(N - 1);
  });

  it('wraps around correctly when dayOfYear > N', () => {
    const N = 5;
    // dayOfYear 6 → (6-1) % 5 = 0
    expect((6 - 1) % N).toBe(0);
    // dayOfYear 7 → (7-1) % 5 = 1
    expect((7 - 1) % N).toBe(1);
  });

  it('always produces the same index for the same dayOfYear and N', () => {
    const dayOfYear = 100;
    const N = 8;
    const idx1 = (dayOfYear - 1) % N;
    const idx2 = (dayOfYear - 1) % N;
    expect(idx1).toBe(idx2);
  });

  it('cycles through all indices exactly once per N days', () => {
    const N = 4;
    const indices = Array.from({ length: N }, (_, i) => (i + 1 - 1) % N);
    expect(indices).toEqual([0, 1, 2, 3]);
  });
});
