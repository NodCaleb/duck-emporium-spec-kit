# Tasks: The Rubber Duck Emporium

**Input**: Design documents from `specs/001-rubber-duck-emporium/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Included — Constitution Principle II mandates Test-First as **NON-NEGOTIABLE** for all acceptance scenarios. Every task phase includes tests that must be written and **failing** before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US9, maps to user stories from spec.md)
- Include exact file paths in all task descriptions

## Path Conventions

- Source: `src/` at repository root
- Tests: `tests/unit/` and `tests/integration/`
- Static frontend: `src/public/`
- Entry point: `server.js` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and tooling configuration

- [X] T001 Initialize Node.js project: create `package.json` with `"type": "module"`, `scripts.start: "node server.js"`, `scripts.test: "vitest run"`, dependencies (`express`, `better-sqlite3`, `dotenv`, `uuid`), and devDependencies (`vitest`, `supertest`, `eslint`, `prettier`)
- [X] T002 [P] Configure Vitest in `vitest.config.js`: set `globals: true`, `environment: "node"`, `include: ["tests/**/*.test.js"]`, and a test timeout of 10 000 ms
- [X] T003 [P] Configure ESLint in `.eslintrc.json` (ES2022 modules, Node.js globals) and Prettier in `.prettierrc` (single quotes, trailing commas, 100-char print width)
- [X] T004 Create `.env.example` with three lines: `ADMIN_PASSWORD=`, `PORT=3000`, `DB_PATH=./duck-emporium.db`
- [X] T005 Create project directory scaffold via `mkdir -p`: `src/db/`, `src/routes/`, `src/services/`, `src/middleware/`, `src/public/`, `tests/unit/`, `tests/integration/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database layer, shared middleware, and Express app factory — must complete before any user story begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create `src/db/database.js`: export `openDatabase(path)` that returns a `better-sqlite3` `Database` instance; when `path` is `':memory:'` or `process.env.NODE_ENV === 'test'`, open an in-memory DB; enable WAL mode for the file-based instance
- [X] T007 Create `src/db/migrations.js`: export `runMigrations(db)` that executes `CREATE TABLE IF NOT EXISTS` for `ducks` (id, name UNIQUE, category CHECK, price CHECK >0, tagline, description, personality_traits TEXT, stock CHECK >=0, created_at), `orders` (id TEXT PK, shipping_name, shipping_email, shipping_address, card_string, total, created_at), and `order_items` (id AUTOINCREMENT, order_id FK, duck_id FK, duck_name, quantity CHECK >0, unit_price) as specified in `specs/001-rubber-duck-emporium/data-model.md`
- [X] T008 Create `src/db/seed.js`: export `seedDatabase(db)` that inserts exactly 10 ducks across all 5 categories (Debugging Ducks, Philosopher Ducks, Maritime Ducks, Wellness Ducks, Limited Editions) with realistic names, taglines, descriptions, personality traits, prices > 0, and stock values including at least one zero-stock duck; is a no-op if any rows already exist in `ducks`
- [X] T009 [P] Create `src/middleware/errorHandler.js`: four-argument Express error-handling middleware `(err, req, res, next)` that returns `{ "success": false, "error": "<err.message or 'Internal server error'>" }` with the appropriate HTTP status code (defaulting to 500); never exposes stack traces in the response body
- [X] T010 [P] Create `src/middleware/requireSession.js`: Express middleware that reads the `X-Session-ID` request header and calls `next()` if non-empty; otherwise responds with HTTP 400 `{ "success": false, "error": "X-Session-ID header is required" }`
- [X] T011 [P] Create `src/middleware/adminAuth.js`: Express middleware that reads the `X-Admin-Password` header, compares it (using constant-time comparison) to `process.env.ADMIN_PASSWORD`; responds with HTTP 401 `{ "success": false, "error": "Unauthorized" }` if the header is missing, empty, or does not match
- [X] T012 Create `src/app.js`: export `createApp(db)` factory that creates an Express instance, applies `express.json()`, mounts all route modules under `/api/` (catalog, cart, checkout, admin, duckOfTheDay, quiz), serves `src/public/` as static files at `/`, and attaches the `errorHandler` middleware last
- [X] T013 Create `server.js`: load `.env` with `dotenv/config`, call `openDatabase(process.env.DB_PATH)`, `runMigrations(db)`, `seedDatabase(db)`, `createApp(db)`, and `app.listen(process.env.PORT ?? 3000)` — log `[timestamp] Database initialized`, `[timestamp] Seeded N ducks`, `Server listening on http://localhost:<PORT>` to stdout

