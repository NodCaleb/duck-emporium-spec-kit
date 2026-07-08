import request from 'supertest';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';
import { createApp } from '../../src/app.js';

let db;
let app;
let sessionId;

const VALID_FORM = {
  shippingName: 'Quincy Developer',
  email: 'quincy@example.com',
  shippingAddress: '1 Rubber Duck Lane, Duckburg, CA 94000',
  cardString: '4111 1111 1111 1111',
};

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

async function addDuckToCart(duckId, quantity = 1) {
  await request(app)
    .post('/api/cart/items')
    .set('X-Session-ID', sessionId)
    .send({ duckId, quantity });
}

// ── T024: US4 — POST /api/checkout acceptance scenarios ───────────────────────

// Missing X-Session-ID → 400
describe('POST /api/checkout — missing X-Session-ID', () => {
  it('returns 400 without session header', async () => {
    const res = await request(app).post('/api/checkout').send(VALID_FORM);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'X-Session-ID header is required' });
  });
});

// Empty cart → 400
describe('POST /api/checkout — empty cart', () => {
  it('returns 400 when cart is empty', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(VALID_FORM);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Cart is empty' });
  });
});

// Scenario 1: Success path — 201, order created, stock decremented, cart cleared
describe('POST /api/checkout — success path', () => {
  it('returns 201 with order including id, items, total, and createdAt', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id, 2);

    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(VALID_FORM);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { order } = res.body.data;
    expect(typeof order.id).toBe('string');
    expect(order.id.length).toBeGreaterThan(0);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].duckId).toBe(duck.id);
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].unitPrice).toBeCloseTo(duck.price);
    expect(order.items[0].lineTotal).toBeCloseTo(duck.price * 2);
    expect(order.total).toBeCloseTo(duck.price * 2);
    expect(typeof order.createdAt).toBe('string');
    expect(order.createdAt.length).toBeGreaterThan(0);
  });

  it('decrements duck stock by the ordered quantity', async () => {
    const duck = getHighStockDuck();
    const initialStock = duck.stock;
    await addDuckToCart(duck.id, 2);

    await request(app).post('/api/checkout').set('X-Session-ID', sessionId).send(VALID_FORM);

    const updatedDuck = db.prepare('SELECT stock FROM ducks WHERE id = ?').get(duck.id);
    expect(updatedDuck.stock).toBe(initialStock - 2);
  });

  it('clears the cart after successful checkout', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id, 1);

    await request(app).post('/api/checkout').set('X-Session-ID', sessionId).send(VALID_FORM);

    const cartRes = await request(app).get('/api/cart').set('X-Session-ID', sessionId);
    expect(cartRes.body.data.items).toHaveLength(0);
    expect(cartRes.body.data.cartTotal).toBe(0);
  });
});

// Scenario 2: Invalid/empty email → 400 field-level error
describe('POST /api/checkout — email validation', () => {
  it('returns 400 for malformed email', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id);

    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send({ ...VALID_FORM, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('email is required and must be a valid email address');
  });

  it('returns 400 for empty email', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id);

    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send({ ...VALID_FORM, email: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('email is required and must be a valid email address');
  });

  it('returns 400 for missing shippingName', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id);

    const { shippingName: _omit, ...bodyWithoutName } = VALID_FORM;
    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(bodyWithoutName);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('shippingName is required');
  });

  it('returns 400 for missing shippingAddress', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id);

    const { shippingAddress: _omit, ...bodyWithoutAddr } = VALID_FORM;
    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(bodyWithoutAddr);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('shippingAddress is required');
  });

  it('returns 400 for missing cardString', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id);

    const { cardString: _omit, ...bodyWithoutCard } = VALID_FORM;
    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(bodyWithoutCard);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('cardString is required');
  });
});

// Scenario 3: Out-of-stock at submission → 409 naming the duck
describe('POST /api/checkout — out-of-stock at submission', () => {
  it('returns 409 naming the duck when stock is exhausted between add and checkout', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id, 1);

    // Simulate a concurrent purchase that exhausts stock
    db.prepare('UPDATE ducks SET stock = 0 WHERE id = ?').run(duck.id);

    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(VALID_FORM);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain(duck.name);

    // No stock change should have occurred (atomicity)
    const updatedDuck = db.prepare('SELECT stock FROM ducks WHERE id = ?').get(duck.id);
    expect(updatedDuck.stock).toBe(0);
  });

  it('does not create an order when stock validation fails', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id, 1);
    db.prepare('UPDATE ducks SET stock = 0 WHERE id = ?').run(duck.id);

    await request(app).post('/api/checkout').set('X-Session-ID', sessionId).send(VALID_FORM);

    const orders = db.prepare('SELECT * FROM orders').all();
    expect(orders).toHaveLength(0);
  });
});

// Scenario 4: Order persistence — order row survives in the DB
describe('POST /api/checkout — order persistence', () => {
  it('persists order and order_items in the database after successful checkout', async () => {
    const duck = getHighStockDuck();
    await addDuckToCart(duck.id, 3);

    const res = await request(app)
      .post('/api/checkout')
      .set('X-Session-ID', sessionId)
      .send(VALID_FORM);

    expect(res.status).toBe(201);
    const orderId = res.body.data.order.id;

    // Order record is present
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    expect(order).toBeTruthy();
    expect(order.shipping_name).toBe(VALID_FORM.shippingName);
    expect(order.shipping_email).toBe(VALID_FORM.email);
    expect(order.shipping_address).toBe(VALID_FORM.shippingAddress);
    expect(order.total).toBeCloseTo(duck.price * 3);

    // Order items are present
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    expect(items).toHaveLength(1);
    expect(items[0].duck_id).toBe(duck.id);
    expect(items[0].quantity).toBe(3);
    expect(items[0].unit_price).toBeCloseTo(duck.price);
  });
});
