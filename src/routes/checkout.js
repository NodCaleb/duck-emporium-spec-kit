import { Router } from 'express';
import { requireSession } from '../middleware/requireSession.js';
import { getCart } from '../services/cart.js';
import { processCheckout } from '../services/checkout.js';

export default function checkoutRouter(db) {
  const router = Router();

  router.use(requireSession);

  // POST /api/checkout — submit order from the current session cart
  router.post('/', (req, res, next) => {
    try {
      const sessionId = req.headers['x-session-id'];

      // Check cart is non-empty before attempting checkout
      const { items } = getCart(db, sessionId);
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart is empty' });
      }

      const order = processCheckout(db, sessionId, req.body ?? {});
      res.status(201).json({ success: true, data: { order } });
    } catch (err) {
      if (err.status === 400 || err.status === 409) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      next(err);
    }
  });

  return router;
}
