# Feature Specification: The Rubber Duck Emporium

**Feature Branch**: `001-rubber-duck-emporium`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "All user stories from user-stories/ — The Rubber Duck Emporium online shop"

## User Scenarios & Testing *(mandatory)*

<!--
  User stories are ordered by priority. Each story is independently testable and delivers
  standalone value. P1 = MVP, P2 = Should, P3 = Could.
-->

### User Story 1 — Browse Duck Catalog (Priority: P1)

Quincy visits the homepage and sees a list of all available ducks, each showing name, category, price, and a one-line tagline. The catalog is the entry point for all customer activity.

**Why this priority**: Core catalog browsing is the foundation for every other customer-facing feature. Nothing else works without it.

**Independent Test**: Request the catalog endpoint/page and verify at least 10 ducks across 3+ categories are listed, each with name, category, price, and tagline. Verify that deleting all ducks shows an explicit empty-state message.

**Acceptance Scenarios**:

1. **Given** the catalog has ducks, **When** a visitor opens the home page, **Then** all available ducks are listed, each showing name, category, price, and tagline.
2. **Given** the catalog is empty, **When** a visitor opens the home page, **Then** an explicit empty-state message is displayed rather than a blank page.

---

### User Story 2 — View Duck Detail (Priority: P1)

Quincy clicks on a duck and sees its full profile: long description, personality traits, special powers, and current stock status.

**Why this priority**: Customers need full product information before purchasing; this is a prerequisite for the cart and checkout flows.

**Independent Test**: Request a duck by valid ID and verify all detail fields are returned. Request an invalid ID and verify a "not found" error is returned.

**Acceptance Scenarios**:

1. **Given** a valid duck ID, **When** a visitor requests the duck's detail, **Then** name, category, price, tagline, long description, personality traits, and stock level are all returned.
2. **Given** an invalid duck ID, **When** a visitor requests the duck's detail, **Then** a clear "duck not found" error is returned — not a blank response.
3. **Given** a duck with 1–5 units remaining, **When** details are requested, **Then** stock level shows "Only N left" (e.g., "Only 1 left").
4. **Given** a duck with zero stock, **When** details are requested, **Then** stock level shows "Sold out".

---

### User Story 3 — Add Ducks to Cart (Priority: P1)

Quincy adds multiple ducks to a shopping cart, adjusts quantities, removes items, and views a running total before proceeding to checkout.

**Why this priority**: Cart management is required before checkout can function; together with checkout it delivers the complete purchase flow.

**Independent Test**: Within a single session — add a duck, change its quantity, add a second duck, remove the first, view the cart total. Verify the cart reflects each change correctly.

**Acceptance Scenarios**:

1. **Given** an in-stock duck, **When** a customer adds it to the cart (default qty 1), **Then** the cart contains one unit of that duck.
2. **Given** a duck already in the cart, **When** a customer changes its quantity to 3, **Then** the cart reflects the new quantity and updated line total.
3. **Given** a duck in the cart, **When** a customer removes it, **Then** the duck no longer appears in the cart.
4. **Given** a duck with 2 units in stock, **When** a customer attempts to add 3, **Then** the system rejects the request with a clear stock-exceeded message.
5. **Given** a cart with multiple items, **When** a customer views the cart, **Then** all line items and the running total are displayed.

---

### User Story 4 — Checkout with Mocked Payment (Priority: P1)

Quincy completes checkout by providing shipping details and mocked payment information, receiving an order confirmation with a unique order ID.

**Why this priority**: Completing the purchase loop is the primary business value of the entire application.

**Independent Test**: Submit a valid checkout form from a non-empty cart and verify: an order record is created, stock is decremented for each line item, the cart is cleared, and a confirmation with order ID is returned. Restart the server and verify the order still exists.

**Acceptance Scenarios**:

1. **Given** a non-empty cart and valid form data (name, email, address, any card string), **When** the customer submits checkout, **Then** an order is created with a unique ID, stock is decremented atomically, the cart is cleared, and a confirmation summary is returned.
2. **Given** checkout submitted with an empty or malformed email, **When** the system validates, **Then** the request is rejected with a clear field-level validation error.
3. **Given** a duck that sold out between cart addition and checkout submission, **When** the customer submits checkout, **Then** checkout is rejected with a message identifying the out-of-stock item.
4. **Given** a successfully created order, **When** the application restarts, **Then** the order record is still present and retrievable.

