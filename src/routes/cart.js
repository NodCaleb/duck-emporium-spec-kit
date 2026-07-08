import { Router } from 'express';
import { requireSession } from '../middleware/requireSession.js';
import { getCart, addToCart, updateCartItem, removeCartItem } from '../services/cart.js';

export default function cartRouter(db) {
  const router = Router();

  // All cart routes require a session header
  router.use(requireSession);

  // GET /api/cart — return current cart contents
  router.get('/', (req, res, next) => {
    try {
      const sessionId = req.headers['x-session-id'];
      const cart = getCart(db, sessionId);
      res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/cart/items — add a duck to the cart
  router.post('/items', (req, res, next) => {
    try {
      const sessionId = req.headers['x-session-id'];
      const { duckId, quantity = 1 } = req.body ?? {};

      if (!Number.isInteger(duckId) || duckId <= 0) {
        return res.status(400).json({ success: false, error: 'duckId must be a positive integer' });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res
          .status(400)
          .json({ success: false, error: 'quantity must be a positive integer' });
      }

      const cart = addToCart(db, sessionId, duckId, quantity);
      res.json({ success: true, data: cart });
    } catch (err) {
      if (err.status === 404 || err.status === 409) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      next(err);
    }
  });

  // PATCH /api/cart/items/:duckId — update quantity of a cart item
  router.patch('/items/:duckId', (req, res, next) => {
    try {
      const sessionId = req.headers['x-session-id'];
      const duckId = Number(req.params.duckId);
      const { quantity } = req.body ?? {};

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res
          .status(400)
          .json({ success: false, error: 'quantity must be a positive integer' });
      }

      const cart = updateCartItem(db, sessionId, duckId, quantity);
      res.json({ success: true, data: cart });
    } catch (err) {
      if (err.status === 404 || err.status === 409) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      next(err);
    }
  });

  // DELETE /api/cart/items/:duckId — remove a duck from the cart
  router.delete('/items/:duckId', (req, res, next) => {
    try {
      const sessionId = req.headers['x-session-id'];
      const duckId = Number(req.params.duckId);

      removeCartItem(sessionId, duckId);
      const cart = getCart(db, sessionId);
      res.json({ success: true, data: cart });
    } catch (err) {
      if (err.status === 404) {
        return res.status(404).json({ success: false, error: err.message });
      }
      next(err);
    }
  });

  return router;
}

