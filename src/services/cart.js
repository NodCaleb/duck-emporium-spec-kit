/**
 * In-memory cart store, scoped by session ID.
 * Each entry maps a sessionId to an array of { duckId, quantity }.
 *
 * @type {Map<string, Array<{ duckId: number, quantity: number }>>}
 */
const cartStore = new Map();

function getSessionItems(sessionId) {
  if (!cartStore.has(sessionId)) {
    cartStore.set(sessionId, []);
  }
  return cartStore.get(sessionId);
}

/**
 * Returns the current cart contents for a session, resolving duck names and
 * prices from the database and computing per-item lineTotals and cartTotal.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {{ items: Array<object>, cartTotal: number }}
 */
export function getCart(db, sessionId) {
  const items = getSessionItems(sessionId);
  let cartTotal = 0;

  const resolvedItems = items
    .map((item) => {
      const duck = db.prepare('SELECT id, name, price FROM ducks WHERE id = ?').get(item.duckId);
      if (!duck) return null; // duck removed since it was added; skip
      const lineTotal = Math.round(duck.price * item.quantity * 100) / 100;
      cartTotal += lineTotal;
      return {
        duckId: duck.id,
        name: duck.name,
        quantity: item.quantity,
        unitPrice: duck.price,
        lineTotal,
      };
    })
    .filter(Boolean);

  cartTotal = Math.round(cartTotal * 100) / 100;
  return { items: resolvedItems, cartTotal };
}

/**
 * Adds a duck to the cart or increases its quantity if already present.
 * Throws a 404 error if the duck does not exist, or a 409 error if the
 * requested quantity would exceed available stock.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {number} duckId
 * @param {number} quantity
 * @returns {{ items: Array<object>, cartTotal: number }}
 */
export function addToCart(db, sessionId, duckId, quantity) {
  const duck = db.prepare('SELECT id, name, stock FROM ducks WHERE id = ?').get(duckId);
  if (!duck) {
    const err = new Error('Duck not found');
    err.status = 404;
    throw err;
  }

  const items = getSessionItems(sessionId);
  const existing = items.find((item) => item.duckId === duckId);
  const currentQty = existing ? existing.quantity : 0;
  const newTotalQty = currentQty + quantity;

  if (newTotalQty > duck.stock) {
    const err = new Error(`Only ${duck.stock} units of '${duck.name}' are in stock`);
    err.status = 409;
    throw err;
  }

  if (existing) {
    existing.quantity = newTotalQty;
  } else {
    items.push({ duckId, quantity });
  }

  return getCart(db, sessionId);
}

/**
 * Updates the quantity of a duck already in the cart. A quantity of 0 removes
 * the item. Throws 404 if the item is not in the cart, or 409 if the new
 * quantity exceeds available stock.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {number} duckId
 * @param {number} quantity
 * @returns {{ items: Array<object>, cartTotal: number }}
 */
export function updateCartItem(db, sessionId, duckId, quantity) {
  const items = getSessionItems(sessionId);
  const idx = items.findIndex((item) => item.duckId === duckId);

  if (idx === -1) {
    const err = new Error('Item not found in cart');
    err.status = 404;
    throw err;
  }

  if (quantity === 0) {
    items.splice(idx, 1);
    return getCart(db, sessionId);
  }

  const duck = db.prepare('SELECT id, name, stock FROM ducks WHERE id = ?').get(duckId);
  if (quantity > duck.stock) {
    const err = new Error(`Only ${duck.stock} units of '${duck.name}' are in stock`);
    err.status = 409;
    throw err;
  }

  items[idx].quantity = quantity;
  return getCart(db, sessionId);
}

/**
 * Removes a duck entirely from the cart.
 * Throws a 404 error if the item is not present in the cart.
 *
 * @param {string} sessionId
 * @param {number} duckId
 */
export function removeCartItem(sessionId, duckId) {
  const items = getSessionItems(sessionId);
  const idx = items.findIndex((item) => item.duckId === duckId);

  if (idx === -1) {
    const err = new Error('Item not found in cart');
    err.status = 404;
    throw err;
  }

  items.splice(idx, 1);
}

/**
 * Clears all items from a session's cart. Used by the checkout service after
 * a successful order is placed.
 *
 * @param {string} sessionId
 */
export function clearCart(sessionId) {
  cartStore.delete(sessionId);
}
