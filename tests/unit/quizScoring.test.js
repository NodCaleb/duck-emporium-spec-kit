import { describe, it, expect } from 'vitest';
import { scoreQuiz } from '../../src/services/quiz.js';

describe('scoreQuiz', () => {
  it('returns Debugging Ducks for all-A (index 0) answers', () => {
    // Q1A: +3 Debugging, Q2A: +3 Debugging, Q3A: +2 Debugging +1 Philosopher,
    // Q4A: +3 Debugging, Q5A: +3 Debugging, Q6A: +3 Debugging
    // Debugging: 17, Philosopher: 1
    const answers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 0 }));
    expect(scoreQuiz(answers)).toBe('Debugging Ducks');
  });

  it('returns Philosopher Ducks for all-B (index 1) answers', () => {
    // Q1B: +3 Phil, Q2B: +3 Phil, Q3B: +3 Phil, Q4B: +3 Phil,
    // Q5B: +2 Phil +1 Limited, Q6B: +3 Phil
    // Philosopher: 17, Limited Editions: 1
    const answers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 1 }));
    expect(scoreQuiz(answers)).toBe('Philosopher Ducks');
  });

  it('returns Maritime Ducks for all-C (index 2) answers', () => {
    // Q1C: +3 Maritime, Q2C: +3 Maritime, Q3C: +2 Maritime +1 Limited,
    // Q4C: +3 Maritime, Q5C: +3 Maritime, Q6C: +3 Maritime
    // Maritime: 17, Limited Editions: 1
    const answers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 2 }));
    expect(scoreQuiz(answers)).toBe('Maritime Ducks');
  });

  it('returns Wellness Ducks for all-D (index 3) answers', () => {
    // All D choices give +3 Wellness only
    // Wellness: 18
    const answers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 3 }));
    expect(scoreQuiz(answers)).toBe('Wellness Ducks');
  });

  it('breaks ties alphabetically — Debugging wins over Maritime', () => {
    // Q1A: +3 Debugging, Q2C: +3 Maritime, Q3B: +3 Philosopher,
    // Q4A: +3 Debugging, Q5C: +3 Maritime, Q6D: +3 Wellness
    // Debugging: 6, Maritime: 6, Philosopher: 3, Wellness: 3
    // Tie: "Debugging Ducks" < "Maritime Ducks" alphabetically → Debugging wins
    const answers = [
      { questionIndex: 0, choiceIndex: 0 },
      { questionIndex: 1, choiceIndex: 2 },
      { questionIndex: 2, choiceIndex: 1 },
      { questionIndex: 3, choiceIndex: 0 },
      { questionIndex: 4, choiceIndex: 2 },
      { questionIndex: 5, choiceIndex: 3 },
    ];
    expect(scoreQuiz(answers)).toBe('Debugging Ducks');
  });

  it('breaks ties alphabetically — Debugging wins when tied with Wellness and Philosopher', () => {
    // Pick equal scores for Debugging and Philosopher and Maritime
    // Q1A: +3 Debugging, Q2C: +3 Maritime, Q3B: +3 Philosopher,
    // Q4A: +3 Debugging, Q5C: +3 Maritime, Q6B: +3 Philosopher
    // Debugging: 6, Maritime: 6, Philosopher: 6
    // Alphabetical: "Debugging Ducks" < "Maritime Ducks" < "Philosopher Ducks" → Debugging wins
    const answers = [
      { questionIndex: 0, choiceIndex: 0 },
      { questionIndex: 1, choiceIndex: 2 },
      { questionIndex: 2, choiceIndex: 1 },
      { questionIndex: 3, choiceIndex: 0 },
      { questionIndex: 4, choiceIndex: 2 },
      { questionIndex: 5, choiceIndex: 1 },
    ];
    expect(scoreQuiz(answers)).toBe('Debugging Ducks');
  });

  it('is deterministic — same answers always return the same category', () => {
    const answers = [0, 1, 2, 3, 4, 5].map((qi) => ({ questionIndex: qi, choiceIndex: 0 }));
    const first = scoreQuiz(answers);
    const second = scoreQuiz(answers);
    const third = scoreQuiz(answers);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('correctly applies multi-category scores for Q3 choice A (+2 Debugging, +1 Philosopher)', () => {
    // Q1C–Q6C all Maritime, except Q3A (+2 Debugging, +1 Philosopher)
    // Maritime: 15, Debugging: 2, Philosopher: 1
    const answers = [
      { questionIndex: 0, choiceIndex: 2 },
      { questionIndex: 1, choiceIndex: 2 },
      { questionIndex: 2, choiceIndex: 0 }, // Q3A: +2 Debugging, +1 Philosopher
      { questionIndex: 3, choiceIndex: 2 },
      { questionIndex: 4, choiceIndex: 2 },
      { questionIndex: 5, choiceIndex: 2 },
    ];
    expect(scoreQuiz(answers)).toBe('Maritime Ducks');
  });

  it('correctly applies multi-category scores for Q5 choice B (+2 Philosopher, +1 Limited Editions)', () => {
    // Q1B–Q6B all Philosopher, Q5B (+2 Philosopher, +1 Limited)
    // Philosopher: 17, Limited Editions: 1
    const answers = [
      { questionIndex: 0, choiceIndex: 1 },
      { questionIndex: 1, choiceIndex: 1 },
      { questionIndex: 2, choiceIndex: 1 },
      { questionIndex: 3, choiceIndex: 1 },
      { questionIndex: 4, choiceIndex: 1 }, // Q5B: +2 Phil, +1 Limited
      { questionIndex: 5, choiceIndex: 1 },
    ];
    expect(scoreQuiz(answers)).toBe('Philosopher Ducks');
  });
});