**Checkpoint**: Foundation is ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Browse Duck Catalog (Priority: P1) 🎯 MVP

**Goal**: A visitor can retrieve the full duck catalog listing; each duck includes name, category, price, tagline, and a computed stock label; an empty catalog returns an explicit empty state (not a blank response).

**Independent Test**: `GET /api/catalog` returns ≥ 10 ducks across ≥ 3 categories with fields `id`, `name`, `category`, `price`, `tagline`, `stockLabel` and envelope `{ "success": true, "data": { "ducks": [...], "count": N } }`. With all ducks removed, returns `{ "success": true, "data": { "ducks": [], "count": 0 } }`.

### Tests for User Story 1 ⚠️ Write FIRST — must FAIL before implementation

- [X] T014 [P] [US1] Write unit tests for the `stockLabel(stock)` pure function covering all three ranges (stock > 5 → `"In stock"`, stock 1–5 → `"Only N left"`, stock 0 → `"Sold out"`) in `tests/unit/stockLabel.test.js`
- [X] T015 [P] [US1] Write integration tests for `GET /api/catalog` — non-empty catalog returns all seeded ducks with required fields and correct envelope; empty catalog (all rows deleted) returns `{ ducks: [], count: 0 }` — in `tests/integration/catalog.test.js`

### Implementation for User Story 1

- [X] T016 [US1] Create `src/services/catalog.js`: implement `stockLabel(stock)` pure function and `listDucks(db, filters)` function (filters unused for US1 — full list only) that queries all ducks ordered by `id ASC` and adds `stockLabel` computed field to each record; `personality_traits` is JSON-parsed back to an array as `personalityTraits`
- [X] T017 [US1] Create `src/routes/catalog.js`: implement `GET /api/catalog` handler that calls `listDucks(db)` and returns `{ "success": true, "data": { "ducks": [...], "count": N } }`; mount router in `src/app.js` under `/api/catalog`

**Checkpoint**: `GET /api/catalog` returns all ducks with correct envelope and stock labels. All US1 unit and integration tests pass.

---

## Phase 4: User Story 2 — View Duck Detail (Priority: P1)

**Goal**: A visitor can retrieve the full detail record for a single duck by numeric ID; invalid or unknown IDs return clear error responses; stock labels and all fields (including `personalityTraits`) are correct.

**Independent Test**: `GET /api/catalog/1` returns all fields including `description`, `personalityTraits` (array), `stock`, and `stockLabel`. `GET /api/catalog/99999` returns HTTP 404 `{ "success": false, "error": "Duck not found" }`. `GET /api/catalog/abc` returns HTTP 400 `{ "success": false, "error": "Invalid duck ID" }`.

### Tests for User Story 2 ⚠️ Write FIRST — must FAIL before implementation

- [X] T018 [P] [US2] Extend `tests/integration/catalog.test.js` with tests for `GET /api/catalog/:id` — valid ID returns full duck record with all detail fields; unknown integer ID returns 404; non-integer `:id` returns 400; ducks with stock 1–5 show `"Only N left"`, stock 0 shows `"Sold out"`

### Implementation for User Story 2

- [X] T019 [US2] Extend `src/services/catalog.js`: add `getDuckById(db, id)` that fetches the full duck row by integer `id`, parses `personality_traits` JSON as `personalityTraits`, computes `stockLabel`, and returns `null` when no row is found
- [X] T020 [US2] Extend `src/routes/catalog.js`: add `GET /api/catalog/:id` handler — parse and validate `:id` as a positive integer (return 400 `"Invalid duck ID"` if not), call `getDuckById`, return 200 with `{ "success": true, "data": { "duck": {...} } }` or 404 `{ "success": false, "error": "Duck not found" }`

**Checkpoint**: Both catalog endpoints are fully functional. All US1 and US2 tests pass.

---

## Phase 5: User Story 3 — Add Ducks to Cart (Priority: P1)

**Goal**: A customer identified by `X-Session-ID` can add ducks to a session-scoped in-memory cart, update quantities, remove items, and view cart contents with a computed running total; adding beyond available stock is rejected with a clear message.

