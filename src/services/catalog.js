/**
 * Computes the stock label for a duck based on its current stock quantity.
 *
 * @param {number} stock
 * @returns {string}
 */
export function stockLabel(stock) {
  if (stock === 0) return 'Sold out';
  if (stock <= 5) return `Only ${stock} left`;
  return 'In stock';
}

/**
 * Returns a list of all ducks, optionally filtered by search text, category,
 * and/or price range. Filters compose with AND logic.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ search?: string, category?: string, minPrice?: number, maxPrice?: number }} [filters]
 * @returns {Array<object>}
 */
export function listDucks(db, filters = {}) {
  const { search, category, minPrice, maxPrice } = filters;

  const conditions = [];
  const params = [];

  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      '(LOWER(name) LIKE ? OR LOWER(tagline) LIKE ? OR LOWER(description) LIKE ?)'
    );
    params.push(pattern, pattern, pattern);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (minPrice !== undefined) {
    conditions.push('price >= ?');
    params.push(minPrice);
  }

  if (maxPrice !== undefined) {
    conditions.push('price <= ?');
    params.push(maxPrice);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT id, name, category, price, tagline, stock FROM ducks ${where} ORDER BY id ASC`;

  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    tagline: row.tagline,
    stockLabel: stockLabel(row.stock),
  }));
}

/**
 * Returns the full detail record for a single duck, or null if not found.
 * Parses personality_traits JSON and computes stockLabel.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {object|null}
 */
export function getDuckById(db, id) {
  const row = db
    .prepare('SELECT * FROM ducks WHERE id = ?')
    .get(id);

  if (!row) return null;

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
