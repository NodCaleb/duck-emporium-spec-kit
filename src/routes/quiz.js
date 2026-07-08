import { Router } from 'express';
import { QUIZ_QUESTIONS, scoreQuiz, getPersonalizedMessage } from '../services/quiz.js';
import { stockLabel } from '../services/catalog.js';

export default function quizRouter(db) {
  const router = Router();

  // GET /api/quiz — return questions without score maps
  router.get('/', (_req, res) => {
    const questions = QUIZ_QUESTIONS.map((q) => ({
      index: q.index,
      text: q.text,
      choices: q.choices.map((c) => ({ index: c.index, text: c.text })),
    }));
    res.json({ success: true, data: { questions } });
  });

  // POST /api/quiz — validate answers, score, and return duck recommendation
  router.post('/', (req, res) => {
    const { answers } = req.body;

    if (answers === undefined || answers === null) {
      return res.status(400).json({ success: false, error: 'answers is required' });
    }

    if (!Array.isArray(answers) || answers.length !== 6) {
      return res
        .status(400)
        .json({ success: false, error: 'answers must contain exactly 6 entries' });
    }

    // Validate ranges before checking duplicates
    for (const answer of answers) {
      if (answer.questionIndex < 0 || answer.questionIndex > 5) {
        return res
          .status(400)
          .json({ success: false, error: 'questionIndex must be between 0 and 5' });
      }
      if (answer.choiceIndex < 0 || answer.choiceIndex > 3) {
        return res
          .status(400)
          .json({ success: false, error: 'choiceIndex must be between 0 and 3' });
      }
    }

    // Check for duplicate questionIndex values
    const questionIndices = answers.map((a) => a.questionIndex);
    if (new Set(questionIndices).size !== 6) {
      return res
        .status(400)
        .json({ success: false, error: 'each question must be answered exactly once' });
    }

    const recommendedCategory = scoreQuiz(answers);
    const message = getPersonalizedMessage(recommendedCategory);

    const row = db
      .prepare('SELECT * FROM ducks WHERE category = ? ORDER BY id ASC LIMIT 1')
      .get(recommendedCategory);

    const duck = row
      ? {
          id: row.id,
          name: row.name,
          category: row.category,
          price: row.price,
          tagline: row.tagline,
          description: row.description,
          personalityTraits: JSON.parse(row.personality_traits),
          stock: row.stock,
          stockLabel: stockLabel(row.stock),
        }
      : null;

    return res.json({
      success: true,
      data: {
        recommendedCategory,
        duck,
        message,
        detailUrl: duck ? `/api/catalog/${duck.id}` : null,
      },
    });
  });

  return router;
}
