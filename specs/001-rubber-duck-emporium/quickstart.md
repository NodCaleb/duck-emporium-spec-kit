# Quickstart Validation Guide: The Rubber Duck Emporium

**Branch**: `001-rubber-duck-emporium` | **Date**: 2026-07-08

This guide describes how to run the application and validate that every feature works end-to-end. No implementation code is included here — this is a run-and-verify guide.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 LTS | `node --version` |
| npm | ≥ 10 | bundled with Node 20 |
| `better-sqlite3` | per `package.json` | requires native build; `npm install` handles it |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy and edit)
cp .env.example .env
# Set ADMIN_PASSWORD to any non-empty string, e.g.: ADMIN_PASSWORD=quack123

# 3. Start the server (seeds the database automatically on first run)
node server.js
# Expected output:
#   [timestamp] Database initialized
#   [timestamp] Seeded N ducks
#   Server listening on http://localhost:3000
```

The database file (`duck-emporium.db` by default) is created automatically. The seed is idempotent — re-starting the server will not duplicate ducks.

---

## Running the Test Suite

```bash
# Run all tests (unit + integration)
npx vitest run

# Expected: all tests pass; no tests skipped
# Tests use an in-memory SQLite database — the dev DB is never touched
```

---

## Validation Scenarios

The scenarios below map directly to the acceptance criteria in `spec.md`. Use `curl`, a REST client (e.g., Insomnia, Postman), or open the browser UI at `http://localhost:3000`.

### US1 — Browse Duck Catalog

```bash
# List all ducks
curl http://localhost:3000/api/catalog

# Expected: 10+ ducks across 3+ categories; each has id, name, category, price, tagline, stockLabel
# Expected envelope: { "success": true, "data": { "ducks": [...], "count": N } }

# Empty-state: delete all ducks from DB and request catalog
# Expected: { "success": true, "data": { "ducks": [], "count": 0 } }
# Frontend shows explicit empty-state message (not a blank page)
```

### US2 — View Duck Detail

```bash
# Valid ID
curl http://localhost:3000/api/catalog/1
# Expected: full duck record including description, personalityTraits, stock, stockLabel

# Invalid ID
curl http://localhost:3000/api/catalog/9999
# Expected: HTTP 404, { "success": false, "error": "Duck not found" }

# Duck with 3 units left
# Expected stockLabel: "Only 3 left"

# Duck with 0 units
# Expected stockLabel: "Sold out"
```

### US3 — Cart Management

```bash
SESSION="$(uuidgen)"  # or any UUID string

# Add a duck
curl -X POST http://localhost:3000/api/cart/items \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"duckId": 1, "quantity": 1}'
# Expected: cart with 1 item

# Update quantity
curl -X PATCH http://localhost:3000/api/cart/items/1 \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'
# Expected: cart shows quantity=3, updated line total

# Add a second duck
curl -X POST http://localhost:3000/api/cart/items \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"duckId": 2, "quantity": 1}'
# Expected: cart has 2 items

# Remove first duck
curl -X DELETE http://localhost:3000/api/cart/items/1 \
  -H "X-Session-ID: $SESSION"
# Expected: cart has 1 item (duck 2 only)

# Exceed stock (assume duck 3 has 2 in stock)
curl -X POST http://localhost:3000/api/cart/items \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"duckId": 3, "quantity": 99}'
# Expected: HTTP 409, { "success": false, "error": "Only 2 units of '...' are in stock" }

# View cart
curl http://localhost:3000/api/cart \
  -H "X-Session-ID: $SESSION"
# Expected: items array + cartTotal
```

### US4 — Checkout

```bash
SESSION="$(uuidgen)"

# Add item to cart first (duck 1)
curl -X POST http://localhost:3000/api/cart/items \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"duckId": 1, "quantity": 1}'

# Submit checkout
curl -X POST http://localhost:3000/api/checkout \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingName": "Quincy Developer",
    "email": "quincy@example.com",
    "shippingAddress": "1 Rubber Duck Lane, Duckburg CA 94000",
    "cardString": "4111111111111111"
  }'
# Expected: HTTP 201, order with unique ID, items, total
# Verify: stock decremented (GET /api/catalog/1 shows 1 fewer unit)
# Verify: cart is empty (GET /api/cart returns empty items array)

# Restart server and retrieve order from DB
# Expected: order still exists (persistence check)

# Invalid email
curl -X POST http://localhost:3000/api/checkout \
  -H "X-Session-ID: $SESSION" \
  -H "Content-Type: application/json" \
  -d '{"shippingName": "Quincy", "email": "not-an-email", "shippingAddress": "1 Lane", "cardString": "x"}'
# Expected: HTTP 400, field-level error for email
```

