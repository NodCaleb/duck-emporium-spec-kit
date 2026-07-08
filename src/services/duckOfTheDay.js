import { stockLabel } from './catalog.js';

/**
 * Returns the day-of-year for the given date (1 = Jan 1, 366 = Dec 31 leap year).
 *
 * @param {Date} date
 * @returns {number} integer 1–366
 */
export function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Returns the featured duck for the given date using the formula:
 *   eligibleDucks[(getDayOfYear(date) - 1) % eligibleDucks.length]
 *
 * Eligible ducks are those with stock > 0, ordered by id ASC.
 * Returns null when no eligible ducks exist.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {Date} [date]
 * @returns {object|null}
 */
export function getDuckOfTheDay(db, date = new Date()) {
  const rows = db
    .prepare('SELECT * FROM ducks WHERE stock > 0 ORDER BY id ASC')
    .all();

  if (rows.length === 0) return null;

  const index = (getDayOfYear(date) - 1) % rows.length;
  const row = rows[index];

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    tagline: row.tagline,
    description: row.description,
    personalityTraits: JSON.parse(row.personality_traits),
    stock: row.stock,
    stockLabel: stockLabel(row.stock),
  };
}
