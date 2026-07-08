# Research: The Rubber Duck Emporium

**Branch**: `001-rubber-duck-emporium` | **Date**: 2026-07-08 | **Phase**: 0

All technology choices for this project are fixed by the constitution. No open questions remain from the feature spec; the Clarifications section in `spec.md` already resolved every ambiguity. This document records rationale and implementation patterns for all non-trivial design decisions.

---

## 1. Express Project Structure

**Decision**: Single `src/` monolith with sub-folders for `db/`, `routes/`, `services/`, `middleware/`, and `public/`. Entry point is `server.js` at the project root. Express app is exported from `src/app.js` (factory pattern) so tests can import it without binding to a port.

**Rationale**: Separating route handlers from business logic allows unit testing of services in isolation. The factory pattern (exporting an `app` from `src/app.js` and calling `app.listen()` only in `server.js`) is the standard Express pattern for Vitest/supertest integration tests.

**Alternatives considered**: Flat file layout rejected — routes, services, and middleware would become unmanageable across 9 feature areas. MVC pattern rejected — unnecessary layer for this scale; direct service calls from routes are sufficient.

---

## 2. SQLite Schema & Connection Management

**Decision**: A single shared `Database` instance created once at startup and passed via module-level singleton (not request-scoped). Tables are created with `CREATE TABLE IF NOT EXISTS` in `src/db/migrations.js`. Seed data is inserted only when the `ducks` table is empty.

**Rationale**: `better-sqlite3` is synchronous; a single connection avoids WAL mode complexity. `CREATE TABLE IF NOT EXISTS` makes migration re-entrant (idempotent). A top-level singleton is safe because Node.js is single-threaded and `better-sqlite3` is blocking.

**Alternatives considered**: Connection-per-request pattern rejected — unnecessary overhead for a single-threaded synchronous driver. Migration library (e.g., knex-migrate) rejected — YAGNI; one migration file at this scope is sufficient.

---

## 3. Atomic Checkout Transaction

**Decision**: `better-sqlite3`'s `.transaction()` wrapper is used for the checkout service. The transaction sequence is:
1. Re-fetch current stock for each line item (SELECT … FOR UPDATE equivalent via exclusive transaction).
2. Validate each line item's quantity ≤ current stock; abort if any fails.
3. Decrement stock for all line items (UPDATE ducks SET stock = stock - ? WHERE id = ?).
4. Insert the order record into `orders`.
5. Insert order line items into `order_items`.

The in-memory cart is cleared **after** the transaction commits successfully.

**Rationale**: SQLite's serialized writes mean a `BEGIN IMMEDIATE` transaction (which `better-sqlite3` uses for `.transaction()`) prevents concurrent stock races (SC: "Concurrent checkout" edge case). If any step throws, `better-sqlite3` automatically rolls back.

**Alternatives considered**: Application-level optimistic locking rejected — race condition not fully eliminated without DB-level transaction. Two-phase approach (validate then transact) rejected — the validation and mutation must be atomic.

---

## 4. In-Memory Cart Store

**Decision**: A module-level `Map<sessionId, CartItem[]>` in `src/services/cart.js`. Session ID comes from the `X-Session-ID` request header (client-provided UUID). No persistence; cart is lost on server restart (explicitly out of scope per spec).

**Rationale**: Spec FR-012 says cross-session persistence is not required. SQLite storage for carts would add transactional complexity with no spec benefit. An in-memory Map is the simplest correct implementation.

**Session ID validation**: The `requireSession.js` middleware rejects requests missing `X-Session-ID` with HTTP 400. No server-side session ID generation is needed — the client generates the UUID.

**Alternatives considered**: Redis/external store rejected — YAGNI + external dependency. Cookie-based sessions rejected — adds a dependency (express-session) not mentioned in the constitution.

---

## 5. Duck of the Day Formula

**Decision**:
```js
const eligibleDucks = db.prepare(
  'SELECT * FROM ducks WHERE stock > 0 ORDER BY id ASC'
).all();
if (eligibleDucks.length === 0) return null; // friendly fallback
const dayOfYear = getDayOfYear(new Date()); // 1-indexed, 1..366
const index = (dayOfYear - 1) % eligibleDucks.length;
return eligibleDucks[index];
```

`getDayOfYear` is a pure function (accepts a `Date`, returns integer 1–366) so it can be unit-tested with mocked dates.

**Rationale**: FR-031 specifies `dayOfYear % eligibleInStockDucks.length` using insertion-order (DB row ID ascending). Using `(dayOfYear - 1) % length` maps day 1 → index 0 cleanly. No state is stored; the result is fully deterministic for a given day and catalog state.

**Alternatives considered**: Storing a "current duck of the day" pointer in DB rejected — adds state that can get out of sync. Caching in memory rejected — not needed for low-traffic workshop use and adds invalidation complexity.

---

## 6. Quiz Scoring Algorithm