**Independent Test**: Within one session — add duck 1 → update qty to 3 → add duck 2 → remove duck 1 → `GET /api/cart` returns only duck 2 with correct `lineTotal` and `cartTotal`. Attempt to add 100 units of a duck with stock 5 → HTTP 409.

### Tests for User Story 3 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T021 [P] [US3] Write integration tests covering all 5 cart acceptance scenarios (add item default qty 1, update qty, remove item, stock-exceeded rejection → 409, view total) plus missing `X-Session-ID` → 400 for all cart endpoints (`GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:duckId`, `DELETE /api/cart/items/:duckId`) in `tests/integration/cart.test.js`

### Implementation for User Story 3

- [ ] T022 [US3] Create `src/services/cart.js`: module-level `Map<sessionId, CartItem[]>` store; implement `getCart(db, sessionId)` (resolves duck names and prices from DB, computes `lineTotal` per item and `cartTotal`), `addToCart(db, sessionId, duckId, quantity)` (validates duck exists, checks stock ≥ existing + new qty), `updateCartItem(db, sessionId, duckId, quantity)` (quantity 0 removes item; checks stock), and `removeCartItem(sessionId, duckId)`; export `clearCart(sessionId)` for checkout use
- [ ] T023 [US3] Create `src/routes/cart.js`: mount `requireSession` on all routes; implement `GET /api/cart` (returns cart contents), `POST /api/cart/items` (validates `duckId` integer + optional `quantity ≥ 1`), `PATCH /api/cart/items/:duckId` (validates `duckId` + `quantity`), `DELETE /api/cart/items/:duckId`; return 404 when duck not found, 409 when stock exceeded; mount router in `src/app.js` under `/api/cart`

**Checkpoint**: Full cart CRUD works within a session. Stock exceeded → 409. Missing session → 400. All US3 tests pass.

---

## Phase 6: User Story 4 — Checkout with Mocked Payment (Priority: P1)

**Goal**: A customer can submit a checkout from a non-empty cart; an order is created with a unique ID, stock is atomically decremented, the cart is cleared, and a confirmation summary is returned; orders survive application restarts.

**Independent Test**: POST valid checkout body from a non-empty cart → 201 with `order.id`, `order.items`, `order.total`, `order.createdAt`. Re-open the DB file after restart → the order record is still present. POST checkout when one item has since sold out → 409 identifying the out-of-stock duck.

### Tests for User Story 4 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T024 [P] [US4] Write integration tests for `POST /api/checkout` covering all 4 acceptance scenarios — success path (201, order created, stock decremented, cart cleared, confirmation returned), invalid/empty email (400 field-level error), out-of-stock at submission (409 naming the duck), order persistence (order row survives DB re-open) — in `tests/integration/checkout.test.js`

### Implementation for User Story 4

- [ ] T025 [US4] Create `src/services/checkout.js`: implement `processCheckout(db, sessionId, formData)` — validate `shippingName`, `email` (regex `/.+@.+\..+/`), `shippingAddress`, `cardString` (all non-empty; field-level error messages); wrap the following in a `db.transaction()`: re-fetch current stock for each cart item, validate quantity ≤ stock (throw 409 error naming the duck on failure), decrement stock via `UPDATE ducks SET stock = stock - ? WHERE id = ?`, insert row into `orders` (UUID v4 id), insert rows into `order_items`; after transaction commits, call `clearCart(sessionId)`; return the full order record
- [ ] T026 [US4] Create `src/routes/checkout.js`: mount `requireSession` middleware; implement `POST /api/checkout` — check cart is non-empty (400 `"Cart is empty"` if not), call `processCheckout`, return 201 `{ "success": true, "data": { "order": {...} } }` on success; handle 409 conflict errors from service; mount router in `src/app.js` under `/api/checkout`

**Checkpoint**: Complete purchase flow works end-to-end. Orders persist through restart. All US4 tests pass. **P1 MVP is fully deliverable at this point.**

---

## Phase 7: User Story 5 — Search and Filter Catalog (Priority: P2)

**Goal**: A customer can narrow the catalog with free-text search (case-insensitive, matches name/tagline/description) and/or category filter and/or min/max price range; all active filters compose with AND logic; no-match returns `{ ducks: [], count: 0 }`.

**Independent Test**: `GET /api/catalog?search=debug` → only ducks with "debug" in name/tagline/description. `GET /api/catalog?category=Maritime+Ducks&minPrice=10&maxPrice=20` → only matching ducks. `GET /api/catalog?minPrice=999` → `{ ducks: [], count: 0 }`. `GET /api/catalog?minPrice=abc` → 400.

