# Data Model: The Rubber Duck Emporium

**Branch**: `001-rubber-duck-emporium` | **Date**: 2026-07-08 | **Phase**: 1

---

## Persisted Entities (SQLite)

### `ducks` — Product Catalog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Catalog insertion order; used by Duck of the Day formula |
| `name` | TEXT | NOT NULL UNIQUE | Display name; must be unique (FR-028) |
| `category` | TEXT | NOT NULL CHECK (see below) | One of the five fixed categories |
| `price` | REAL | NOT NULL CHECK (`price > 0`) | Unit price in dollars; must be positive (FR-028) |
| `tagline` | TEXT | NOT NULL | One-line marketing copy |
| `description` | TEXT | NOT NULL | Long-form product description |
| `personality_traits` | TEXT | NOT NULL | JSON-serialized array of short strings, e.g. `["Methodical","Patient"]` |
| `stock` | INTEGER | NOT NULL DEFAULT 0 CHECK (`stock >= 0`) | Units available; 0 = "Sold out"; may be 0 at insertion (FR-028 edge case) |
| `created_at` | TEXT | NOT NULL DEFAULT (ISO 8601 UTC) | Insertion timestamp |

**Category constraint** (enforced at application layer and validated on input):
```
'Debugging Ducks' | 'Philosopher Ducks' | 'Maritime Ducks' | 'Wellness Ducks' | 'Limited Editions'
```

**Stock label rules** (computed in `src/services/catalog.js`, never stored):

| Stock value | Label |
|-------------|-------|
| `> 5` | `"In stock"` |
| `1` – `5` | `"Only N left"` (e.g., `"Only 3 left"`) |
| `0` | `"Sold out"` |

**Validation rules** (enforced at HTTP boundary before DB write):
- `name`: non-empty string; must not already exist in `ducks` table
- `category`: must be exactly one of the five fixed values (case-sensitive)
- `price`: number > 0
- `tagline`: non-empty string
- `description`: non-empty string
- `personality_traits`: array of one or more non-empty strings (JSON-encoded for storage)
- `stock`: integer ≥ 0

---

### `orders` — Completed Purchases

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4; generated at checkout |
| `shipping_name` | TEXT | NOT NULL | Customer's full name |
| `shipping_email` | TEXT | NOT NULL | Validated email address (RFC 5321 pattern) |
| `shipping_address` | TEXT | NOT NULL | Free-text shipping address |
| `card_string` | TEXT | NOT NULL | Mocked card details; any non-empty string accepted |
| `total` | REAL | NOT NULL | Sum of all line items (quantity × unit_price); computed at checkout |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

**Validation rules**:
- `shipping_name`: non-empty string
- `shipping_email`: non-empty, matches email format (e.g., `/.+@.+\..+/`)
- `shipping_address`: non-empty string
- `card_string`: non-empty string (mocked — no further validation)

---

### `order_items` — Line Items per Order

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal row identifier |
| `order_id` | TEXT | NOT NULL REFERENCES `orders(id)` | Parent order |
| `duck_id` | INTEGER | NOT NULL REFERENCES `ducks(id)` | Source duck (for reference) |
| `duck_name` | TEXT | NOT NULL | Denormalized duck name (preserves order history if duck is deleted) |
| `quantity` | INTEGER | NOT NULL CHECK (`quantity > 0`) | Units purchased |
| `unit_price` | REAL | NOT NULL | Price at time of purchase (snapshot) |

**Computed at checkout**: `line_total = quantity × unit_price` (not stored; derived in query/response)

---

## Transient Entity (In-Memory, Not Persisted)

### Cart

Stored as a module-level `Map<sessionId: string, CartItem[]>` in `src/services/cart.js`.

```
Cart {
  sessionId: string          // client-provided UUID from X-Session-ID header
  items: CartItem[]
}

CartItem {
  duckId: number             // references ducks.id
  quantity: number           // integer > 0
}
```

**Derived fields** (computed on read, never stored):
- `duck_name`, `price`, `tagline`: fetched from `ducks` table by `duckId`
- `line_total`: `quantity × price`
- `cart_total`: sum of all `line_total` values

**Session lifecycle**: Cart is created on first cart operation for a session ID. It is cleared after successful checkout (FR-018). It is never persisted to SQLite.

---

## Static Data (Not in DB)

### Quiz Questions

Defined as a frozen constant in `src/services/quiz.js`. Six questions; each question has four answer choices; each choice carries a score map keyed by duck category.

```
QuizQuestion {
  text: string
  choices: QuizChoice[4]
}

QuizChoice {
  text: string
  scores: { [category: string]: number }   // only categories receiving points are listed
}
```

The full question table is reproduced verbatim from the spec (FR-035/FR-036):

| Q | Text | A scores | B scores | C scores | D scores |
|---|------|----------|----------|----------|----------|
| 1 | When faced with an impossible bug… | Debugging +3 | Philosopher +3 | Maritime +3 | Wellness +3 |
| 2 | Your ideal Friday night… | Debugging +3 | Philosopher +3 | Maritime +3 | Wellness +3 |
| 3 | Friends describe you as… | Debugging +2, Philosopher +1 | Philosopher +3 | Maritime +2, Limited Editions +1 | Wellness +3 |
| 4 | Your preferred problem-solving tool… | Debugging +3 | Philosopher +3 | Maritime +3 | Wellness +3 |
| 5 | If you could have a superpower… | Debugging +3 | Philosopher +2, Limited Editions +1 | Maritime +3 | Wellness +3 |
| 6 | The item you'd never leave home without… | Debugging +3 | Philosopher +3 | Maritime +3 | Wellness +3 |

---

## Entity Relationships

```
ducks (1) ──< (N) order_items >── (1) orders
```

- One `order` has one or more `order_items`.
- Each `order_item` references one `duck` (by ID + denormalized name).
- Cart items reference `ducks` by ID (no FK in DB; resolved at read time).

---

## SQLite Schema DDL (summary)

```sql
CREATE TABLE IF NOT EXISTS ducks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL UNIQUE,
  category         TEXT    NOT NULL,
  price            REAL    NOT NULL CHECK (price > 0),
  tagline          TEXT    NOT NULL,
  description      TEXT    NOT NULL,
  personality_traits TEXT  NOT NULL,  -- JSON array
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT  PRIMARY KEY,
  shipping_name    TEXT  NOT NULL,
  shipping_email   TEXT  NOT NULL,
  shipping_address TEXT  NOT NULL,
  card_string      TEXT  NOT NULL,
  total            REAL  NOT NULL,
  created_at       TEXT  NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT    NOT NULL REFERENCES orders(id),
  duck_id    INTEGER NOT NULL REFERENCES ducks(id),
  duck_name  TEXT    NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price REAL    NOT NULL
);
```

---

## State Transitions

### Duck Stock

```
stock = N (N > 0)  ──[checkout decrements]──►  stock = N - qty  (may reach 0)
stock = 0          ──[admin updates stock]──►   stock = M (M > 0)  [out of scope for this spec]
```

### Order Lifecycle

```
[cart exists]  ──[POST /api/checkout]──►  [order created + cart cleared + stock decremented]
```

There is no order cancellation or update flow in this spec.

### Cart

```
∅  ──[POST /api/cart/items]──►  { items: [item] }
   ──[PATCH /api/cart/items/:duckId]──►  quantity updated
   ──[DELETE /api/cart/items/:duckId]──►  item removed
   ──[POST /api/checkout (success)]──►  ∅  (cleared)
```
