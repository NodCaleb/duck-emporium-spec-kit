# API Contract: Cart

**Base path**: `/api/cart`

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

All cart endpoints **require** the `X-Session-ID` header (a client-generated UUID). Requests missing this header are rejected with HTTP 400.

---

## Required Header (all endpoints)

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Session-ID` | string (UUID) | Yes | Client-generated UUID that identifies the shopping session |

---

## GET /api/cart

Return current cart contents for the session.

### Success Response — 200 OK

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "duckId": 1,
        "name": "Sir Debugs-a-Lot",
        "quantity": 2,
        "unitPrice": 12.99,
        "lineTotal": 25.98
      }
    ],
    "cartTotal": 25.98
  }
}
```

When the cart is empty, `items` is an empty array and `cartTotal` is `0`.

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `X-Session-ID` header is missing or empty | `"X-Session-ID header is required"` |

---

## POST /api/cart/items

Add a duck to the cart, or increase its quantity if it is already present.

### Request Body

```json
{
  "duckId": 1,
  "quantity": 1
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `duckId` | integer | Yes | — | ID of the duck to add |
| `quantity` | integer | No | `1` | Units to add; must be ≥ 1 |

### Success Response — 200 OK

Returns the updated cart (same shape as `GET /api/cart`).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `X-Session-ID` header is missing | `"X-Session-ID header is required"` |
| 400 | `duckId` is missing or not an integer | `"duckId must be a positive integer"` |
| 400 | `quantity` is not a positive integer | `"quantity must be a positive integer"` |
| 404 | Duck with given ID does not exist | `"Duck not found"` |
| 409 | Requested quantity exceeds available stock | `"Only N units of '<name>' are in stock"` |

---

## PATCH /api/cart/items/:duckId

Update the quantity of a duck already in the cart. Setting quantity to 0 removes the item.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `duckId` | integer | ID of the duck whose quantity to update |

### Request Body

```json
{
  "quantity": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quantity` | integer | Yes | New quantity (≥ 1); use `DELETE` to remove instead |

### Success Response — 200 OK

Returns the updated cart (same shape as `GET /api/cart`).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `X-Session-ID` header is missing | `"X-Session-ID header is required"` |
| 400 | `quantity` is less than 1 or not an integer | `"quantity must be a positive integer"` |
| 404 | Duck is not in the cart | `"Item not found in cart"` |
| 409 | New quantity exceeds available stock | `"Only N units of '<name>' are in stock"` |

---

## DELETE /api/cart/items/:duckId

Remove a duck entirely from the cart.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `duckId` | integer | ID of the duck to remove |

### Success Response — 200 OK

Returns the updated cart (same shape as `GET /api/cart`).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `X-Session-ID` header is missing | `"X-Session-ID header is required"` |
| 404 | Duck is not in the cart | `"Item not found in cart"` |
