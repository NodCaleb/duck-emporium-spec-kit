# API Contract: Checkout

**Base path**: `/api/checkout`

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

---

## POST /api/checkout

Submit an order from the current session cart. Atomically re-validates stock, decrements stock for all items, creates an order record, and clears the cart.

### Required Header

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-Session-ID` | string (UUID) | Yes | Identifies the cart to check out |

### Request Body

```json
{
  "shippingName": "Quincy Developer",
  "email": "quincy@example.com",
  "shippingAddress": "1 Rubber Duck Lane, Duckburg, CA 94000",
  "cardString": "4111 1111 1111 1111"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `shippingName` | string | Yes | Non-empty |
| `email` | string | Yes | Non-empty; valid email format |
| `shippingAddress` | string | Yes | Non-empty |
| `cardString` | string | Yes | Any non-empty string (mocked payment) |

### Success Response — 201 Created

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "items": [
        {
          "duckId": 1,
          "name": "Sir Debugs-a-Lot",
          "quantity": 2,
          "unitPrice": 12.99,
          "lineTotal": 25.98
        }
      ],
      "total": 25.98,
      "createdAt": "2026-07-08T14:30:00Z"
    }
  }
}
```

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `X-Session-ID` header is missing | `"X-Session-ID header is required"` |
| 400 | Cart is empty | `"Cart is empty"` |
| 400 | `email` is missing or malformed | `"email is required and must be a valid email address"` |
| 400 | Any other required field is missing or empty | `"<fieldName> is required"` |
| 409 | One or more items are out of stock at submission time | `"'<duck name>' is no longer available in the requested quantity"` |

**Atomicity guarantee**: If any line item fails stock validation, the entire checkout is rejected — no stock is decremented and no order is created.
