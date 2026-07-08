# API Contract: Personality Quiz

**Base path**: `/api/quiz`

All responses use the envelope: `{ "success": true, "data": … }` on success, `{ "success": false, "error": "…" }` on error.

---

## GET /api/quiz

Return the six quiz questions with their answer choices. Does not require any headers or parameters.

### Success Response — 200 OK

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "index": 0,
        "text": "When faced with an impossible bug, your first instinct is to…",
        "choices": [
          { "index": 0, "text": "Stare at it until it confesses" },
          { "index": 1, "text": "Ask deep philosophical questions about why it exists" },
          { "index": 2, "text": "Check the tide charts" },
          { "index": 3, "text": "Take a calming breath and make tea" }
        ]
      }
    ]
  }
}
```

Exactly 6 questions are always returned. Scores are intentionally omitted from this response (not relevant to the UI).

---

## POST /api/quiz

Submit a complete set of 6 answers and receive a duck recommendation.

### Request Body

```json
{
  "answers": [
    { "questionIndex": 0, "choiceIndex": 0 },
    { "questionIndex": 1, "choiceIndex": 1 },
    { "questionIndex": 2, "choiceIndex": 2 },
    { "questionIndex": 3, "choiceIndex": 3 },
    { "questionIndex": 4, "choiceIndex": 0 },
    { "questionIndex": 5, "choiceIndex": 1 }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `answers` | array | Yes | Exactly 6 elements |
| `answers[n].questionIndex` | integer | Yes | 0–5; no duplicate question indices |
| `answers[n].choiceIndex` | integer | Yes | 0–3 |

### Success Response — 200 OK

```json
{
  "success": true,
  "data": {
    "recommendedCategory": "Debugging Ducks",
    "duck": {
      "id": 1,
      "name": "Sir Debugs-a-Lot",
      "category": "Debugging Ducks",
      "price": 12.99,
      "tagline": "Stares at your code with unyielding contempt.",
      "description": "A stern rubber duck with a monocle…",
      "personalityTraits": ["Methodical", "Patient", "Judgmental"],
      "stock": 8,
      "stockLabel": "In stock"
    },
    "message": "You are methodical, relentless, and your rubber duck is your most trusted peer reviewer.",
    "detailUrl": "/api/catalog/1"
  }
}
```

- `duck` is the **first duck** found in the winning category (lowest `id`), regardless of stock status. A sold-out duck may be recommended; stock label will reflect this (FR-040 edge case).
- `message` is a short, personalized string associated with the winning category.
- `detailUrl` links to the duck's detail endpoint.
- Submitting identical answers always produces the same `duck` (FR-039).
- No persistent state is created or modified (FR-040).

### Error Responses

| Status | Condition | Error message |
|--------|-----------|---------------|
| 400 | `answers` array is missing | `"answers is required"` |
| 400 | `answers` does not contain exactly 6 entries | `"answers must contain exactly 6 entries"` |
| 400 | Duplicate `questionIndex` values | `"each question must be answered exactly once"` |
| 400 | Any `questionIndex` is out of range (0–5) | `"questionIndex must be between 0 and 5"` |
| 400 | Any `choiceIndex` is out of range (0–3) | `"choiceIndex must be between 0 and 3"` |

### Tie-Breaking Rule

When two or more categories have equal scores, the winner is the one that comes first alphabetically (A–Z). This rule is applied repeatedly until exactly one category remains. The result is always deterministic.
