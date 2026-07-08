import request from 'supertest';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';
import { createApp } from '../../src/app.js';

const ADMIN_PASSWORD = 'quack123';

let db;
let app;

beforeEach(() => {
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  db = openDatabase(':memory:');
  runMigrations(db);
  seedDatabase(db);
  app = createApp(db);
});

afterEach(() => {
  db.close();
  delete process.env.ADMIN_PASSWORD;
});

const validDuck = {
  name: 'Test Admin Duck',
  category: 'Limited Editions',
  price: 24.99,
  tagline: 'A duck for testing admin endpoints.',
  description: 'Created during integration tests to verify the admin API.',
  personalityTraits: ['Dramatic', 'Brooding', 'Poetic'],
  stock: 5,
};

// ── T030: US6 — POST /api/catalog ────────────────────────────────────────────

describe('POST /api/catalog', () => {
  // Scenario 1: Successful add — 201, duck appears in GET /api/catalog
  it('returns 201 with full duck record on valid request', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send(validDuck);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('duck');

    const duck = res.body.data.duck;
    expect(duck.name).toBe(validDuck.name);
    expect(duck.category).toBe(validDuck.category);
    expect(duck.price).toBe(validDuck.price);
    expect(duck.tagline).toBe(validDuck.tagline);
    expect(duck.description).toBe(validDuck.description);
    expect(duck.personalityTraits).toEqual(validDuck.personalityTraits);
    expect(duck.stock).toBe(validDuck.stock);
    expect(duck.stockLabel).toBe('Only 5 left');
    expect(duck).toHaveProperty('id');
    expect(duck).toHaveProperty('createdAt');
  });

  it('newly added duck is visible in GET /api/catalog', async () => {
    await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send(validDuck);

    const catalogRes = await request(app).get('/api/catalog');
    const names = catalogRes.body.data.ducks.map((d) => d.name);
    expect(names).toContain(validDuck.name);
  });

  // Scenario 2: Wrong / missing password → 401
  it('returns 401 when X-Admin-Password header is missing', async () => {
    const res = await request(app).post('/api/catalog').send(validDuck);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 401 when X-Admin-Password header is wrong', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', 'wrongpassword')
      .send(validDuck);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Unauthorized');
  });

  // Scenario 3: Duplicate name → 409
  it('returns 409 when a duck with the same name already exists', async () => {
    // First insert succeeds
    await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send(validDuck);

    // Second insert with same name
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send(validDuck);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe(`A duck named '${validDuck.name}' already exists`);
  });

  // Scenario 4a: Negative price → 400 with distinct message
  it('returns 400 with "price must be a positive number" for price <= 0', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, price: -5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('price must be a positive number');
  });

  it('returns 400 with "price must be a positive number" for price = 0', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, price: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('price must be a positive number');
  });

  // Scenario 4b: Negative stock → 400 with distinct message
  it('returns 400 with "stock must be a non-negative integer" for stock < 0', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, stock: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('stock must be a non-negative integer');
  });

  it('returns 400 with "stock must be a non-negative integer" for non-integer stock', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, stock: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('stock must be a non-negative integer');
  });

  // Scenario 4c: Missing required fields → 400
  it('returns 400 with "<field> is required" for missing name', async () => {
    const { name: _name, ...body } = validDuck;
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('name is required');
  });

  it('returns 400 for invalid category', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, category: 'Rocket Ducks' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe(
      'category must be one of: Debugging Ducks, Philosopher Ducks, Maritime Ducks, Wellness Ducks, Limited Editions'
    );
  });

  it('returns 400 for empty personalityTraits array', async () => {
    const res = await request(app)
      .post('/api/catalog')
      .set('X-Admin-Password', ADMIN_PASSWORD)
      .send({ ...validDuck, personalityTraits: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Scenario 5: stdout log entry present on success
  it('writes a timestamped log entry to stdout on successful add', async () => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    try {
      await request(app)
        .post('/api/catalog')
        .set('X-Admin-Password', ADMIN_PASSWORD)
        .send(validDuck);
    } finally {
      console.log = originalLog;
    }

    const logLine = logs.join('\n');
    expect(logLine).toContain('ADMIN duck-add');
    expect(logLine).toContain(validDuck.name);
    expect(logLine).toMatch(/status=created/);
  });
});
