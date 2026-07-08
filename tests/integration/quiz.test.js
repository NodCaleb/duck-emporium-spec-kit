import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { seedDatabase } from '../../src/db/seed.js';

describe('Quiz API', () => {
  let app;
  let db;

  beforeAll(() => {
    db = openDatabase(':memory:');
    runMigrations(db);
    seedDatabase(db);
    app = createApp(db);
  });

  // ---------------------------------------------------------------------------
  // GET /api/quiz
  // ---------------------------------------------------------------------------

  describe('GET /api/quiz', () => {
    it('returns 200 with exactly 6 questions', async () => {
      const res = await request(app).get('/api/quiz');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.questions)).toBe(true);
      expect(res.body.data.questions).toHaveLength(6);
    });

    it('each question has an index, text, and exactly 4 choices', async () => {
      const res = await request(app).get('/api/quiz');
      for (const q of res.body.data.questions) {
        expect(typeof q.index).toBe('number');
        expect(typeof q.text).toBe('string');
        expect(q.choices).toHaveLength(4);
        for (const c of q.choices) {
          expect(typeof c.index).toBe('number');
          expect(typeof c.text).toBe('string');
        }
      }
    });

    it('does not expose score maps in the response', async () => {
      const res = await request(app).get('/api/quiz');
      for (const q of res.body.data.questions) {
        expect(q.scores).toBeUndefined();
        for (const c of q.choices) {
          expect(c.scores).toBeUndefined();
        }
      }
    });

    it('question indices are 0–5 in order', async () => {
      const res = await request(app).get('/api/quiz');
      res.body.data.questions.forEach((q, i) => {
        expect(q.index).toBe(i);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/quiz — success paths
  // ---------------------------------------------------------------------------

  describe('POST /api/quiz — success paths', () => {
    const allAAnswers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 0 }));

    it('returns 200 with a recommendation for all-A answers (Debugging Ducks)', async () => {
      const res = await request(app).post('/api/quiz').send({ answers: allAAnswers });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedCategory).toBe('Debugging Ducks');
      expect(res.body.data.duck).toBeDefined();
      expect(res.body.data.duck.category).toBe('Debugging Ducks');
      expect(res.body.data.message).toBeTruthy();
      expect(typeof res.body.data.detailUrl).toBe('string');
    });

    it('detailUrl points to the correct catalog endpoint', async () => {
      const res = await request(app).post('/api/quiz').send({ answers: allAAnswers });
      expect(res.body.data.detailUrl).toBe(`/api/catalog/${res.body.data.duck.id}`);
    });

    it('duck record includes required fields and stockLabel', async () => {
      const res = await request(app).post('/api/quiz').send({ answers: allAAnswers });
      const { duck } = res.body.data;
      expect(typeof duck.id).toBe('number');
      expect(typeof duck.name).toBe('string');
      expect(typeof duck.price).toBe('number');
      expect(Array.isArray(duck.personalityTraits)).toBe(true);
      expect(
        ['In stock', 'Sold out'].includes(duck.stockLabel) || duck.stockLabel.startsWith('Only'),
      ).toBe(true);
    });

    it('is deterministic — same answers return the same duck twice', async () => {
      const res1 = await request(app).post('/api/quiz').send({ answers: allAAnswers });
      const res2 = await request(app).post('/api/quiz').send({ answers: allAAnswers });
      expect(res1.body.data.duck.id).toBe(res2.body.data.duck.id);
      expect(res1.body.data.recommendedCategory).toBe(res2.body.data.recommendedCategory);
    });

    it('tie-breaking: Debugging Ducks beats Maritime Ducks alphabetically', async () => {
      // Debugging: 6, Maritime: 6, Philosopher: 3, Wellness: 3
      const tieAnswers = [
        { questionIndex: 0, choiceIndex: 0 }, // Q1A: +3 Debugging
        { questionIndex: 1, choiceIndex: 2 }, // Q2C: +3 Maritime
        { questionIndex: 2, choiceIndex: 1 }, // Q3B: +3 Philosopher
        { questionIndex: 3, choiceIndex: 0 }, // Q4A: +3 Debugging
        { questionIndex: 4, choiceIndex: 2 }, // Q5C: +3 Maritime
        { questionIndex: 5, choiceIndex: 3 }, // Q6D: +3 Wellness
      ];
      const res = await request(app).post('/api/quiz').send({ answers: tieAnswers });
      expect(res.status).toBe(200);
      expect(res.body.data.recommendedCategory).toBe('Debugging Ducks');
    });

    it('does not modify ducks table row count (no DB state changes)', async () => {
      const countBefore = db.prepare('SELECT COUNT(*) as count FROM ducks').get().count;
      await request(app).post('/api/quiz').send({ answers: allAAnswers });
      const countAfter = db.prepare('SELECT COUNT(*) as count FROM ducks').get().count;
      expect(countAfter).toBe(countBefore);
    });

    it('does not modify orders table row count (no DB state changes)', async () => {
      const countBefore = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
      await request(app).post('/api/quiz').send({ answers: allAAnswers });
      const countAfter = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
      expect(countAfter).toBe(countBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/quiz — validation errors
  // ---------------------------------------------------------------------------

  describe('POST /api/quiz — validation errors', () => {
    it('returns 400 when answers is missing', async () => {
      const res = await request(app).post('/api/quiz').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('answers is required');
    });

    it('returns 400 when answers has fewer than 6 entries', async () => {
      const res = await request(app)
        .post('/api/quiz')
        .send({ answers: [{ questionIndex: 0, choiceIndex: 0 }] });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('answers must contain exactly 6 entries');
    });

    it('returns 400 when answers has more than 6 entries', async () => {
      const answers = [0, 1, 2, 3, 4, 5, 6].map((qi) => ({
        questionIndex: qi % 6,
        choiceIndex: 0,
      }));
      const res = await request(app).post('/api/quiz').send({ answers });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('answers must contain exactly 6 entries');
    });

    it('returns 400 for out-of-range questionIndex', async () => {
      const answers = [
        { questionIndex: 6, choiceIndex: 0 }, // invalid: max is 5
        { questionIndex: 1, choiceIndex: 0 },
        { questionIndex: 2, choiceIndex: 0 },
        { questionIndex: 3, choiceIndex: 0 },
        { questionIndex: 4, choiceIndex: 0 },
        { questionIndex: 5, choiceIndex: 0 },
      ];
      const res = await request(app).post('/api/quiz').send({ answers });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('questionIndex must be between 0 and 5');
    });

    it('returns 400 for out-of-range choiceIndex', async () => {
      const answers = [
        { questionIndex: 0, choiceIndex: 4 }, // invalid: max is 3
        { questionIndex: 1, choiceIndex: 0 },
        { questionIndex: 2, choiceIndex: 0 },
        { questionIndex: 3, choiceIndex: 0 },
        { questionIndex: 4, choiceIndex: 0 },
        { questionIndex: 5, choiceIndex: 0 },
      ];
      const res = await request(app).post('/api/quiz').send({ answers });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('choiceIndex must be between 0 and 3');
    });

    it('returns 400 for duplicate questionIndex values', async () => {
      // All 6 answers have questionIndex: 0
      const answers = Array(6).fill({ questionIndex: 0, choiceIndex: 0 });
      const res = await request(app).post('/api/quiz').send({ answers });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('each question must be answered exactly once');
    });
  });
});
