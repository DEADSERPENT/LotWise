# Lotwise — Car Dealership Inventory System
## SDLC Execution Plan (TDD-first)

**Purpose:** Build the assignment into a small, production-minded full-stack application that demonstrates software craftsmanship—not merely a working CRUD demo.

**Primary evaluation lens:** The assignment asks for a persistent database, JWT authentication, protected vehicle and inventory endpoints, a React/Tailwind SPA, tests written before implementation, clean code, meaningful Git history, transparent AI use, a README, screenshots, a test report, and a root `PROMPTS.md`. The Software Craftsperson Intern JD emphasizes TDD, clean/predictable code, frequent small releases, full-stack ownership, thoughtful AI use, feedback, and practical quality.

---

## 1. Product direction

### Product name
**Lotwise — Dealership Inventory Desk**

### One-sentence pitch
A clean dealership operations console where staff can find vehicles and record sales while managers can administer stock—with every stock change traceable and overselling prevented by the database-backed design.

### Product principles
1. **Correctness before cleverness.** Stock can never become negative, even when two purchase requests happen at the same time.
2. **Every change has a reason.** Purchases and restocks produce an inventory movement record.
3. **The UI explains state.** Loading, empty, validation, authorization, and server-error states are designed—not left as browser alerts.
4. **Tests lead implementation.** Every feature follows Red → Green → Refactor, with evidence in the Git history.
5. **AI accelerates work; the developer owns it.** Review generated code, test its behavior, and document usage honestly.

## 2. Recommended technology choices

These choices keep one primary language across the stack and support the assignment's allowed backend options.

- **Backend:** Node.js + TypeScript + Express
- **Persistence:** PostgreSQL + Prisma migrations
- **Validation:** Zod schemas at API boundaries
- **Authentication:** JWT + password hashing; never store plaintext passwords
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend tests:** Vitest + Supertest; PostgreSQL-backed integration tests for data/concurrency behavior
- **Frontend tests:** Vitest + React Testing Library
- **End-to-end tests:** Playwright for the most important user journeys
- **Local environment:** Docker Compose for PostgreSQL; `.env.example` for configuration
- **CI:** GitHub Actions for install, lint, type-check, tests, build, and (where configured) coverage checks

**Architecture rule:** Start with a modular monolith, not microservices. Separate business rules from HTTP handlers, but avoid abstractions that do not solve a real problem.

## 3. Scope control

### Required core
- Register and log in
- JWT-protected APIs
- List and search vehicles by make, model, category, and price range
- Add/update/delete vehicles with admin controls
- Purchase stock and admin-only restocking
- React SPA with responsive layouts and disabled purchase action when stock is zero
- Persistent database, automated tests, setup instructions, screenshots, test report, `My AI Usage`, and root `PROMPTS.md`

### High-value differentiators (build after the required core works)
1. **Inventory movement ledger:** record each initial stock, purchase, and restock with actor, timestamp, delta, and quantity before/after. Show a simple vehicle history timeline to managers.
2. **Oversell protection:** use a conditional atomic database update inside a transaction; create the movement entry in the same transaction. Add an integration test for simultaneous purchases.
3. **Money correctness:** store prices as integer minor units (for example, paise for INR) and format them in the UI. Do not use floating-point numbers for persisted money.
4. **Traceable removal:** have the DELETE endpoint archive a vehicle rather than erase its history, so historical inventory movements remain explainable. Exclude archived vehicles from normal search and reject further stock operations on them. Document this behavior clearly.
5. **Operations-focused UX:** low-stock/out-of-stock labels, useful empty/error states, clear role-specific actions, responsive inventory view, and an activity timeline.
6. **Engineering evidence:** architecture decision notes, CI checks, a repeatable seed/demo flow, and a release checklist.

### Explicitly out of scope for the first release
Payment gateway, AI chatbot/recommendations, microservices, real-time websockets, vehicle image upload, complex analytics, and refresh-token infrastructure. These add risk without helping prove the core craftsmanship requirements.

## 4. Roles and permissions

| Capability | Staff | Admin |
|---|---:|---:|
| Register/login and view own profile | Yes | Yes |
| Browse/search vehicles | Yes | Yes |
| Purchase available stock | Yes | Yes |
| Add or update vehicle details | No | Yes |
| Restock inventory | No | Yes |
| Archive a vehicle | No | Yes |
| View inventory movement history | No | Yes |

