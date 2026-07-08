# API Contract: Curator Admin

**Base path**: `/api/catalog` (POST and PATCH, admin-gated)

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

---

## POST /api/catalog

Add a new duck to the catalog. Requires the admin password.

### Required Header

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Admin-Password` | string | Yes | Must match the `ADMIN_PASSWORD` environment variable |

### Request Body

```json
{
  "name": "Edgar Allan Poe Duck",
  "category": "Limited Editions",
  "price": 24.99,
  "tagline": "Quoth the duck: 'Nevermore shall your code compile.'",
  "description": "A gothic rubber duck dressed in a tiny frock coat, clutching a quill. Dark, dramatic, and deeply judgemental of your variable names.",
  "personalityTraits": ["Dramatic", "Brooding", "Poetic"],
  "stock": 5
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Non-empty; must be unique across the catalog |
| `category` | string | Yes | Must be exactly one of the five fixed categories |
| `price` | number | Yes | Must be > 0 |
| `tagline` | string | Yes | Non-empty |
| `description` | string | Yes | Non-empty |
| `personalityTraits` | string[] | Yes | Non-empty array; each element is a non-empty string |
| `stock` | integer | Yes | Must be ≥ 0 |

### Success Response — 201 Created

```json
{
  "success": true,
  "data": {
    "duck": {
      "id": 11,
      "name": "Edgar Allan Poe Duck",
      "category": "Limited Editions",
      "price": 24.99,
      "tagline": "Quoth the duck: 'Nevermore shall your code compile.'",
      "description": "A gothic rubber duck dressed in a tiny frock coat…",
      "personalityTraits": ["Dramatic", "Brooding", "Poetic"],
      "stock": 5,
      "stockLabel": "Only 5 left",
      "createdAt": "2026-07-08T15:00:00Z"
    }
  }
}
```

The new duck is immediately visible in `GET /api/catalog` responses.

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 401 | `X-Admin-Password` header is missing or does not match `ADMIN_PASSWORD` | `"Unauthorized"` |
| 400 | Any required field is missing | `"<fieldName> is required"` |
| 400 | `price` ≤ 0 | `"price must be a positive number"` |
| 400 | `stock` < 0 | `"stock must be a non-negative integer"` |
| 400 | `category` is not one of the five valid values | `"category must be one of: Debugging Ducks, Philosopher Ducks, Maritime Ducks, Wellness Ducks, Limited Editions"` |
| 409 | A duck with the same `name` already exists | `"A duck named '<name>' already exists"` |

### Side Effects

- A timestamped `console.log` entry is written to stdout on every attempt (success or failure), recording the duck name and outcome. No customer PII is included (FR-030).
- Example log line: `[2026-07-08T15:00:00Z] ADMIN duck-add: name="Edgar Allan Poe Duck" status=created id=11`
- Example log line (failure): `[2026-07-08T15:00:01Z] ADMIN duck-add: name="Edgar Allan Poe Duck" status=rejected reason="duplicate name"`

---

## PATCH /api/catalog/:id

Update one or more fields of an existing duck. All fields are optional; only supplied fields are modified. Requires the admin password.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Duck's numeric ID |

### Required Header

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Admin-Password` | string | Yes | Must match the `ADMIN_PASSWORD` environment variable |

### Request Body

All fields are optional. At least one field must be supplied.

```json
{
  "stock": 10
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | Non-empty; must be unique if changed |
| `category` | string | No | Must be exactly one of the five fixed categories |
| `price` | number | No | Must be > 0 |
| `tagline` | string | No | Non-empty |
| `description` | string | No | Non-empty |
| `personalityTraits` | string[] | No | Non-empty array; each element is a non-empty string |
| `stock` | integer | No | Must be ≥ 0 |

### Success Response — 200 OK

Returns the full updated duck record.

```json
{
  "success": true,
  "data": {
    "duck": {
      "id": 11,
      "name": "Edgar Allan Poe Duck",
      "category": "Limited Editions",
      "price": 24.99,
      "tagline": "Quoth the duck: 'Nevermore shall your code compile.'",
      "description": "A gothic rubber duck dressed in a tiny frock coat…",
      "personalityTraits": ["Dramatic", "Brooding", "Poetic"],
      "stock": 10,
      "stockLabel": "In stock",
      "createdAt": "2026-07-08T15:00:00Z"
    }
  }
}
```

Changes are immediately reflected in `GET /api/catalog` and `GET /api/catalog/:id` responses.

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 401 | `X-Admin-Password` header is missing or incorrect | `"Unauthorized"` |
| 400 | Request body is empty (no fields supplied) | `"At least one field must be provided"` |
| 400 | `price` ≤ 0 | `"price must be a positive number"` |
| 400 | `stock` < 0 | `"stock must be a non-negative integer"` |
| 400 | `category` is not one of the five valid values | `"category must be one of: Debugging Ducks, Philosopher Ducks, Maritime Ducks, Wellness Ducks, Limited Editions"` |
| 404 | No duck with the given ID exists | `"Duck not found"` |
| 409 | Updated `name` already belongs to another duck | `"A duck named '<name>' already exists"` |
