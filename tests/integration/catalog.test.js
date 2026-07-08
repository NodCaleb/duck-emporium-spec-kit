import request from 'supertest';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';
import { createApp } from '../../src/app.js';

let db;
let app;

beforeEach(() => {
  db = openDatabase(':memory:');
  runMigrations(db);
  seedDatabase(db);
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

// ── T015: US1 — GET /api/catalog ─────────────────────────────────────────────

describe('GET /api/catalog', () => {
  it('returns success envelope with ducks array and count', async () => {
    const res = await request(app).get('/api/catalog');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('ducks');
    expect(res.body.data).toHaveProperty('count');
  });

  it('returns at least 10 ducks across at least 3 categories', async () => {
    const res = await request(app).get('/api/catalog');
    const { ducks, count } = res.body.data;
    expect(ducks.length).toBeGreaterThanOrEqual(10);
    expect(count).toBe(ducks.length);

    const categories = new Set(ducks.map((d) => d.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });

  it('each duck in the list has the required fields', async () => {
    const res = await request(app).get('/api/catalog');
    for (const duck of res.body.data.ducks) {
      expect(duck).toHaveProperty('id');
      expect(duck).toHaveProperty('name');
      expect(duck).toHaveProperty('category');
      expect(duck).toHaveProperty('price');
      expect(duck).toHaveProperty('tagline');
      expect(duck).toHaveProperty('stockLabel');
    }
  });

  it('returns empty state when all ducks are removed', async () => {
    db.exec('DELETE FROM ducks');
    const res = await request(app).get('/api/catalog');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ducks: [], count: 0 } });
  });

  it('returns ducks ordered by id ascending', async () => {
    const res = await request(app).get('/api/catalog');
    const ids = res.body.data.ducks.map((d) => d.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

// ── T018: US2 — GET /api/catalog/:id ─────────────────────────────────────────

describe('GET /api/catalog/:id', () => {
  it('returns full duck record for a valid numeric ID', async () => {
    const catalogRes = await request(app).get('/api/catalog');
    const firstDuck = catalogRes.body.data.ducks[0];

    const res = await request(app).get(`/api/catalog/${firstDuck.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('duck');

    const duck = res.body.data.duck;
    expect(duck.id).toBe(firstDuck.id);
    expect(duck.name).toBe(firstDuck.name);
    expect(duck.category).toBe(firstDuck.category);
    expect(duck.price).toBe(firstDuck.price);
    expect(duck.tagline).toBe(firstDuck.tagline);
    expect(duck).toHaveProperty('description');
    expect(duck).toHaveProperty('personalityTraits');
    expect(Array.isArray(duck.personalityTraits)).toBe(true);
    expect(duck.personalityTraits.length).toBeGreaterThan(0);
    expect(duck).toHaveProperty('stock');
    expect(duck).toHaveProperty('stockLabel');
  });

  it('returns 404 for an unknown integer ID', async () => {
    const res = await request(app).get('/api/catalog/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Duck not found' });
  });

  it('returns 400 for a non-integer ID', async () => {
    const res = await request(app).get('/api/catalog/abc');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid duck ID' });
  });

  it('shows "Only N left" for a duck with stock in range 1–5', async () => {
    // Socrates the Quacker is seeded with stock = 5
    const catalogRes = await request(app).get('/api/catalog');
    const socrates = catalogRes.body.data.ducks.find((d) => d.name === 'Socrates the Quacker');
    expect(socrates).toBeDefined();

    const res = await request(app).get(`/api/catalog/${socrates.id}`);
    expect(res.body.data.duck.stockLabel).toBe('Only 5 left');
    expect(res.body.data.duck.stock).toBe(5);
  });

  it('shows "Sold out" for a duck with stock = 0', async () => {
    // Stack Trace Stanley is seeded with stock = 0
    const catalogRes = await request(app).get('/api/catalog');
    const stanley = catalogRes.body.data.ducks.find((d) => d.name === 'Stack Trace Stanley');
    expect(stanley).toBeDefined();

    const res = await request(app).get(`/api/catalog/${stanley.id}`);
    expect(res.body.data.duck.stockLabel).toBe('Sold out');
    expect(res.body.data.duck.stock).toBe(0);
  });
});
