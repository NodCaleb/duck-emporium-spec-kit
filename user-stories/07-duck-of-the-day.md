# Story 7 — Duck of the Day

**ID:** `duck-of-the-day`
**Persona:** Quincy Quacker (customer)
**Priority:** Could
**Depends on:** `browse-catalog`

## Story

> **As** a customer with no specific need but plenty of free time,
> **I want** to see a single "Duck of the Day" featured on the home page,
> **so that** I have a reason to come back tomorrow.

## Acceptance criteria

- The home page (or a dedicated endpoint) returns one duck per calendar day.
- The same duck is returned for every request on the same day (deterministic), and a different duck on the next day.
- Sold-out ducks are skipped.
- If all ducks are sold out, the response is a friendly fallback ("The pond is empty today, come back tomorrow.") — never an error.
- A click/link on the Duck of the Day leads to its detail page.

## Out of scope

- Per-user personalization.
- Push notifications, email blasts.
- Manual override by the curator (could be a future story).