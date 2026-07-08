import request from 'supertest';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';
import { createApp } from '../../src/app.js';

// ── T038: US8 — GET /api/duck-of-the-day ─────────────────────────────────────

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

describe('GET /api/duck-of-the-day', () => {
  it('returns 200 with success envelope and a duck object', async () => {
    const res = await request(app).get('/api/duck-of-the-day');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('duck');
  });

  it('returns the same duck on multiple requests on the same day', async () => {
    const res1 = await request(app).get('/api/duck-of-the-day');
    const res2 = await request(app).get('/api/duck-of-the-day');
    const res3 = await request(app).get('/api/duck-of-the-day');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    const duck1 = res1.body.data.duck;
    const duck2 = res2.body.data.duck;
    const duck3 = res3.body.data.duck;

    expect(duck1).not.toBeNull();
    expect(duck1.id).toBe(duck2.id);
    expect(duck1.id).toBe(duck3.id);
  });

  it('returned duck has required fields including stockLabel and personalityTraits', async () => {
    const res = await request(app).get('/api/duck-of-the-day');
    const { duck } = res.body.data;

    expect(duck).not.toBeNull();
    expect(duck).toHaveProperty('id');
    expect(duck).toHaveProperty('name');
    expect(duck).toHaveProperty('category');
    expect(duck).toHaveProperty('price');
    expect(duck).toHaveProperty('tagline');
    expect(duck).toHaveProperty('description');
    expect(duck).toHaveProperty('personalityTraits');
    expect(duck).toHaveProperty('stock');
    expect(duck).toHaveProperty('stockLabel');
    expect(Array.isArray(duck.personalityTraits)).toBe(true);
  });

  it('includes a detailUrl pointing to /api/catalog/:id', async () => {
    const res = await request(app).get('/api/duck-of-the-day');
    const { duck, detailUrl } = res.body.data;

    expect(detailUrl).toBe(`/api/catalog/${duck.id}`);
  });

  it('only selects ducks with stock > 0', async () => {
    // Get the duck of the day to find its id
    const res1 = await request(app).get('/api/duck-of-the-day');
    const selectedDuck = res1.body.data.duck;
    expect(selectedDuck).not.toBeNull();

    // Mark that duck as sold out and request again; should not return it
    db.prepare('UPDATE ducks SET stock = 0 WHERE id = ?').run(selectedDuck.id);

    const res2 = await request(app).get('/api/duck-of-the-day');
    expect(res2.status).toBe(200);

    const newDuck = res2.body.data.duck;
    // Either a different duck was selected, or null if all ducks are out of stock
    if (newDuck !== null) {
      expect(newDuck.id).not.toBe(selectedDuck.id);
      expect(newDuck.stock).toBeGreaterThan(0);
    }
  });

  it('returns 200 with duck: null and a friendly message when all ducks are sold out', async () => {
    db.exec('UPDATE ducks SET stock = 0');

    const res = await request(app).get('/api/duck-of-the-day');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.duck).toBeNull();
    expect(res.body.data.message).toBe('The pond is empty today, come back tomorrow.');
  });

  it('returns duck with stock > 0 after restoring one duck from all-sold-out state', async () => {
    db.exec('UPDATE ducks SET stock = 0');

    // Restore exactly one duck
    const firstDuck = db.prepare('SELECT id FROM ducks ORDER BY id ASC LIMIT 1').get();
    db.prepare('UPDATE ducks SET stock = 1 WHERE id = ?').run(firstDuck.id);

    const res = await request(app).get('/api/duck-of-the-day');
    expect(res.status).toBe(200);
    expect(res.body.data.duck).not.toBeNull();
    expect(res.body.data.duck.id).toBe(firstDuck.id);
  });
});