Public registration must always create a **Staff** account. It must ignore/reject any client-supplied role; users cannot promote themselves to Admin. Create the initial Admin through a controlled seed command using environment-provided credentials.

## 5. Data model proposal

- **User:** `id`, `email` (unique), `passwordHash`, `role`, `createdAt`
- **Vehicle:** `id`, `make`, `model`, `category`, `priceInPaise`, `quantity`, `createdAt`, `updatedAt`, `archivedAt` (nullable)
- **InventoryMovement:** `id`, `vehicleId`, `actorUserId`, `type` (`INITIAL_STOCK`, `PURCHASE`, `RESTOCK`), `quantityDelta` (signed), `quantityBefore`, `quantityAfter`, optional `reason`, `createdAt`

Domain invariants:
- Quantity is an integer and never negative.
- Purchase/restock quantities are positive integers.
- Price is stored as an integer minor-unit value and validated as positive/non-negative according to the product rule documented in the API contract.
- Stock changes happen only through purchase/restock flows after vehicle creation; a general vehicle update cannot silently overwrite quantity.
- The vehicle stock change and its movement record succeed or fail together.
- Inventory movements are append-only from application flows.

## 6. API contract outline

All paths use `/api` as the prefix.

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (useful, small addition for session restoration)

### Vehicles
- `GET /api/vehicles` — protected, paginated list
- `GET /api/vehicles/search?make=&model=&category=&minPriceInPaise=&maxPriceInPaise=&page=&pageSize=` — protected, same validated filter logic
- `POST /api/vehicles` — Admin
- `PUT /api/vehicles/:id` — Admin; descriptive details, not stock quantity
- `DELETE /api/vehicles/:id` — Admin; archives the vehicle to preserve history

### Inventory
- `POST /api/vehicles/:id/purchase` — authenticated Staff/Admin; body contains a required positive integer `quantity`
- `POST /api/vehicles/:id/restock` — Admin; body contains a positive integer quantity and optional reason
- `GET /api/vehicles/:id/movements` — Admin; paginated movement history (small addition supporting the ledger differentiator)

### API behavior conventions
- Consistent JSON error shape, for example `{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Not enough stock available." } }`.
- Use `400` for malformed/invalid input, `401` for missing/invalid authentication, `403` for insufficient permissions, `404` for missing/archived resources, `409` for state conflicts such as insufficient stock, and `500` only for unexpected errors.
- Register the `/search` route before any `/:id` route to avoid route ambiguity.
- Never send password hashes or secret configuration in API responses.

## 7. Code structure (first pass)

```text
lotwise/
  backend/
    prisma/
    src/
      app.ts
      server.ts
      config/
      middleware/       # authenticate, authorize, validate, error handler
      modules/
        auth/           # routes, controller, service, schemas
        vehicles/       # routes, controller, service, schemas
        inventory/      # routes, controller, service
      lib/              # Prisma client, logger
    tests/
      unit/
      integration/
  frontend/
    src/
      app/
      components/
      features/
        auth/
        inventory/
        vehicle-admin/
      lib/              # typed API client, formatting
      pages/
      test/
  docs/
    architecture-decisions.md
    api-contract.md
    test-strategy.md
    release-checklist.md
  PROMPTS.md
  README.md
  .env.example
  docker-compose.yml
```

Do not create every file up front just to make the repository look sophisticated. Add modules when their first test-backed feature is started.

## 8. SDLC phases and exit criteria

### Phase 0 — Repository and working agreement
**Tasks:** create the repository, set the branch/commit convention, add `.gitignore`, `.editorconfig`, `.env.example`, Docker Compose for PostgreSQL, and a minimal README.

**Exit criteria:** clean clone can start the database; secrets are not committed; project commands are documented; the first commit is small and understandable.

### Phase 1 — Requirements and acceptance criteria
**Tasks:** turn each brief requirement into a user story and observable acceptance criteria. Confirm role permissions, search semantics, price units, purchase quantity semantics, error responses, and archive behavior.

**Deliverables:** `docs/api-contract.md`, a prioritized issue/backlog list, and a scope boundary.

**Exit criteria:** no core user flow depends on an unstated rule.

