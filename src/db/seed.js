const SEED_DUCKS = [
  // Debugging Ducks (3)
  {
    name: 'The Rubber Inquisitor',
    category: 'Debugging Ducks',
    price: 14.99,
    tagline: 'Your bugs confess everything under its silent gaze.',
    description:
      'A no-nonsense duck with an interrogation-room stare. Place it on your desk, explain your code line by line, and watch the bug reveal itself before you finish the first paragraph. Comes with a tiny magnifying glass that serves no practical purpose.',
    personality_traits: JSON.stringify(['Methodical', 'Patient', 'Judgmental']),
    stock: 42,
  },
  {
    name: 'Stack Trace Stanley',
    category: 'Debugging Ducks',
    price: 12.49,
    tagline: 'Reads your errors so you actually understand them.',
    description:
      'Stanley has seen every NullPointerException, every segfault, and every "undefined is not a function". His glassy eyes have absorbed years of stack traces, and his presence alone makes the root cause obvious. Warning: may cause feelings of shame.',
    personality_traits: JSON.stringify(['Analytical', 'Blunt', 'Relentless']),
    stock: 0,
  },
  {
    name: 'Breakpoint Betty',
    category: 'Debugging Ducks',
    price: 16.0,
    tagline: 'She pauses the chaos so you can finally think.',
    description:
      'Betty specialises in slowing everything down. Set her beside your keyboard when the world is moving too fast and your console is scrolling unreadably. She radiates a calm "let us examine this moment" energy that no debugger can replicate.',
    personality_traits: JSON.stringify(['Calm', 'Precise', 'Unflappable']),
    stock: 7,
  },

  // Philosopher Ducks (2)
  {
    name: 'Socrates the Quacker',
    category: 'Philosopher Ducks',
    price: 19.99,
    tagline: 'Answers every question with a better question.',
    description:
      'Do you know what you do not know? Socrates does — and he will make sure you do too. This duck refuses to validate your assumptions and instead leads you, via a series of increasingly uncomfortable questions, to the truth you were avoiding.',
    personality_traits: JSON.stringify(['Inquisitive', 'Provocative', 'Wise']),
    stock: 5,
  },
  {
    name: 'Existential Edwina',
    category: 'Philosopher Ducks',
    price: 21.5,
    tagline: 'If a duck ships a feature but no one reviews it, does it exist?',
    description:
      'Edwina is perpetually questioning the meaning of deployment, the nature of scope, and whether the sprint backlog is real. Ideal for late-night coding sessions when you begin to wonder if any of this matters. Spoiler: it does. Probably.',
    personality_traits: JSON.stringify(['Contemplative', 'Wry', 'Unsettling']),
    stock: 3,
  },

  // Maritime Ducks (2)
  {
    name: 'Captain Quackbeard',
    category: 'Maritime Ducks',
    price: 17.75,
    tagline: 'Sailed the seven seas. Survived the Great Merge Conflict of 2019.',
    description:
      'A battle-hardened pirate duck with a tiny tricorn hat and an eyepatch over his left eye (purely cosmetic). Quackbeard has weathered every production incident, rolled back three deploys before breakfast, and still managed to ship by Friday.',
    personality_traits: JSON.stringify(['Bold', 'Resourceful', 'Salty']),
    stock: 12,
  },
  {
    name: 'Admiral Floatington',
    category: 'Maritime Ducks',
    price: 22.0,
    tagline: 'Commands the fleet. Keeps the fleet from sinking.',
    description:
      'The Admiral oversees all operations from a position of dignified authority. He does not write the code — he ensures the code is seaworthy. His presence on a standing desk signals to your team that standards will be maintained.',
    personality_traits: JSON.stringify(['Commanding', 'Disciplined', 'Proud']),
    stock: 4,
  },

  // Wellness Ducks (2)
  {
    name: 'Mindful Mallory',
    category: 'Wellness Ducks',
    price: 15.0,
    tagline: 'Breathe in. Breathe out. Commit the fix.',
    description:
      'Mallory holds space for you and your code. When the build is red and the deadline is tomorrow, she reminds you that this too shall pass. Her lavender scent (imaginary) and serene expression have prevented countless rash git pushes.',
    personality_traits: JSON.stringify(['Serene', 'Empathetic', 'Grounding']),
    stock: 20,
  },
  {
    name: 'Recharge Reginald',
    category: 'Wellness Ducks',
    price: 13.25,
    tagline: 'No more hero-coding. Reginald insists you take a break.',
    description:
      'Reginald appears on your desk and stares at you until you close the laptop and drink some water. He is not malicious — he simply cares about sustainable velocity. Comes with a small motivational banner that reads: "Pomodoro or perish."',
    personality_traits: JSON.stringify(['Caring', 'Firm', 'Pragmatic']),
    stock: 8,
  },

  // Limited Editions (1)
  {
    name: 'Edgar Allan Poe Duck',
    category: 'Limited Editions',
    price: 34.99,
    tagline: 'Once upon a midnight deploy, while I pondered, weak and weary…',
    description:
      'A gothic collector\'s edition draped in a tiny black cloak, this duck quotes Poe under its breath when you\'re on-call. Only 50 were ever made. Its hollow, soulful gaze has been known to improve documentation quality by up to 40% (unverified). Comes with a certificate of authenticity and a sense of impending dread.',
    personality_traits: JSON.stringify(['Melancholy', 'Dramatic', 'Literary']),
    stock: 2,
  },
];

/**
 * Seeds the database with the initial set of ducks.
 * No-op if any duck rows already exist.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {number} Number of ducks inserted (0 if already seeded)
 */
export function seedDatabase(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM ducks').get();
  if (existing.count > 0) {
    return 0;
  }

  const insert = db.prepare(`
    INSERT INTO ducks (name, category, price, tagline, description, personality_traits, stock)
    VALUES (@name, @category, @price, @tagline, @description, @personality_traits, @stock)
  `);

  const insertMany = db.transaction((ducks) => {
    for (const duck of ducks) {
      insert.run(duck);
    }
    return ducks.length;
  });

  return insertMany(SEED_DUCKS);
}