### Tests for User Story 5 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T027 [P] [US5] Extend `tests/integration/catalog.test.js` with tests for `GET /api/catalog` query parameters — free-text only, category only, `minPrice` only, `maxPrice` only, all three combined, no-match returns empty state, invalid numeric values → 400 for `minPrice` and `maxPrice`

### Implementation for User Story 5

- [ ] T028 [US5] Extend `src/services/catalog.js`: update `listDucks(db, filters)` to accept `{ search, category, minPrice, maxPrice }` — build a parameterized SQL query that AND-composes active filters: `LOWER(name) LIKE ? OR LOWER(tagline) LIKE ? OR LOWER(description) LIKE ?` for `search`; `category = ?` for category; `price >= ?` and/or `price <= ?` for price bounds; return results with `stockLabel`
- [ ] T029 [US5] Extend `src/routes/catalog.js`: in the `GET /api/catalog` handler, parse `req.query` for `search`, `category`, `minPrice`, `maxPrice`; validate that `minPrice` and `maxPrice`, when present, are valid finite numbers (return 400 `"minPrice must be a number"` / `"maxPrice must be a number"` otherwise); pass parsed filters to `listDucks`

**Checkpoint**: All filter combinations work and compose correctly. Empty-result queries return `{ ducks: [], count: 0 }`. All US5 tests pass.

---

## Phase 8: User Story 6 — Curator Adds a New Duck (Priority: P2)

**Goal**: An authenticated admin (via `X-Admin-Password` header) can add a new duck via `POST /api/catalog`; the duck is immediately visible in the catalog; duplicate names, negative prices, and negative stock are each rejected with a distinct error message; every attempt is logged to stdout.

**Independent Test**: POST with correct password + complete valid body → 201, duck appears in `GET /api/catalog`. POST with wrong password → 401. POST with duplicate name → 409. POST `price: -5` → 400 `"price must be a positive number"`. POST `stock: -1` → 400 `"stock must be a non-negative integer"`.

### Tests for User Story 6 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T030 [P] [US6] Write integration tests for `POST /api/catalog` covering all 5 acceptance scenarios — successful add (201, duck in catalog), wrong/missing password (401), duplicate name (409), negative price/stock (400 with distinct messages), stdout log entry present on success — in `tests/integration/admin.test.js`

### Implementation for User Story 6

- [ ] T031 [US6] Create `src/routes/admin.js`: implement `POST /api/catalog` handler — apply `adminAuth` middleware; validate all required fields (`name`, `category`, `price`, `tagline`, `description`, `personalityTraits`, `stock`) with the exact error messages specified in `specs/001-rubber-duck-emporium/contracts/admin.md`; check `category` is one of the 5 fixed values; on validation pass, `console.log` a timestamped entry (`[ISO] Admin: adding duck "<name>"`, no PII); insert duck into `ducks` table with `personality_traits` as JSON string; `console.log` outcome; return 201 with full duck record including `stockLabel` and `createdAt`; handle UNIQUE constraint violation as 409 `"A duck named '<name>' already exists"`; mount router in `src/app.js` (POST `/api/catalog` must not conflict with GET `/api/catalog`)
- [ ] T032 [US6] Add input-validation helper inside `src/routes/admin.js`: `validateDuckInput(body)` returns an array of `{ field, message }` errors — covers `name` (non-empty), `category` (one of 5 values, exact case-sensitive match), `price` (number > 0), `tagline` (non-empty), `description` (non-empty), `personalityTraits` (non-empty array of non-empty strings), `stock` (integer ≥ 0); return first error as 400 response with the contracts-specified message

**Checkpoint**: Admin endpoint is secured and functional. Catalog grows in real time. All US6 tests pass.

---

## Phase 9: User Story 7 — Web Frontend (Priority: P2)

**Goal**: A browser-based SPA served at the root URL (`GET /`) allows a visitor to browse the catalog, view duck detail, manage a cart, complete checkout, see the Duck of the Day, and take the quiz — all in vanilla HTML/CSS/JS with no build step; layout is responsive and requires no horizontal scroll at 375 px.

**Independent Test**: Open `http://localhost:3000/` — catalog page loads with all ducks and search/filter controls. Click a duck → detail view shows full description, traits, stock, and "Add to Cart". Navigate to cart → quantity controls and running total displayed. Complete checkout form → order confirmation screen with order ID. Resize to 375 px → no horizontal scroll on any page.