**Decision**:
```js
function scoreQuiz(answers) {
  // answers: [{ questionIndex: 0, choiceIndex: 1 }, ...]
  const scores = {}; // { categoryName: totalScore }
  for (const { questionIndex, choiceIndex } of answers) {
    const question = QUIZ_QUESTIONS[questionIndex];
    const choice = question.choices[choiceIndex];
    for (const [category, points] of Object.entries(choice.scores)) {
      scores[category] = (scores[category] ?? 0) + points;
    }
  }
  // Sort by score descending, then alphabetically for tie-breaking
  const sorted = Object.entries(scores).sort(([catA, scoreA], [catB, scoreB]) => {
    if (scoreB !== scoreA) return scoreB - scoreA;
    return catA.localeCompare(catB);
  });
  return sorted[0][0]; // winning category name
}
```

Quiz questions are defined as a static constant in `src/services/quiz.js` (not stored in DB — they never change).

**Rationale**: Pure function with no side effects satisfies FR-039 (deterministic), FR-040 (no persistent state), and FR-038 (alphabetical tie-breaking). Sorting once on all entries handles multi-way ties correctly.

**Alternatives considered**: Iterative elimination rejected — sorting is simpler and equivalent for this scale. DB-backed questions rejected — static data with no runtime mutation; YAGNI.

---

## 7. Search and Filter Implementation

**Decision**: SQL-level filtering using parameterized queries. Free-text search uses `LIKE '%' || ? || '%'` applied to `name`, `tagline`, and `description` columns (case-insensitive via SQLite's default `NOCASE` collation for ASCII). Filters compose with `AND` clauses built dynamically at query time.

Example pattern:
```js
const clauses = ['1=1'];
const params = [];
if (search) {
  clauses.push('(name LIKE ? OR tagline LIKE ? OR description LIKE ?)');
  params.push(`%${search}%`, `%${search}%`, `%${search}%`);
}
if (category) {
  clauses.push('category = ?');
  params.push(category);
}
// minPrice / maxPrice similar
const sql = `SELECT * FROM ducks WHERE ${clauses.join(' AND ')}`;
```

**Rationale**: SQL-level filtering is efficient for the expected catalog size and avoids loading all ducks into memory. `LIKE` with SQLite's default case folding satisfies FR-021 (case-insensitive). Parameterized queries prevent SQL injection.

**Alternatives considered**: JS-level `Array.filter()` on all ducks rejected — functional but wastes memory and scales poorly. SQLite FTS5 extension rejected — YAGNI for a small catalog; `LIKE` is sufficient and simpler.

---

## 8. Admin Authentication Middleware

**Decision**: `src/middleware/adminAuth.js` reads `process.env.ADMIN_PASSWORD` at request time (not cached at startup) and compares it to the `X-Admin-Password` request header using a constant-time string comparison. Returns HTTP 401 with `{ "success": false, "error": "Unauthorized" }` on mismatch or missing header.

**Rationale**: Reading the env var at request time means a `.env` change takes effect on next request without a server restart (useful for workshops). Constant-time comparison prevents timing attacks (good habit even in a workshop context).

**Alternatives considered**: Hard-coded password rejected — violates Principle V. JWT rejected — overkill for a single shared password. Basic Auth rejected — adds dependency and non-standard format for a simple admin use case.

---

## 9. Error Handling Strategy

**Decision**: A global Express error handler in `src/middleware/errorHandler.js` catches all unhandled errors thrown from route handlers or services and returns `{ "success": false, "error": "<message>" }` with an appropriate HTTP status code. Route-level validation errors are thrown as custom `ValidationError` instances (with `statusCode` and `field` properties) so the global handler can format them correctly.

**Rationale**: Centralizing error formatting ensures Principle I is enforced uniformly without duplicating envelope logic in every route handler. Named error subclasses make status code mapping explicit and testable.

**Alternatives considered**: Per-route try/catch with manual response formatting rejected — violates DRY and is error-prone across 10+ routes. Express `express-async-errors` package considered — small but adds a dependency; instead, all async route handlers are wrapped with a thin `asyncHandler` utility.

---

## 10. Frontend Routing Strategy

**Decision**: The frontend is a single HTML file (`src/public/index.html`) that uses the browser's History API (`pushState`) for client-side navigation between views (catalog, detail, cart, checkout, quiz, duck-of-the-day). The Express server responds to `GET /` and `GET /app` with the HTML file. All other routes are handled by the JS in `app.js`.

**Rationale**: No build step, no framework, no separate pages — aligns with Principle IV. The History API provides clean URLs without hash fragments. A single `catch-all` route on the Express server (only for non-`/api` paths) ensures direct URL loads work.

**Alternatives considered**: Hash-based routing rejected — works but produces less professional URLs (`/#/cart`). Multiple HTML files rejected — duplicates navigation chrome; harder to maintain. SPA framework (React/Vue) rejected — explicitly prohibited by Principle IV.