### Phase 2 — Design before implementation
**Tasks:** define the schema, endpoint request/response shapes, business invariants, basic screen wireframes, error format, and key architecture decisions.

**Deliverables:** schema sketch, small UI flow, `docs/architecture-decisions.md`, and `docs/test-strategy.md`.

**Exit criteria:** the design supports the core flows without adding unnecessary services or libraries.

### Phase 3 — Walking skeleton
**Tasks:** create backend and frontend shells, database connection/migration, health endpoint, frontend shell, lint/type-check/test commands, and an initial CI workflow.

**TDD rule:** infrastructure can be bootstrapped, but business behavior is not implemented before its tests.

**Exit criteria:** CI can install dependencies, run checks, and build both apps; the app can connect to a real database.

### Phase 4 — Vertical slices using Red → Green → Refactor
Build one complete, small behavior at a time. Each slice follows this loop:
1. Write the smallest failing test that captures an acceptance criterion (**Red**).
2. Implement the simplest behavior that makes it pass (**Green**).
3. Refactor while tests stay green; remove duplication and improve naming (**Refactor**).
4. Run the full relevant suite, inspect the diff, update docs, and commit.

Recommended slice order:
1. Shared error format and request validation
2. Registration/password hashing
3. Login/JWT middleware/role authorization
4. Vehicle creation and validation
5. Vehicle list and search filters
6. Vehicle detail update and archive
7. Restock + movement ledger
8. Purchase + movement ledger + atomic stock protection
9. Frontend authentication/session handling
10. Frontend inventory list/search/pagination
11. Frontend purchase flow and stock states
12. Admin create/update/restock/archive/history flows

**Exit criteria per slice:** tests cover success, invalid input, relevant authorization, and important failure paths; a small commit explains the behavior.

### Phase 5 — Integration and quality hardening
**Tasks:** test concurrent purchases against PostgreSQL, verify transactions keep stock and ledger consistent, check role bypass attempts, inspect API validation, and test loading/error/empty states. Add E2E tests for a staff purchase and an admin restock/admin edit flow.

**Exit criteria:** core invariants hold against a real database; tests are deterministic; no known blocker remains in primary flows.

### Phase 6 — Delivery engineering
**Tasks:** finish CI, add seed/demo data, verify fresh-database migrations, add API examples, document environment variables, and run a clean-clone rehearsal. Deploy only after the app can be rebuilt from the README.

**Exit criteria:** another developer can clone, configure, migrate, seed, test, build, and run the application by following the README.

### Phase 7 — Final review and demonstration
**Tasks:** execute the final test suite; generate a real test report; capture final screenshots; review accessibility/responsiveness; verify AI disclosure and raw prompt logs; review commit history; tag a release.

**Exit criteria:** every assignment deliverable exists, reflects the actual state of the repository, and can be demonstrated live.

## 9. Test-first checklist

### Authentication/security
- Valid registration succeeds and stores a hash—not the original password.
- Duplicate email is handled predictably.
- Invalid email/weak or missing password is rejected.
- Login succeeds with valid credentials and fails with incorrect credentials.
- Protected endpoint rejects missing/invalid/expired tokens.
- Registration cannot create an Admin even if the request includes `role: "ADMIN"`.
- Staff cannot access Admin-only operations.

### Vehicles/search
- Required fields, category, price, and quantity are validated.
- Search independently filters make, model, category, minimum/maximum price, and combinations of filters.
- Pagination is stable and reports total count.
- Invalid ranges and malformed pagination are rejected.
- Archived vehicles disappear from normal lists and cannot be purchased/restocked.

### Inventory integrity
- Purchase decrements the requested quantity when enough stock exists.
- Purchase fails with a conflict when stock is insufficient and leaves stock unchanged.
- Purchase fails at zero stock; quantity never becomes negative.
- Restock increases quantity only for an Admin and only for a positive integer.
- A successful stock change writes exactly one correct movement record.
- A failed stock change writes no movement record.
- A movement has correct actor, delta, before/after quantities, and timestamp.
- Concurrent purchases cannot sell more than the available quantity.
- Database transaction failure cannot leave stock and history inconsistent.

