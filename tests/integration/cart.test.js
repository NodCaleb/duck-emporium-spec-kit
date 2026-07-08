import request from 'supertest';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';
import { createApp } from '../../src/app.js';

let db;
let app;
let sessionId;

beforeEach(() => {
  db = openDatabase(':memory:');
  runMigrations(db);
  seedDatabase(db);
  app = createApp(db);
  sessionId = 'test-session-' + Math.random().toString(36).slice(2);
});

afterEach(() => {
  db.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHighStockDuck() {
  return db.prepare('SELECT * FROM ducks WHERE stock > 5 ORDER BY id ASC LIMIT 1').get();
}

function getTwoDucks() {
  return db.prepare('SELECT * FROM ducks WHERE stock > 5 ORDER BY id ASC LIMIT 2').all();
}

// ── T021: US3 — Missing X-Session-ID → 400 for all cart endpoints ─────────────

describe('Cart endpoints — missing X-Session-ID', () => {
  it('GET /api/cart returns 400 without session header', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'X-Session-ID header is required' });
  });

  it('POST /api/cart/items returns 400 without session header', async () => {
    const res = await request(app).post('/api/cart/items').send({ duckId: 1, quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'X-Session-ID header is required' });
  });

  it('PATCH /api/cart/items/:duckId returns 400 without session header', async () => {
    const res = await request(app).patch('/api/cart/items/1').send({ quantity: 2 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'X-Session-ID header is required' });
  });

  it('DELETE /api/cart/items/:duckId returns 400 without session header', async () => {
    const res = await request(app).delete('/api/cart/items/1');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'X-Session-ID header is required' });
  });
});

// ── Scenario 1: Add item with default quantity 1 ──────────────────────────────

describe('POST /api/cart/items — add item', () => {
  it('adds a duck to the cart with default quantity 1', async () => {
    const duck = getHighStockDuck();
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].duckId).toBe(duck.id);
    expect(res.body.data.items[0].quantity).toBe(1);
    expect(res.body.data.items[0].unitPrice).toBe(duck.price);
    expect(res.body.data.items[0].lineTotal).toBeCloseTo(duck.price);
    expect(res.body.data.cartTotal).toBeCloseTo(duck.price);
  });

  it('adds a duck with explicit quantity', async () => {
    const duck = getHighStockDuck();
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.items[0].lineTotal).toBeCloseTo(duck.price * 2);
    expect(res.body.data.cartTotal).toBeCloseTo(duck.price * 2);
  });

  it('increases quantity when adding the same duck again', async () => {
    const duck = getHighStockDuck();
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(2);
  });

  it('returns 400 when duckId is missing', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'duckId must be a positive integer' });
  });

  it('returns 400 when duckId is not an integer', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: 'abc', quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'duckId must be a positive integer' });
  });

  it('returns 400 when quantity is not a positive integer', async () => {
    const duck = getHighStockDuck();
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'quantity must be a positive integer' });
  });

  it('returns 404 when duck does not exist', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: 99999 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Duck not found' });
  });

  it('returns 409 when requested quantity exceeds available stock', async () => {
    const duck = getHighStockDuck();
    db.prepare('UPDATE ducks SET stock = 5 WHERE id = ?').run(duck.id);

    const res = await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 100 });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Only 5 units/);
    expect(res.body.error).toContain(duck.name);
  });
});

// ── Scenario 2: Update quantity ───────────────────────────────────────────────

describe('PATCH /api/cart/items/:duckId — update quantity', () => {
  it('updates the quantity of an existing cart item', async () => {
    const duck = getHighStockDuck();
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app)
      .patch(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.items[0].lineTotal).toBeCloseTo(duck.price * 3);
    expect(res.body.data.cartTotal).toBeCloseTo(duck.price * 3);
  });

  it('returns 400 when quantity is less than 1', async () => {
    const duck = getHighStockDuck();
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app)
      .patch(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId)
      .send({ quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'quantity must be a positive integer' });
  });

  it('returns 404 when item is not in the cart', async () => {
    const duck = getHighStockDuck();
    const res = await request(app)
      .patch(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId)
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Item not found in cart' });
  });

  it('returns 409 when new quantity exceeds stock', async () => {
    const duck = getHighStockDuck();
    db.prepare('UPDATE ducks SET stock = 3 WHERE id = ?').run(duck.id);

    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app)
      .patch(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId)
      .send({ quantity: 10 });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Only 3 units/);
    expect(res.body.error).toContain(duck.name);
  });
});

// ── Scenario 3: Remove item ───────────────────────────────────────────────────

describe('DELETE /api/cart/items/:duckId — remove item', () => {
  it('removes a duck from the cart', async () => {
    const duck = getHighStockDuck();
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app)
      .delete(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.cartTotal).toBe(0);
  });

  it('returns 404 when item is not in the cart', async () => {
    const duck = getHighStockDuck();
    const res = await request(app)
      .delete(`/api/cart/items/${duck.id}`)
      .set('X-Session-ID', sessionId);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Item not found in cart' });
  });
});

// ── Scenario 4: View cart total ───────────────────────────────────────────────

describe('GET /api/cart — view cart', () => {
  it('returns empty cart for a new session', async () => {
    const res = await request(app).get('/api/cart').set('X-Session-ID', sessionId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { items: [], cartTotal: 0 } });
  });

  it('returns cart contents with correct name, quantity, unitPrice, lineTotal, and cartTotal', async () => {
    const duck = getHighStockDuck();
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 2 });

    const res = await request(app).get('/api/cart').set('X-Session-ID', sessionId);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe(duck.name);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.items[0].unitPrice).toBe(duck.price);
    expect(res.body.data.items[0].lineTotal).toBeCloseTo(duck.price * 2);
    expect(res.body.data.cartTotal).toBeCloseTo(duck.price * 2);
  });

  it('cart is session-scoped — different sessions have independent carts', async () => {
    const duck = getHighStockDuck();
    const session2 = 'other-session-' + Math.random().toString(36).slice(2);

    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck.id, quantity: 1 });

    const res = await request(app).get('/api/cart').set('X-Session-ID', session2);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.cartTotal).toBe(0);
  });
});

// ── Scenario 5: Full cart workflow ────────────────────────────────────────────

describe('Cart — full workflow (add, update, add second, remove first)', () => {
  it('add duck1 → update qty to 3 → add duck2 → remove duck1 → cart has only duck2', async () => {
    const [duck1, duck2] = getTwoDucks();

    // Add duck1 with default qty 1
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck1.id });

    // Update duck1 qty to 3
    await request(app)
      .patch(`/api/cart/items/${duck1.id}`)
      .set('X-Session-ID', sessionId)
      .send({ quantity: 3 });

    // Add duck2
    await request(app)
      .post('/api/cart/items')
      .set('X-Session-ID', sessionId)
      .send({ duckId: duck2.id, quantity: 1 });

    // Remove duck1
    await request(app).delete(`/api/cart/items/${duck1.id}`).set('X-Session-ID', sessionId);

    // Final cart — only duck2
    const res = await request(app).get('/api/cart').set('X-Session-ID', sessionId);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].duckId).toBe(duck2.id);
    expect(res.body.data.items[0].quantity).toBe(1);
    expect(res.body.data.cartTotal).toBeCloseTo(duck2.price);
  });
});
