export const QUIZ_QUESTIONS = Object.freeze([
  {
    index: 0,
    text: 'When faced with an impossible bug, your first instinct is to\u2026',
    choices: [
      { index: 0, text: 'Stare at it until it confesses', scores: { 'Debugging Ducks': 3 } },
      {
        index: 1,
        text: 'Ask deep philosophical questions about why it exists',
        scores: { 'Philosopher Ducks': 3 },
      },
      { index: 2, text: 'Check the tide charts', scores: { 'Maritime Ducks': 3 } },
      { index: 3, text: 'Take a calming breath and make tea', scores: { 'Wellness Ducks': 3 } },
    ],
  },
  {
    index: 1,
    text: 'Your ideal Friday night is\u2026',
    choices: [
      { index: 0, text: 'Pair-programming with a rubber duck', scores: { 'Debugging Ducks': 3 } },
      { index: 1, text: 'Debating the nature of free will', scores: { 'Philosopher Ducks': 3 } },
      { index: 2, text: 'Sailing into a sunset', scores: { 'Maritime Ducks': 3 } },
      { index: 3, text: 'A guided meditation session', scores: { 'Wellness Ducks': 3 } },
    ],
  },
  {
    index: 2,
    text: 'Friends describe you as\u2026',
    choices: [
      {
        index: 0,
        text: 'Methodical and persistent',
        scores: { 'Debugging Ducks': 2, 'Philosopher Ducks': 1 },
      },
      { index: 1, text: 'Thoughtful and provocative', scores: { 'Philosopher Ducks': 3 } },
      {
        index: 2,
        text: 'Adventurous and bold',
        scores: { 'Maritime Ducks': 2, 'Limited Editions': 1 },
      },
      { index: 3, text: 'Calm and grounding', scores: { 'Wellness Ducks': 3 } },
    ],
  },
  {
    index: 3,
    text: 'Your preferred problem-solving tool is\u2026',
    choices: [
      { index: 0, text: 'A step-by-step checklist', scores: { 'Debugging Ducks': 3 } },
      { index: 1, text: 'A Socratic dialogue', scores: { 'Philosopher Ducks': 3 } },
      { index: 2, text: 'A nautical map', scores: { 'Maritime Ducks': 3 } },
      { index: 3, text: 'Aromatherapy and journaling', scores: { 'Wellness Ducks': 3 } },
    ],
  },
  {
    index: 4,
    text: 'If you could have a superpower, it would be\u2026',
    choices: [
      { index: 0, text: 'Seeing every stack trace in real time', scores: { 'Debugging Ducks': 3 } },
      {
        index: 1,
        text: 'Knowing the answer to everything \u2014 only in the form of a question',
        scores: { 'Philosopher Ducks': 2, 'Limited Editions': 1 },
      },
      { index: 2, text: 'Breathing underwater', scores: { 'Maritime Ducks': 3 } },
      {
        index: 3,
        text: 'Radiating serenity to everyone around you',
        scores: { 'Wellness Ducks': 3 },
      },
    ],
  },
  {
    index: 5,
    text: "The item you'd never leave home without is\u2026",
    choices: [
      { index: 0, text: 'A rubber duck on your desk', scores: { 'Debugging Ducks': 3 } },
      {
        index: 1,
        text: 'A worn copy of \u2018Meditations\u2019',
        scores: { 'Philosopher Ducks': 3 },
      },
      { index: 2, text: 'A compass', scores: { 'Maritime Ducks': 3 } },
      { index: 3, text: 'A lavender essential oil roller', scores: { 'Wellness Ducks': 3 } },
    ],
  },
]);

/**
 * Tallies category scores from an array of answers, then returns the winning
 * category string. Ties are broken alphabetically (A–Z) until one winner remains.
 *
 * @param {Array<{questionIndex: number, choiceIndex: number}>} answers
 * @returns {string} Winning category name
 */
export function scoreQuiz(answers) {
  const totals = {};

  for (const { questionIndex, choiceIndex } of answers) {
    const choice = QUIZ_QUESTIONS[questionIndex].choices[choiceIndex];
    for (const [category, points] of Object.entries(choice.scores)) {
      totals[category] = (totals[category] ?? 0) + points;
    }
  }

  // Sort descending by score, then ascending by category name for tie-breaking
  const ranked = Object.entries(totals).sort(([catA, scoreA], [catB, scoreB]) => {
    if (scoreB !== scoreA) return scoreB - scoreA;
    return catA.localeCompare(catB);
  });

  return ranked[0][0];
}

const CATEGORY_MESSAGES = {
  'Debugging Ducks':
    'You are methodical, relentless, and your rubber duck is your most trusted peer reviewer.',
  'Philosopher Ducks':
    'You are thoughtful, curious, and you answer every question with a deeper question.',
  'Maritime Ducks':
    'You are adventurous, bold, and you navigate life like a captain of the open sea.',
  'Wellness Ducks': 'You are calm, grounding, and you bring serenity to every coding session.',
  'Limited Editions':
    'You are rare, eccentric, and utterly one of a kind \u2014 just like your duck.',
};

/**
 * Returns a short personalized message for the given duck category.
 *
 * @param {string} category
 * @returns {string}
 */
export function getPersonalizedMessage(category) {
  return CATEGORY_MESSAGES[category] ?? 'You have found your rubber duck soulmate.';
}
