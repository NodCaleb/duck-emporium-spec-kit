# Implementation Plan: The Rubber Duck Emporium

**Branch**: `001-rubber-duck-emporium` | **Date**: 2026-07-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-rubber-duck-emporium/spec.md`

## Summary

A single-process Node.js + Express web application that serves a rubber duck e-commerce store: a RESTful JSON API backed by SQLite (`better-sqlite3`) for catalog, cart, checkout, and order persistence; a vanilla HTML/CSS/JS frontend served as static files at the root URL; and four engagement features (search/filter, Duck of the Day, personality quiz, curator admin). All 46 acceptance scenarios are covered by Vitest tests. No build step, no ORM, no UI framework.

## Technical Context

**Language/Version**: Node.js ≥ 20 LTS / JavaScript (ES2022 modules)

**Primary Dependencies**: Express 4 (HTTP), better-sqlite3 (storage), Vitest + supertest (testing), ESLint + Prettier (code style)

**Storage**: SQLite via `better-sqlite3`; file-based for dev/prod, separate in-memory DB for tests

**Testing**: Vitest — unit tests for pure logic (quiz scoring, stock labels, Duck of the Day formula); integration tests for full HTTP request-response cycles

**Target Platform**: Local/workshop server (Linux / macOS / Windows; Node.js 20 LTS)

**Project Type**: Web service + static frontend (monolith, single process)

**Performance Goals**: Search/filter results within 1 s for any valid query on a standard dev machine (SC-003); same Duck of the Day for 10+ same-day requests (SC-008)

**Constraints**: In-process filtering is sufficient for a catalog of tens to low hundreds of ducks; no horizontal scaling; no external services; single shared process

**Scale/Scope**: Single-process workshop deployment; catalog ≤ ~200 ducks; no user accounts; session carts are in-memory only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | API Contract First — all endpoints return `{ "success": true/false, "data"/"error": … }` | ✅ PASS | FR-000 mandates this; all route handlers will wrap responses in the envelope; raw Express errors must be caught by a global error handler |
| II | Test-First — every acceptance scenario has a Vitest test before feature is closed | ✅ PASS | 46 acceptance scenarios across 9 user stories; Vitest chosen per constitution; Red-Green-Refactor enforced by workflow |
| III | SQLite as SSOT — `better-sqlite3`, transactions for checkout and stock | ✅ PASS | FR-016/FR-019 require atomic stock decrement + order creation in a single transaction; all persistent data (ducks, orders) in SQLite |
| IV | Simplicity — vanilla HTML/CSS/JS, no ORM, no bundler | ✅ PASS | Frontend: static files in `src/public/`; raw SQL via `better-sqlite3`; no webpack/vite/react |
| V | Security by Default — admin password from env var, no PII in logs, input validation | ✅ PASS | FR-027 reads `ADMIN_PASSWORD` env var; FR-030 bans PII from logs; FR-013/FR-014 validate all input at HTTP boundary |

**Post-Phase-1 re-check**: All five gates still pass. No new dependencies or abstractions introduced beyond what the spec requires.

## Project Structure

### Documentation (this feature)

```text
specs/001-rubber-duck-emporium/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── catalog.md
│   ├── cart.md
│   ├── checkout.md
│   ├── admin.md
│   ├── duck-of-the-day.md
│   └── quiz.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── database.js        # DB connection factory (file or :memory:)
│   ├── migrations.js      # CREATE TABLE statements (idempotent)
│   └── seed.js            # 10+ duck seed data (idempotent; no-op if ducks exist)
├── routes/
│   ├── catalog.js         # GET /api/catalog, GET /api/catalog/:id
│   ├── cart.js            # GET/POST /api/cart/items, PATCH/DELETE /api/cart/items/:duckId
│   ├── checkout.js        # POST /api/checkout
│   ├── admin.js           # POST /api/catalog (admin)
│   ├── duckOfTheDay.js    # GET /api/duck-of-the-day
│   └── quiz.js            # GET /api/quiz/questions, POST /api/quiz/submit
├── services/
│   ├── catalog.js         # Search/filter logic, stock label formatting
│   ├── cart.js            # In-memory cart store (Map<sessionId, items>)
│   ├── checkout.js        # Transaction: stock re-validate → decrement → create order
│   ├── duckOfTheDay.js    # dayOfYear % eligibleDucks.length formula
│   └── quiz.js            # Scoring algorithm, tie-breaking
├── middleware/
│   ├── adminAuth.js       # X-Admin-Password header validation against ADMIN_PASSWORD env
│   ├── requireSession.js  # X-Session-ID header presence check (HTTP 400 if missing)
│   └── errorHandler.js    # Global error → { "success": false, "error": "…" }
├── public/
│   ├── index.html         # Single-page app shell
│   ├── app.js             # Vanilla JS: API calls, DOM updates, routing
│   └── style.css          # Responsive styles (375 px mobile baseline)
└── app.js                 # Express app factory (used by server.js and tests)

server.js                  # Entry point: creates DB, runs migrations+seed, starts server
.env.example               # ADMIN_PASSWORD=, PORT=3000, DB_PATH=./duck-emporium.db

tests/
├── integration/
│   ├── catalog.test.js
│   ├── cart.test.js
│   ├── checkout.test.js
│   ├── admin.test.js
│   ├── duckOfTheDay.test.js
│   └── quiz.test.js
└── unit/
    ├── stockLabel.test.js
    ├── duckOfTheDayFormula.test.js
    └── quizScoring.test.js
```

**Structure Decision**: Single-project monolith (Option 1 variant). API and frontend coexist in one Express app. No separate frontend build artifact — static files are served directly from `src/public/`. Tests are co-located in `tests/` at the project root and use a `:memory:` SQLite database to avoid contaminating the dev database.

## Complexity Tracking

> No constitution violations — complexity tracking not required.
