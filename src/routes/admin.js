import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { stockLabel } from '../services/catalog.js';

const VALID_CATEGORIES = [
  'Debugging Ducks',
  'Philosopher Ducks',
  'Maritime Ducks',
  'Wellness Ducks',
  'Limited Editions',
];

/**
 * Validates the request body for POST /api/catalog.
 * Returns an array of { field, message } errors (first error wins in caller).
 *
 * @param {object} body
 * @returns {{ field: string, message: string }[]}
 */
function validateDuckInput(body) {
  const errors = [];
  const { name, category, price, tagline, description, personalityTraits, stock } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push({ field: 'name', message: 'name is required' });
  }

  if (category === undefined || category === null) {
    errors.push({ field: 'category', message: 'category is required' });
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.push({
      field: 'category',
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  if (price === undefined || price === null) {
    errors.push({ field: 'price', message: 'price is required' });
  } else if (typeof price !== 'number' || price <= 0) {
    errors.push({ field: 'price', message: 'price must be a positive number' });
  }

  if (!tagline || typeof tagline !== 'string' || tagline.trim() === '') {
    errors.push({ field: 'tagline', message: 'tagline is required' });
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    errors.push({ field: 'description', message: 'description is required' });
  }

  if (
    !Array.isArray(personalityTraits) ||
    personalityTraits.length === 0 ||
    personalityTraits.some((t) => typeof t !== 'string' || t.trim() === '')
  ) {
    errors.push({ field: 'personalityTraits', message: 'personalityTraits is required' });
  }

  if (stock === undefined || stock === null) {
    errors.push({ field: 'stock', message: 'stock is required' });
  } else if (!Number.isInteger(stock) || stock < 0) {
    errors.push({ field: 'stock', message: 'stock must be a non-negative integer' });
  }

  return errors;
}

export default function adminRouter(db) {
  const router = Router();

  // POST /api/catalog — add a new duck (admin-only)
  router.post('/', adminAuth, (req, res, next) => {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : body.name;
    const ts = new Date().toISOString();

    try {
      const errors = validateDuckInput(body);
      if (errors.length > 0) {
        const first = errors[0];
        console.log(
          `[${ts}] ADMIN duck-add: name="${name ?? '<unknown>'}" status=rejected reason="${first.message}"`,
        );
        return res.status(400).json({ success: false, error: first.message });
      }

      const { category, price, tagline, description, personalityTraits, stock } = body;

      const result = db
        .prepare(
          `INSERT INTO ducks (name, category, price, tagline, description, personality_traits, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(name, category, price, tagline, description, JSON.stringify(personalityTraits), stock);

      const row = db.prepare('SELECT * FROM ducks WHERE id = ?').get(result.lastInsertRowid);

      const duck = {
        id: row.id,
        name: row.name,
        category: row.category,
        price: row.price,
        tagline: row.tagline,
        description: row.description,
        personalityTraits: JSON.parse(row.personality_traits),
        stock: row.stock,
        stockLabel: stockLabel(row.stock),
        createdAt: row.created_at,
      };

      console.log(`[${ts}] ADMIN duck-add: name="${duck.name}" status=created id=${duck.id}`);

      return res.status(201).json({ success: true, data: { duck } });
    } catch (err) {
      if (
        err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        (err.message && err.message.includes('UNIQUE constraint failed'))
      ) {
        console.log(
          `[${ts}] ADMIN duck-add: name="${name ?? '<unknown>'}" status=rejected reason="duplicate name"`,
        );
        return res
          .status(409)
          .json({ success: false, error: `A duck named '${name}' already exists` });
      }
      next(err);
    }
  });

  return router;
}