---

### User Story 5 — Search and Filter Catalog (Priority: P2)

Quincy searches for ducks by free text and filters by category and price range; all filters compose together for targeted discovery.

**Why this priority**: Improves discoverability as the catalog grows; not required for a basic purchase flow but important for customer experience at scale.

**Independent Test**: Issue queries with free text only, category only, price range only, and all three combined. Verify results match expected ducks for each combination.

**Acceptance Scenarios**:

1. **Given** a search term, **When** a customer searches the catalog, **Then** only ducks whose name, tagline, or long description contains the term (case-insensitive) are returned.
2. **Given** a category filter, **When** applied, **Then** only ducks in the selected category are returned.
3. **Given** a min/max price range, **When** applied, **Then** only ducks priced within the range are returned; either bound alone is valid.
4. **Given** free text + category + price range are all active, **When** combined, **Then** only ducks satisfying all three constraints are returned.
5. **Given** filters that match no ducks, **When** applied, **Then** a friendly empty-state message is shown — not a blank page.

---

### User Story 6 — Curator Adds a New Duck (Priority: P2)

Dr. Mallard adds a new duck to the catalog via a protected admin endpoint; the duck appears immediately in the public catalog.

**Why this priority**: Enables ongoing catalog management without manual file editing; essential for the store's long-term operation.

**Independent Test**: POST a new duck with the correct admin password and verify it appears in the catalog. Repeat with a wrong password and verify HTTP 401 is returned. Attempt duplicate name and negative price and verify each is rejected.

**Acceptance Scenarios**:

1. **Given** the correct admin password and complete, valid duck data, **When** Dr. Mallard submits the request, **Then** the duck is added and immediately visible in the catalog.
2. **Given** a missing or incorrect admin password, **When** the request is submitted, **Then** the system returns HTTP 401 and no duck is added.
3. **Given** a duck name that already exists in the catalog, **When** submitted, **Then** the system rejects the request with a clear duplicate-name error.
4. **Given** a negative price or negative stock value, **When** submitted, **Then** the system rejects the request with a clear validation error.
5. **Given** a successful duck addition, **When** reviewing logs, **Then** a timestamped log entry exists with the duck name; no customer PII is logged.

---

### User Story 7 — Web Frontend (Priority: P2)

Quincy uses a browser-based UI served by the same application to browse ducks, manage a cart, take the quiz, and complete checkout — without needing curl or Postman.

**Why this priority**: Makes the application accessible to non-technical users and delivers the full customer experience in a browser.

**Independent Test**: Open the root URL in a browser. Perform a full end-to-end flow: browse catalog, open detail, add to cart, adjust quantity, complete checkout, and receive a confirmation screen — all without leaving the browser.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** a customer opens the root URL, **Then** a catalog page loads showing all ducks with search and filter controls.
2. **Given** the catalog page, **When** a customer clicks a duck, **Then** a detail view shows full description, personality traits, stock status, and an "Add to Cart" button.
3. **Given** a duck detail view, **When** a customer adds the duck and navigates to the cart, **Then** the cart shows the item, quantity, line total, running total, and quantity-adjustment/removal controls.
4. **Given** a populated cart, **When** the customer completes the checkout form and submits, **Then** an order confirmation screen shows the order ID, line items, and total.
5. **Given** an API error (400, 404, or 409), **When** the frontend receives it, **Then** a human-friendly error message is displayed — not a raw error object or blank screen.
6. **Given** any page of the frontend is loaded on a 375 px-wide (mobile) viewport, **When** the customer scrolls, **Then** no horizontal scroll is required.

---

### User Story 8 — Duck of the Day (Priority: P3)

Quincy sees a daily-featured duck prominently on the homepage; the same duck is shown for the whole calendar day, then rotates to the next.

**Why this priority**: Engagement feature that gives customers a reason to return; does not affect core purchasing flows.

**Independent Test**: Request Duck of the Day multiple times on the same calendar day and verify the same duck is returned each time. Mock the next calendar day and verify a different duck may be returned. Verify sold-out ducks are skipped.

**Acceptance Scenarios**:

