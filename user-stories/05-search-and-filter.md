# Story 5 — Search and filter the catalog

**ID:** `search-and-filter`
**Persona:** Quincy Quacker (customer)
**Priority:** Should
**Depends on:** `browse-catalog`

## Story

> **As** a customer with very specific duck-related needs,
> **I want** to search by free text and filter by category and price range,
> **so that** I can quickly find, for example, "a philosophical duck under €20".

## Acceptance criteria

- Free-text search matches against duck name, tagline and long description (case-insensitive).
- Filter by one or more categories.
- Filter by minimum and/or maximum price (either bound is optional).
- Filters compose (free text AND category AND price all apply together).
- An empty result set renders a friendly empty state ("No duck matches your existential criteria.") — not a blank page.

## Out of scope

- Fuzzy / typo-tolerant search.
- Saved searches.
- Sort order beyond a stable default.
