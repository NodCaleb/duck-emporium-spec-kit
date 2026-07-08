import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { errorHandler } from './middleware/errorHandler.js';
import catalogRouter from './routes/catalog.js';
import cartRouter from './routes/cart.js';
import checkoutRouter from './routes/checkout.js';
import adminRouter from './routes/admin.js';
import duckOfTheDayRouter from './routes/duckOfTheDay.js';
import quizRouter from './routes/quiz.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates and configures the Express application.
 * Accepts a better-sqlite3 Database instance so tests can inject an in-memory DB.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Application}
 */
export function createApp(db) {
  const app = express();

  app.use(express.json());

  // API routes — all mounted under /api
  app.use('/api/catalog', catalogRouter(db));
  app.use('/api/cart', cartRouter(db));
  app.use('/api/checkout', checkoutRouter(db));
  app.use('/api/duck-of-the-day', duckOfTheDayRouter(db));
  app.use('/api/quiz', quizRouter(db));

  // Admin: POST /api/catalog — must be registered after the GET catalog router
  // but Express matches by method, so both can live under /api/catalog
  app.use('/api/catalog', adminRouter(db));

  // Static frontend
  app.use(express.static(path.join(__dirname, 'public')));

  // SPA catch-all: serve index.html for any non-API GET request
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