1. **Given** at least one in-stock duck exists, **When** a customer requests Duck of the Day, **Then** the same duck is returned for all requests on the same calendar day.
2. **Given** a new calendar day begins, **When** Duck of the Day is requested, **Then** the selection may advance to the next eligible duck in the rotation.
3. **Given** the duck that would be selected today is sold out, **When** requested, **Then** the next available in-stock duck in the deterministic rotation is returned instead.
4. **Given** all ducks are sold out, **When** Duck of the Day is requested, **Then** a friendly fallback message is returned ("The pond is empty today, come back tomorrow.") — never an error.
5. **Given** the Duck of the Day is displayed in the web frontend, **When** a customer clicks it, **Then** they are taken to that duck's full detail page.

---

### User Story 9 — "Which Duck Are You?" Personality Quiz (Priority: P3)

Quincy takes a 6-question multiple-choice quiz and receives a recommended duck category and a personalized message — a shareable result and a discovery entry point.

**Why this priority**: Engagement and shareability driver; does not affect core purchasing flows but is memorable and expected by the brief.

**Independent Test**: Submit a complete set of 6 answers and verify a duck recommendation with a personalized message is returned. Submit the same answers again and verify the exact same duck is recommended. Submit answers that tie two categories and verify alphabetical tie-breaking selects the correct winner.

**Acceptance Scenarios**:

1. **Given** a complete set of 6 answers, **When** submitted, **Then** the system returns the single duck in the highest-scoring category, a short personalized message, and a link to its detail page.
2. **Given** the same 6 answers submitted twice, **When** both responses are compared, **Then** the same duck is recommended both times.
3. **Given** answers that result in a tied score between two or more categories, **When** resolved, **Then** the tie is broken alphabetically by category name (ascending); this rule repeats until one winner remains.
4. **Given** a completed quiz submission, **When** any persistent state is checked, **Then** no cart entries, analytics records, or other state changes have occurred.

---

### Edge Cases

- **Empty catalog at startup**: System serves the empty-state message without crashing; no seed error thrown.
- **Concurrent checkout**: Two customers attempting to buy the last unit simultaneously — stock is decremented atomically; only one succeeds, the other receives a clear out-of-stock rejection.
- **Cart session expiry**: Cart data need not survive session termination; no cross-session recovery is required or attempted.
- **All ducks sold out in quiz result**: The recommended duck may be sold out; the recommendation is still shown with "Sold out" status; the quiz result is never suppressed due to stock.
- **Quiz tie with more than two categories**: Alphabetical tie-breaking is applied repeatedly until exactly one category remains.
- **Admin adds duck with stock = 0**: Valid; the duck appears in the catalog as "Sold out".
- **Search with only a minimum price**: Applied correctly; no maximum constraint is assumed.
- **Duck of the Day with exactly one in-stock duck**: That duck is always featured until it sells out, at which point the all-sold-out fallback applies.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Catalog

- **FR-001**: System MUST serve a list of all ducks, each including: name, category, price, and tagline.
- **FR-002**: Catalog data MUST be seeded with at least 10 ducks across at least 3 categories on first run.
- **FR-003**: System MUST display an explicit empty-state message when the catalog contains no ducks.

#### Duck Detail

- **FR-004**: System MUST return the full duck record (name, category, price, tagline, long description, personality traits, stock level) for a valid duck ID.
- **FR-005**: System MUST return a clear "duck not found" error for an invalid or unknown duck ID.
- **FR-006**: Stock level MUST be reported as: "In stock" (> 5 units), "Only N left" (1–5 units), or "Sold out" (0 units).

#### Cart

- **FR-007**: A customer MUST be able to add a duck to a session-scoped cart with an optional quantity (default: 1).
- **FR-008**: A customer MUST be able to update the quantity of any cart line item.
- **FR-009**: A customer MUST be able to remove a line item from the cart entirely.
- **FR-010**: System MUST reject adding a quantity that exceeds available stock, with a clear message.
- **FR-011**: System MUST display cart contents with a computed running total.
- **FR-012**: Cart data MUST persist within a single session; cross-session persistence is not required.

#### Checkout

- **FR-013**: Checkout MUST collect: shipping name, email, shipping address, and mocked card details (any non-empty string accepted).
- **FR-014**: System MUST validate that the email field is non-empty and conforms to a valid email format.
- **FR-015**: System MUST re-validate stock for every cart line item at checkout submission time.
- **FR-016**: System MUST decrement stock atomically for all line items on a successful checkout.
- **FR-017**: System MUST create an order record containing: unique order ID, line items (duck ID, name, quantity, unit price), total, and timestamp.
- **FR-018**: System MUST clear the cart after a successful checkout.
- **FR-019**: Order records MUST be persisted and survive application restarts.
- **FR-020**: System MUST return an order confirmation containing the order ID and order summary.

