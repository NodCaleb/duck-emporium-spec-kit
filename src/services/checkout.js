import { v4 as uuidv4 } from 'uuid';
import { getCart, clearCart } from './cart.js';

const EMAIL_REGEX = /.+@.+\..+/;

/**
 * Validates required checkout form fields.
 * Throws a 400 error with a field-level message on the first invalid field.
 *
 * @param {object} formData
 */
function validateFormData(formData) {
  const { shippingName, email, shippingAddress, cardString } = formData ?? {};

  if (!shippingName || typeof shippingName !== 'string' || !shippingName.trim()) {
    const err = new Error('shippingName is required');
    err.status = 400;
    throw err;
  }

  if (!email || typeof email !== 'string' || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
    const err = new Error('email is required and must be a valid email address');
    err.status = 400;
    throw err;
  }

  if (!shippingAddress || typeof shippingAddress !== 'string' || !shippingAddress.trim()) {
    const err = new Error('shippingAddress is required');
    err.status = 400;
    throw err;
  }

  if (!cardString || typeof cardString !== 'string' || !cardString.trim()) {
    const err = new Error('cardString is required');
    err.status = 400;
    throw err;
  }
}

/**
 * Processes a checkout for the given session.
 *
 * 1. Validates form fields (throws 400 on failure).
 * 2. Resolves current cart items (uses pre-resolved names and prices).
 * 3. Inside a single SQLite transaction:
 *    a. Re-fetches stock for each duck and rejects (409) if quantity > stock.
 *    b. Decrements stock.
 *    c. Inserts the order row (UUID v4 id).
 *    d. Inserts order_items rows.
 * 4. After the transaction commits, clears the in-memory cart.
 * 5. Returns the complete order record.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {object} formData
 * @returns {{ id: string, items: Array<object>, total: number, createdAt: string }}
 */
export function processCheckout(db, sessionId, formData) {
  validateFormData(formData);

  const { shippingName, email, shippingAddress, cardString } = formData;

  // Resolve current cart (names + prices from DB, line totals computed)
  const { items } = getCart(db, sessionId);

  const orderId = uuidv4();

  const transact = db.transaction(() => {
    // Re-validate stock for each item and decrement atomically
    for (const item of items) {
      const duck = db
        .prepare('SELECT id, name, stock FROM ducks WHERE id = ?')
        .get(item.duckId);

      if (!duck || duck.stock < item.quantity) {
        const err = new Error(
          `'${item.name}' is no longer available in the requested quantity`,
        );
        err.status = 409;
        throw err;
      }

      db.prepare('UPDATE ducks SET stock = stock - ? WHERE id = ?').run(
        item.quantity,
        item.duckId,
      );
    }

    // Compute order total from resolved cart items
    const total =
      Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;

    // Insert order record
    db.prepare(
      'INSERT INTO orders (id, shipping_name, shipping_email, shipping_address, card_string, total) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(orderId, shippingName, email, shippingAddress, cardString, total);

    // Insert order items
    for (const item of items) {
      db.prepare(
        'INSERT INTO order_items (order_id, duck_id, duck_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
      ).run(orderId, item.duckId, item.name, item.quantity, item.unitPrice);
    }
  });

  // Execute transaction — rolls back automatically if any error is thrown inside
  transact();

  // Clear the in-memory cart only after the transaction has committed
  clearCart(sessionId);

  // Fetch and return the persisted order record
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(orderId);

  return {
    id: order.id,
    items: orderItems.map((oi) => ({
      duckId: oi.duck_id,
      name: oi.duck_name,
      quantity: oi.quantity,
      unitPrice: oi.unit_price,
      lineTotal: Math.round(oi.unit_price * oi.quantity * 100) / 100,
    })),
    total: order.total,
    createdAt: order.created_at,
  };
}
