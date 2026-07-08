import { Router } from 'express';
import { getDuckOfTheDay } from '../services/duckOfTheDay.js';

export default function duckOfTheDayRouter(db) {
  const router = Router();

  router.get('/', (req, res, next) => {
    try {
      const duck = getDuckOfTheDay(db);

      if (duck === null) {
        return res.status(200).json({
          success: true,
          data: {
            duck: null,
            message: 'The pond is empty today, come back tomorrow.',
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          duck,
          detailUrl: `/api/catalog/${duck.id}`,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

