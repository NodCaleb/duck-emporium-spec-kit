# API Contract: Duck of the Day

**Base path**: `/api/duck-of-the-day`

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

---

## GET /api/duck-of-the-day

Return the featured duck for the current calendar day.

**Selection formula**: `(dayOfYear - 1) % eligibleDucks.length` where `eligibleDucks` is the list of ducks with `stock > 0` ordered by `id ASC` (catalog insertion order). The same duck is returned for all requests on the same calendar day.

### No Parameters Required

### Success Response — 200 OK (duck available)

```json
{
  "success": true,
  "data": {
    "duck": {
      "id": 3,
      "name": "Captain Quackbeard",
      "category": "Maritime Ducks",
      "price": 15.99,
      "tagline": "Survived the Kraken. Will survive your merge conflicts.",
      "description": "A swashbuckling duck with a tiny eyepatch and a map to buried rubber.",
      "personalityTraits": ["Bold", "Navigational", "Salty"],
      "stock": 4,
      "stockLabel": "Only 4 left"
    },
    "detailUrl": "/api/catalog/3"
  }
}
```

`detailUrl` always points to `GET /api/catalog/:id` for the featured duck.

### Success Response — 200 OK (all ducks sold out)

```json
{
  "success": true,
  "data": {
    "duck": null,
    "message": "The pond is empty today, come back tomorrow."
  }
}
```

Note: This is a **success** response (HTTP 200), not an error — the all-sold-out state is an expected, handled condition (FR-033).