### Implementation for User Story 7

- [ ] T033 [P] [US7] Create `src/public/index.html`: SPA shell with named `<section>` elements for catalog, duck-detail, cart, checkout, order-confirmation, duck-of-the-day, and quiz views (all hidden via CSS class except catalog); global nav bar with Cart and Quiz links; include `<link rel="stylesheet" href="/style.css">` and `<script type="module" src="/app.js"></script>`
- [ ] T034 [P] [US7] Create `src/public/style.css`: mobile-first responsive layout (375 px baseline) using CSS flexbox/grid; styles for: catalog duck-card grid, duck detail view, cart item list, checkout form, order confirmation panel, Duck of the Day banner, quiz question cards; ensure no horizontal overflow at any supported viewport width
- [ ] T035 [US7] Create `src/public/app.js`: vanilla ES module implementing all frontend behaviour — generate and persist `X-Session-ID` UUID in `sessionStorage`; `fetchAPI(method, path, body)` wrapper that reads the envelope and throws on `success: false`; `showView(name)` router; implement catalog view (fetch + render ducks, search/filter controls that call `GET /api/catalog` with params), duck detail view (`GET /api/catalog/:id`, "Add to Cart" button), cart view (`GET/POST/PATCH/DELETE /api/cart/items`, quantity controls, running total), checkout form (`POST /api/checkout`, order confirmation), Duck of the Day banner (`GET /api/duck-of-the-day`), quiz view (`GET /api/quiz` questions, answer selection, `POST /api/quiz` submission, recommendation display); display human-friendly error messages for 400, 404, and 409 API responses — never a raw object or blank screen
- [ ] T036 [US7] Verify `src/app.js` mounts `express.static(path.join(import.meta.dirname, 'public'))` before the API router and adds a catch-all `GET *` → `res.sendFile('index.html')` so all SPA routes load the shell; confirm Duck of the Day and quiz routes are registered in `createApp`

**Checkpoint**: Full end-to-end browser flow works — browse → detail → cart → checkout → confirmation. Duck of the Day and quiz accessible. Responsive at 375 px. API errors shown as friendly messages. FR-041–FR-046 all satisfied.

---

## Phase 10: User Story 8 — Duck of the Day (Priority: P3)

**Goal**: A visitor sees a deterministically selected featured duck for the current calendar day (formula: `(dayOfYear - 1) % eligibleInStockDucks.length`); sold-out ducks are skipped from the eligible pool; when all ducks are sold out a friendly fallback message is returned at HTTP 200 (never an error).

**Independent Test**: `GET /api/duck-of-the-day` called 10 times on the same date → same duck every time. Force all ducks `stock = 0` → `{ "success": true, "data": { "duck": null, "message": "The pond is empty today, come back tomorrow." } }`. Restore one duck to stock 1 → that duck is returned.

### Tests for User Story 8 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T037 [P] [US8] Write unit tests for `getDayOfYear(date)` pure function (day 1 = Jan 1, day 366 = Dec 31 leap, boundary values) and the index formula `(dayOfYear - 1) % N` with mocked inputs in `tests/unit/duckOfTheDayFormula.test.js`
- [ ] T038 [P] [US8] Write integration tests for `GET /api/duck-of-the-day` — same-day consistency (multiple requests return same duck), sold-out duck is not selected (skip to next eligible), all ducks sold out returns 200 with `{ duck: null, message: "..." }` (not a 4xx or 5xx) — in `tests/integration/duckOfTheDay.test.js`

### Implementation for User Story 8

- [ ] T039 [US8] Create `src/services/duckOfTheDay.js`: implement `getDayOfYear(date)` pure function returning integer 1–366; implement `getDuckOfTheDay(db, date = new Date())` that queries `SELECT * FROM ducks WHERE stock > 0 ORDER BY id ASC`, returns `null` when the array is empty, otherwise returns `eligibleDucks[(getDayOfYear(date) - 1) % eligibleDucks.length]` with `stockLabel` and `personalityTraits` parsed
- [ ] T040 [US8] Create `src/routes/duckOfTheDay.js`: implement `GET /api/duck-of-the-day` — call `getDuckOfTheDay(db)`, return `{ "success": true, "data": { "duck": {...}, "detailUrl": "/api/catalog/:id" } }` when a duck is found, or `{ "success": true, "data": { "duck": null, "message": "The pond is empty today, come back tomorrow." } }` when `null`; mount router in `src/app.js` under `/api/duck-of-the-day`

