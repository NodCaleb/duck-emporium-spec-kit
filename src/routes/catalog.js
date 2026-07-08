import { Router } from 'express';
import { listDucks, getDuckById } from '../services/catalog.js';

export default function catalogRouter(db) {
  const router = Router();

  // GET /api/catalog — list all ducks (with optional filters)
  router.get('/', (req, res, next) => {
    try {
      const { search, category, minPrice: minPriceRaw, maxPrice: maxPriceRaw } = req.query;

      let minPrice;
      let maxPrice;

      if (minPriceRaw !== undefined) {
        minPrice = Number(minPriceRaw);
        if (!Number.isFinite(minPrice)) {
          return res.status(400).json({ success: false, error: 'minPrice must be a number' });
        }
      }

      if (maxPriceRaw !== undefined) {
        maxPrice = Number(maxPriceRaw);
        if (!Number.isFinite(maxPrice)) {
          return res.status(400).json({ success: false, error: 'maxPrice must be a number' });
        }
      }

      const ducks = listDucks(db, { search, category, minPrice, maxPrice });
      res.json({ success: true, data: { ducks, count: ducks.length } });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/catalog/:id — single duck detail
  router.get('/:id', (req, res, next) => {
    try {
      const parsed = Number(req.params.id);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid duck ID' });
      }

      const duck = getDuckById(db, parsed);
      if (!duck) {
        return res.status(404).json({ success: false, error: 'Duck not found' });
      }

      res.json({ success: true, data: { duck } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