### US5 — Search and Filter

```bash
# Free-text search
curl "http://localhost:3000/api/catalog?search=debugs"
# Expected: only ducks whose name/tagline/description contains "debugs" (case-insensitive)

# Category filter
curl "http://localhost:3000/api/catalog?category=Maritime%20Ducks"
# Expected: only maritime ducks

# Price range
curl "http://localhost:3000/api/catalog?minPrice=10&maxPrice=15"
# Expected: only ducks priced $10–$15

# All three combined
curl "http://localhost:3000/api/catalog?search=duck&category=Debugging%20Ducks&minPrice=5&maxPrice=20"
# Expected: AND of all three filters

# No results
curl "http://localhost:3000/api/catalog?search=xyzzy_no_results"
# Expected: { "success": true, "data": { "ducks": [], "count": 0 } }
# Frontend shows friendly empty-state message
```

### US6 — Curator Admin

```bash
# Add duck with correct password
curl -X POST http://localhost:3000/api/catalog \
  -H "X-Admin-Password: quack123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Duck $(date +%s)",
    "category": "Limited Editions",
    "price": 9.99,
    "tagline": "A test duck.",
    "description": "Created for validation.",
    "personalityTraits": ["Testable"],
    "stock": 1
  }'
# Expected: HTTP 201, duck created and visible in catalog

# Wrong password
curl -X POST http://localhost:3000/api/catalog \
  -H "X-Admin-Password: wrongpassword" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sneaky Duck", "category": "Limited Editions", "price": 1, "tagline": "x", "description": "x", "personalityTraits": ["x"], "stock": 0}'
# Expected: HTTP 401, { "success": false, "error": "Unauthorized" }

# Duplicate name
# (run after a duck with the same name already exists)
# Expected: HTTP 409, { "success": false, "error": "A duck named '...' already exists" }

# Negative price
# Expected: HTTP 400

# Check server stdout for log line (must include duck name, no PII)
```

### US7 — Web Frontend

```
1. Open http://localhost:3000 in a browser
2. Verify: catalog page loads with all ducks and search/filter controls
3. Click a duck → verify full detail view (description, traits, stock status, Add to Cart button)
4. Add to cart → navigate to cart → verify item, quantity controls, line total, cart total
5. Adjust quantity → verify update
6. Proceed to checkout → fill form → submit → verify order confirmation with order ID
7. Resize browser to 375 px width → verify zero horizontal scroll on every page
8. Trigger an error (e.g., navigate to /api/catalog/9999 via frontend link) → verify human-friendly error message
```

### US8 — Duck of the Day

```bash
# Same duck all day
for i in {1..10}; do
  curl -s http://localhost:3000/api/duck-of-the-day | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['duck']['id'] if d['data']['duck'] else 'empty')"
done
# Expected: same ID printed 10 times

# All sold out (set all stocks to 0 directly in DB, then request)
curl http://localhost:3000/api/duck-of-the-day
# Expected: HTTP 200, { "success": true, "data": { "duck": null, "message": "The pond is empty today…" } }
```

### US9 — Personality Quiz

```bash
# Fetch questions
curl http://localhost:3000/api/quiz
# Expected: 6 questions, each with 4 choices

# Submit all "A" answers (should yield Debugging Ducks)
curl -X POST http://localhost:3000/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"questionIndex": 0, "choiceIndex": 0},
      {"questionIndex": 1, "choiceIndex": 0},
      {"questionIndex": 2, "choiceIndex": 0},
      {"questionIndex": 3, "choiceIndex": 0},
      {"questionIndex": 4, "choiceIndex": 0},
      {"questionIndex": 5, "choiceIndex": 0}
    ]
  }'
# Expected: recommendedCategory = "Debugging Ducks"; same duck on repeat calls

# Submit same answers twice and verify identical response (determinism check)

# Tie-breaking: construct answers that score equally across two categories
# Expected: alphabetically first category wins
```

---

## What Success Looks Like

| SC | Check | Pass Condition |
|----|-------|----------------|
| SC-001 | Manual: home page → order confirmation | Completed in < 5 minutes |
| SC-002 | `npx vitest run` | All 46 acceptance-scenario tests pass |
| SC-003 | Search/filter response time | Visual/`curl` < 1 second on dev machine |
| SC-004 | Browser at 375 px | No horizontal scrollbar on any page |
| SC-005 | Restart server; retrieve order | Order still present in `GET /api/checkout/{id}` or via DB |
| SC-006 | Submit same quiz answers 100× | Same duck every time |
| SC-007 | 100 wrong-password admin requests | All return HTTP 401; zero ducks added |
| SC-008 | 10 Duck of the Day requests same day | Same duck ID each time |
