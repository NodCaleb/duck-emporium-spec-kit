import Database from 'better-sqlite3';

/**
 * Opens (or creates) a SQLite database.
 * When path is ':memory:' or NODE_ENV is 'test', an in-memory DB is returned.
 * File-based instances have WAL mode enabled for better concurrent read performance.
 *
 * @param {string} dbPath - Filesystem path or ':memory:'
 * @returns {import('better-sqlite3').Database}
 */
export function openDatabase(dbPath) {
  const useMemory = dbPath === ':memory:' || process.env.NODE_ENV === 'test';
  const db = new Database(useMemory ? ':memory:' : dbPath);

  if (!useMemory) {
    db.pragma('journal_mode = WAL');
  }

  return db;
}
