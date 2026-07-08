/**
 * Runs all CREATE TABLE IF NOT EXISTS migrations against the provided database.
 * Safe to call on every startup — idempotent.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ducks (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL UNIQUE,
      category         TEXT    NOT NULL CHECK (category IN (
                         'Debugging Ducks',
                         'Philosopher Ducks',
                         'Maritime Ducks',
                         'Wellness Ducks',
                         'Limited Editions'
                       )),
      price            REAL    NOT NULL CHECK (price > 0),
      tagline          TEXT    NOT NULL,
      description      TEXT    NOT NULL,
      personality_traits TEXT  NOT NULL,
      stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id               TEXT    PRIMARY KEY,
      shipping_name    TEXT    NOT NULL,
      shipping_email   TEXT    NOT NULL,
      shipping_address TEXT    NOT NULL,
      card_string      TEXT    NOT NULL,
      total            REAL    NOT NULL,
      created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   TEXT    NOT NULL REFERENCES orders(id),
      duck_id    INTEGER NOT NULL REFERENCES ducks(id),
      duck_name  TEXT    NOT NULL,
      quantity   INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL    NOT NULL
    );
  `);
}