#### Search and Filter

- **FR-021**: Free-text search MUST match against duck name, tagline, and long description (case-insensitive).
- **FR-022**: Category filter MUST support selecting one or more categories simultaneously.
- **FR-023**: Price filter MUST support an optional minimum price, an optional maximum price, or both together.
- **FR-024**: All active filters MUST compose with AND logic: free text AND category AND price all apply together.
- **FR-025**: Filtered results with no matches MUST show a friendly empty-state message (not a blank page).

#### Curator Admin

- **FR-026**: An admin endpoint MUST accept a new duck with fields: name, category, price, tagline, description, personality traits, and initial stock.
- **FR-027**: The admin endpoint MUST require the correct shared admin password (from an environment variable); requests without or with the wrong password MUST be rejected with HTTP 401.
- **FR-028**: System MUST reject submissions with: duplicate duck names, negative prices, negative stock values, or missing required fields — each with a distinct, clear error message.
- **FR-029**: A successfully added duck MUST appear immediately in the catalog listing.
- **FR-030**: Every duck addition attempt MUST be logged (stdout) with timestamp and duck name; no customer PII may appear in any log entry.

#### Duck of the Day

- **FR-031**: System MUST return exactly one duck per calendar day, with the same duck returned for all requests on the same day.
- **FR-032**: Duck of the Day selection MUST deterministically skip sold-out ducks.
- **FR-033**: When all ducks are sold out, system MUST return a friendly fallback message — never an error response.
- **FR-034**: The Duck of the Day MUST include a reference/link to its full detail page.

#### Personality Quiz

- **FR-035**: The quiz MUST present exactly 6 multiple-choice questions as defined in the Key Entities section.
- **FR-036**: Each answer choice MUST contribute weighted scores to one or more duck categories as defined in the question table.
- **FR-037**: System MUST return the single duck in the highest-scoring category, a short personalized message, and a link to the duck's detail page.
- **FR-038**: Ties between categories MUST be broken alphabetically by category name (ascending); the rule repeats until exactly one category remains.
- **FR-039**: The quiz result for any given set of answers MUST always be the same duck (fully deterministic; no randomness).
- **FR-040**: Submitting the quiz MUST NOT create, modify, or delete any persistent state.

#### Web Frontend

- **FR-041**: Server MUST serve a single-page HTML frontend at the root URL (`GET /` or `GET /app`).
- **FR-042**: Frontend MUST be functional without a build step (vanilla HTML/CSS/JS or a single pre-bundled file served as a static asset).
- **FR-043**: Frontend MUST be usable on desktop and mobile viewports (responsive layout; no horizontal scrolling at 375 px width).
- **FR-044**: Frontend MUST provide UI surfaces for: catalog browsing, duck detail, search/filter, cart management, checkout, order confirmation, Duck of the Day, and personality quiz.
- **FR-045**: Frontend MUST consume existing API endpoints only; no new backend-only routes are introduced solely for the frontend.
- **FR-046**: Frontend MUST display human-friendly error messages for API responses 400, 404, and 409.

---

### Key Entities *(include if feature involves data)*

- **Duck**: A product in the catalog. Attributes: unique ID (auto-generated), name (unique string), category (one of the defined categories), price (positive number), tagline (short string), long description (string), personality traits (list of short strings), stock level (integer ≥ 0).
- **Cart**: A session-scoped container. Attributes: session identifier, list of line items (duck ID + quantity), computed running total. Not persisted beyond the session lifetime.
- **Order**: A completed, persisted purchase. Attributes: unique order ID, line items (duck ID + name + quantity + unit price), order total, shipping name, shipping email, shipping address, timestamp.
- **Quiz Question**: One question in the personality quiz. Attributes: question text, list of answer choices (each with answer text + score map keyed by duck category).
- **Quiz Result**: Output of a quiz submission. Attributes: recommended duck (full record), personalized message, link to duck detail page.

#### Duck Categories