**Checkpoint**: Duck of the Day is deterministic per calendar day, skips sold-out ducks, handles all-sold-out state with 200 + friendly message. All US8 tests pass.

---

## Phase 11: User Story 9 — "Which Duck Are You?" Personality Quiz (Priority: P3)

**Goal**: A visitor retrieves 6 fixed multiple-choice questions, submits exactly 6 answers, and receives a deterministic duck recommendation with personalized message and detail link; category ties are broken alphabetically ascending; submitting the quiz creates no persistent state changes.

**Independent Test**: Submit all-A answers → recommended category is `"Debugging Ducks"`. Submit answers designed to tie `"Debugging Ducks"` and `"Maritime Ducks"` → `"Debugging Ducks"` wins (alphabetically first). Submit same answers twice → exact same duck returned both times. Check `ducks` table row counts before and after → unchanged.

### Tests for User Story 9 ⚠️ Write FIRST — must FAIL before implementation

- [ ] T041 [P] [US9] Write unit tests for `scoreQuiz(answers)` — single category winner returned correctly, alphabetical tie-breaking (multiple tie scenarios), same answers always return same category, all-A answers resolve to `"Debugging Ducks"` — in `tests/unit/quizScoring.test.js`
- [ ] T042 [P] [US9] Write integration tests for `GET /api/quiz` (returns exactly 6 questions, each with 4 choices, no `scores` field exposed) and `POST /api/quiz` (deterministic recommendation, tie-breaking, missing field → 400, wrong number of answers → 400, no DB state changes verified) — in `tests/integration/quiz.test.js`

### Implementation for User Story 9

- [ ] T043 [US9] Create `src/services/quiz.js`: define frozen `QUIZ_QUESTIONS` array with all 6 questions and 4 choices each, including the full score maps from `specs/001-rubber-duck-emporium/spec.md` (Q3 choice A: Debugging +2 / Philosopher +1; Q3 choice C: Maritime +2 / Limited Editions +1; Q5 choice B: Philosopher +2 / Limited Editions +1; all others +3 single category); implement `scoreQuiz(answers)` that tallies category scores, sorts by score descending then category name ascending for tie-breaking, and returns the winning category string; implement `getPersonalizedMessage(category)` returning a distinct short message for each of the 5 categories
- [ ] T044 [US9] Create `src/routes/quiz.js`: implement `GET /api/quiz` (returns all 6 questions with `index`, `text`, and `choices[{ index, text }]` — no score maps) and `POST /api/quiz` (validate `answers` array has exactly 6 elements with `questionIndex` 0–5 and `choiceIndex` 0–3, no duplicate `questionIndex`; call `scoreQuiz`; query `SELECT * FROM ducks WHERE category = ? ORDER BY id ASC LIMIT 1` for the winning category; return `{ "success": true, "data": { "recommendedCategory": "...", "duck": {...}, "message": "...", "detailUrl": "/api/catalog/:id" } }`); mount router in `src/app.js` under `/api/quiz`

**Checkpoint**: Quiz returns deterministic results, tie-breaking works per spec, no DB writes on POST. All US9 tests pass.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final code quality pass and end-to-end validation against quickstart.md

- [ ] T045 [P] Run ESLint across all source and test files and fix all reported issues: `npx eslint src/ tests/ server.js --fix`
- [ ] T046 [P] Run Prettier across all source and test files: `npx prettier --write src/ tests/ server.js .eslintrc.json .prettierrc`
- [ ] T047 Perform quickstart.md validation: `npm install`, `cp .env.example .env` (set `ADMIN_PASSWORD=quack123`), `node server.js` — verify stdout shows `Database initialized`, `Seeded N ducks`, and `Server listening on http://localhost:3000` with no errors
- [ ] T048 Run full test suite and verify zero failures: `npx vitest run` — all 46 acceptance scenario tests across `tests/unit/` and `tests/integration/` must pass with no skips

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–11)**: All require Foundational phase (Phase 2) to be complete
  - P1 stories (US1–US4, Phases 3–6) are the MVP — deliver these first
  - P2 stories (US5–US7, Phases 7–9) extend P1 code or consume the API
  - P3 stories (US8–US9, Phases 10–11) are independent engagement features