### Frontend/accessibility
- Login and invalid form states are understandable.
- Search/filter controls can be used with a keyboard and have labels.
- Purchase is disabled when stock is zero.
- Success and failure feedback is clear, and stock refreshes after mutation.
- Loading, empty, API-error, and unauthorized states render usefully.
- Staff do not see admin actions; API security still protects them if they manipulate the client.
- Layout works on mobile and desktop; interactive controls have visible focus states.

### Test layers
- **Unit:** pure business helpers, validators, and rules.
- **Integration:** API + real PostgreSQL for persistence, permission checks, transactions, and concurrency.
- **Component:** React behavior and key UI states.
- **E2E:** only the most important full journeys; avoid duplicating every unit test in the browser.

Prefer meaningful behavior coverage over chasing a coverage number. Once the main rules are covered, establish a sensible threshold for critical backend logic and enforce it in CI.

## 10. Git and AI transparency rules

### Commit style
Use small, descriptive Conventional Commit-style messages, for example:
- `test: specify registration validation behavior`
- `feat: reject duplicate registration emails`
- `refactor: isolate password hashing behind auth service`
- `test: cover concurrent vehicle purchases`

Preserve visible Red/Green/Refactor evidence. Do not squash away the learning trail if the reviewer is expected to inspect it.

### AI co-author trailer
For every commit where an AI tool contributed, follow the assignment's required format: add two blank lines and a `Co-authored-by` trailer naming the actual tool used and the appropriate noreply identity. Use the assignment's example as a format guide; do not claim an AI tool was used if it was not, and do not omit the trailer from AI-assisted commits.

### `PROMPTS.md`
The assignment requests raw, unedited AI chats or public conversation links—not summaries. Keep this file at the repository root. Copy actual prompts and responses exactly, or link the original conversations. Do not fabricate logs or rewrite a conversation into a summary. Avoid pasting secrets, credentials, personal data, or private production information into the log.

### README: mandatory `My AI Usage` section
Explain which AI tools were genuinely used, the tasks they helped with, what you reviewed/changed, how tests were used to validate suggestions, known limitations, and what you learned. Be ready to discuss specific examples in an interview.

## 11. README and submission checklist

- [ ] Problem statement and feature overview
- [ ] Architecture and technology choices with rationale
- [ ] Prerequisites and exact local setup commands
- [ ] `.env.example` variable descriptions (no real secrets)
- [ ] Database migration and seed instructions
- [ ] Separate backend/frontend run commands
- [ ] Test, coverage, lint, type-check, and build commands
- [ ] API endpoint examples and role matrix
- [ ] Screenshots of real application states
- [ ] A test report generated from an actual run (never invented)
- [ ] Mandatory `My AI Usage` section
- [ ] Root `PROMPTS.md` with raw logs or conversation links
- [ ] Public repository URL
- [ ] Optional live deployment and health check
- [ ] Clean-clone rehearsal completed

## 12. Final demo story (about 3 minutes)

1. Sign in as Staff, search for a vehicle, and show category/price filters.
2. Purchase available stock and show the updated count and resulting movement history (where permissions allow).
3. Attempt a purchase beyond available stock and show a clear conflict response without negative stock.
4. Sign in as Admin, restock the vehicle with a reason, and show the new movement entry.
5. Show that Staff cannot perform admin actions, even by calling the API directly.
6. Finish with the CI run, a concise TDD commit sequence, the real test report, and the README's AI usage disclosure.

## 13. Definition of Done

A feature is done only when its acceptance criteria are tested, the implementation is reviewed/refactored, relevant tests and checks pass, API/UI behavior is documented, the diff is focused, AI use is disclosed when applicable, and the commit tells the truth about what changed.

A release is done only when a fresh clone can run it, core user journeys pass, database invariants hold, secrets are absent from Git, submission artifacts are complete, and the demo uses the actual deployed/current code.

---

## First execution task (do this before writing business logic)

Create the Git repository and the minimal project skeleton, then write `docs/api-contract.md` with exact decisions for:
- account role defaults and permissions;
- price representation and API units;
- purchase quantity semantics;
- pagination and filter query parameters;
- error response shape/status codes;
- whether deletion is archive/soft-delete behavior;
- inventory movement fields.

Do not begin vehicle or auth implementation until this contract is reviewed and accepted. The next implementation slice should start with a failing test for request validation/error shape, then follow Red → Green → Refactor.
