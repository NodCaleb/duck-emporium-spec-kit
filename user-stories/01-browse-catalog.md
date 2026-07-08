# Story 1 — Browse the duck catalog

**ID:** `browse-catalog`
**Persona:** Quincy Quacker (customer)
**Priority:** MVP

## Story

> **As** a visitor to The Rubber Duck Emporium,
> **I want** to see a list of all available ducks on the home page,
> **so that** I can get a feel for what's in stock before committing to anything as serious as a duck purchase.

## Acceptance criteria

- The home page returns a list of ducks.
- Each duck in the list shows at minimum: name, category, price, and a one-line tagline.
- The catalog is read from local storage (JSON file or SQLite). Seed it with at least 10 ducks across at least 3 categories.
- An empty catalog renders an explicit empty-state message — not a blank page.

## Out of scope (do NOT add)

- Pagination (catalog is small).
- Images (text-only is fine for the workshop).
- Sorting controls — covered later in story 5.