- **Polish (Phase 12)**: Requires all desired story phases to be complete

### User Story Dependencies

| Story | Priority | Phase | Depends On | Notes |
|-------|----------|-------|------------|-------|
| US1 — Browse Catalog | P1 | 3 | Foundation | Independent entry point; establishes catalog route/service |
| US2 — Duck Detail | P1 | 4 | US1 | Extends same `catalog.js` route and service files |
| US3 — Cart | P1 | 5 | Foundation + US1 (duck lookup) | In-memory store; needs `ducks` table |
| US4 — Checkout | P1 | 6 | Foundation + US1 + US3 | Atomic transaction; clears cart from US3 |
| US5 — Search/Filter | P2 | 7 | US1 | Extends same `catalog.js` files; zero new files |
| US6 — Curator Admin | P2 | 8 | Foundation | Isolated admin endpoint; independent of other stories |
| US7 — Web Frontend | P2 | 9 | US1–US6 complete | Consumes all APIs; no new backend routes introduced |
| US8 — Duck of the Day | P3 | 10 | Foundation | Independent feature; reads `ducks` table only |
| US9 — Personality Quiz | P3 | 11 | Foundation + US1 (duck lookup for result) | Static questions constant; single DB read on POST |

### Within Each User Story

1. **Tests FIRST** — write all test tasks before any implementation task; tests must fail
2. **Services before routes** — routes call services; service logic must exist first
3. **Mount routes in `src/app.js`** — after implementing a route, register it in `createApp`
4. **Verify checkpoint** — confirm the story's independent test passes before advancing

### Parallel Opportunities

- **Phase 1**: T002 (Vitest config) ‖ T003 (ESLint/Prettier config) — different files
- **Phase 2**: T009 (errorHandler) ‖ T010 (requireSession) ‖ T011 (adminAuth) — three independent middleware files
- **Phase 3**: T014 (unit tests) ‖ T015 (integration tests) — both test files can be written simultaneously
- **Phase 4**: T018 — single test file extension, written before T019/T020
- **Phase 9**: T033 (index.html) ‖ T034 (style.css) — no interdependency until T035 wires them
- **Phase 10**: T037 (unit tests) ‖ T038 (integration tests) — written simultaneously before T039/T040
- **Phase 11**: T041 (unit tests) ‖ T042 (integration tests) — written simultaneously before T043/T044
- **Phase 12**: T045 (ESLint) ‖ T046 (Prettier) — independent tools

---

## Parallel Execution Examples

### User Story 1 (Browse Duck Catalog)

```
[Phase 2 complete]
  ├──► T014 [P] stockLabel unit tests ──────────────────────────────────────► T016 catalog service ──► T017 catalog route
  └──► T015 [P] catalog integration tests ──────────────────────────────────►
```

### User Story 3 (Cart)

```
[Foundation complete + US1 done]
  └──► T021 [P] cart integration tests ──► T022 cart service ──► T023 cart routes
```

### User Story 8 (Duck of the Day)

```
[Foundation complete]
  ├──► T037 [P] DOTD unit tests ──────────────────────────────────────────► T039 DOTD service ──► T040 DOTD route
  └──► T038 [P] DOTD integration tests ───────────────────────────────────►
```

---

## Implementation Strategy

### MVP Scope (Phase 1 + 2 + 3 + 4 + 5 + 6 = US1–US4)

Deliver these phases first to produce a fully working e-commerce loop:

1. **Phase 1 + 2** — shared infrastructure (no user-visible features yet)
2. **Phase 3 + 4** — US1 + US2: catalog browsing and duck detail (read-only, stateless)
3. **Phase 5** — US3: cart management (in-memory session state)
4. **Phase 6** — US4: checkout (persistent orders, atomic transactions)

At this milestone all 4 P1 user stories are done and the store is fully usable via API.

### Incremental Delivery After MVP

| Step | Phase | Adds |
|------|-------|------|
| 5 | Phase 7 | US5: search and filter (low-risk extension of existing catalog code) |
| 6 | Phase 8 | US6: curator admin endpoint (isolated, protected by auth) |
| 7 | Phase 9 | US7: web frontend (consumes all existing APIs; no new backend routes) |
| 8 | Phase 10 | US8: Duck of the Day (independent engagement feature) |
| 9 | Phase 11 | US9: Personality Quiz (independent engagement feature) |
| 10 | Phase 12 | Polish: lint, format, quickstart validation, full test run |
