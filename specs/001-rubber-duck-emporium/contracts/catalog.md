# API Contract: Catalog

**Base path**: `/api/catalog`

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

---

## GET /api/catalog

List all ducks, optionally filtered by search text, category, and price range.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Case-insensitive text match against `name`, `tagline`, and `description` |
| `category` | string | No | Exact category name match (one of the five fixed categories) |
| `minPrice` | number | No | Minimum price (inclusive) |
| `maxPrice` | number | No | Maximum price (inclusive) |

All supplied parameters compose with AND logic.

### Success Response — 200 OK

```json
{
  "success": true,
  "data": {
    "ducks": [
      {
        "id": 1,
        "name": "Sir Debugs-a-Lot",
        "category": "Debugging Ducks",
        "price": 12.99,
        "tagline": "Stares at your code with unyielding contempt.",
        "stockLabel": "In stock"
      }
    ],
    "count": 1
  }
}
```

When no ducks match the active filters, `ducks` is an empty array and `count` is 0. The frontend displays the empty-state message (FR-003 / FR-025).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `minPrice` or `maxPrice` is not a valid number | `"minPrice must be a number"` / `"maxPrice must be a number"` |

---

## GET /api/catalog/:id

Return the full detail record for a single duck.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Duck's numeric ID |

### Success Response — 200 OK

```json
{
  "success": true,
  "data": {
    "duck": {
      "id": 1,
      "name": "Sir Debugs-a-Lot",
      "category": "Debugging Ducks",
      "price": 12.99,
      "tagline": "Stares at your code with unyielding contempt.",
      "description": "A stern rubber duck with a monocle and a 47-page bug report.",
      "personalityTraits": ["Methodical", "Patient", "Judgmental"],
      "stock": 8,
      "stockLabel": "In stock"
    }
  }
}
```

`stockLabel` is one of: `"In stock"` (stock > 5), `"Only N left"` (stock 1–5), `"Sold out"` (stock = 0).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 404 | No duck with the given ID exists | `"Duck not found"` |
| 400 | `id` is not a valid integer | `"Invalid duck ID"` |
