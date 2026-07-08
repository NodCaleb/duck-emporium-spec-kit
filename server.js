import 'dotenv/config';
import { openDatabase } from './src/db/database.js';
import { runMigrations } from './src/db/migrations.js';
import { seedDatabase } from './src/db/seed.js';
import { createApp } from './src/app.js';

const db = openDatabase(process.env.DB_PATH ?? './duck-emporium.db');
runMigrations(db);
console.log(`[${new Date().toISOString()}] Database initialized`);

const seeded = seedDatabase(db);
if (seeded > 0) {
  console.log(`[${new Date().toISOString()}] Seeded ${seeded} ducks`);
}

const app = createApp(db);
const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