| Category | Description |
|---|---|
| Debugging Ducks | Stare at your code with judgmental glass eyes |
| Philosopher Ducks | Answer everything with a question |
| Maritime Ducks | Pirate, captain, and kraken-survivor editions |
| Wellness Ducks | For when your code and your soul need help |
| Limited Editions | Rare and eccentric ducks (e.g., Edgar Allan Poe Duck) |

#### Personality Quiz Questions & Scoring

| # | Question | A | B | C | D |
|---|---|---|---|---|---|
| 1 | When faced with an impossible bug, your first instinct is to… | Stare at it until it confesses (+3 Debugging) | Ask deep philosophical questions about why it exists (+3 Philosopher) | Check the tide charts (+3 Maritime) | Take a calming breath and make tea (+3 Wellness) |
| 2 | Your ideal Friday night is… | Pair-programming with a rubber duck (+3 Debugging) | Debating the nature of free will (+3 Philosopher) | Sailing into a sunset (+3 Maritime) | A guided meditation session (+3 Wellness) |
| 3 | Friends describe you as… | Methodical and persistent (+2 Debugging, +1 Philosopher) | Thoughtful and provocative (+3 Philosopher) | Adventurous and bold (+2 Maritime, +1 Limited Editions) | Calm and grounding (+3 Wellness) |
| 4 | Your preferred problem-solving tool is… | A step-by-step checklist (+3 Debugging) | A Socratic dialogue (+3 Philosopher) | A nautical map (+3 Maritime) | Aromatherapy and journaling (+3 Wellness) |
| 5 | If you could have a superpower, it would be… | Seeing every stack trace in real time (+3 Debugging) | Knowing the answer to everything — only in the form of a question (+2 Philosopher, +1 Limited Editions) | Breathing underwater (+3 Maritime) | Radiating serenity to everyone around you (+3 Wellness) |
| 6 | The item you'd never leave home without is… | A rubber duck on your desk (+3 Debugging) | A worn copy of *Meditations* (+3 Philosopher) | A compass (+3 Maritime) | A lavender essential oil roller (+3 Wellness) |

**Tie-breaking rule**: When two or more categories have equal total scores, select the category that comes first alphabetically (A–Z). Apply this rule repeatedly until exactly one category remains.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can navigate from the home page to a completed purchase (order confirmation on screen) in under 5 minutes.
- **SC-002**: All acceptance scenarios defined in the 9 user stories are covered by automated tests, with 100% of defined scenarios passing.
- **SC-003**: Catalog search and filter results appear within 1 second for any valid query on a standard development machine.
- **SC-004**: The web frontend is fully usable on a 375 px-wide mobile viewport with no horizontal scrolling required on any page.
- **SC-005**: 100% of orders created before an application restart are still retrievable after restart.
- **SC-006**: The personality quiz returns the same duck for identical answer inputs across 100 consecutive invocations (determinism verified).
- **SC-007**: 100% of requests to the admin endpoint without the correct password are rejected; zero unauthorized duck additions are possible.
- **SC-008**: Duck of the Day returns the same duck for all requests within a single calendar day (verified by at least 10 same-day requests in a test).

---

## Assumptions

- The application is a single-process, local/workshop deployment; no cloud infrastructure, load balancing, or horizontal scaling is required.
- Local file-based or SQLite storage is sufficient for both catalog data and order persistence; no external database is needed.
- A single shared admin password supplied via environment variable is the complete authentication mechanism for Dr. Mallard; no per-user admin accounts are needed.
- Payment processing is permanently mocked; any non-empty string is accepted as card details; no real payment provider will ever be integrated in this project.
- User accounts and persistent login for Quincy are out of scope; cart state is session-scoped only.
- The web frontend is served from the same origin as the API; no CORS configuration is required.
- The catalog will remain small enough (tens to low hundreds of ducks) that in-process filtering and full-text search are sufficient; no dedicated search engine is needed.
- Duck images are out of scope; text and emoji placeholders are acceptable throughout the UI.
- Pagination is out of scope for the catalog listing.
- The "personality traits" field on a Duck entity is a list of short strings (e.g., `["Methodical", "Patient", "Judgmental"]`).
- Automated tests for all acceptance criteria are implemented using the vitest framework.
- The five duck categories are fixed for this scope: Debugging Ducks, Philosopher Ducks, Maritime Ducks, Wellness Ducks, Limited Editions.
