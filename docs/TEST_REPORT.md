# Test Report

**Project:** LotWise — Dealership Inventory System
**Report date:** 25 October 2026
**Reference commit:** `113404f`

---

## 1. Executive summary

All seven verification checks pass, both in the previously recorded run and in a fresh run performed for this report.

- **Backend:** 113 of 113 tests pass across 10 files. Coverage meets every configured threshold (statements 98.04 %, branches 86.95 %, functions 98.24 %, lines 97.74 %).
- **Frontend:** the current suite has 10 tests, all passing. The recorded run had 8; the frontend was restructured and extended after that run (see §4).
- **Static analysis:** type-checking and linting pass for both applications.

Browser end-to-end testing and a formal accessibility audit are outside the scope of this report and were not performed.

## 2. Test environment

| Item | Value |
|---|---|
| Node.js | 24.20.0 |
| npm | 11.19.0 |
| PostgreSQL | 16.15 (`postgres:16-alpine`, via Docker Compose) |
| Backend test runner | Vitest, Supertest, real PostgreSQL |
| Frontend test runner | Vitest, React Testing Library, jsdom |
| Test database | `<database>_test`, derived from `DATABASE_URL` and recreated on every run, so development data is never touched |

**State under test.** The reference commit is `113404f`. The fresh run (25 October 2026, 16:14 UTC) used the working tree at `1fdb916`, which is two commits later (documentation removal and CI workflow). The `backend/` directory is identical between `113404f` and `1fdb916`. At that time `README.md` was modified, and `PROMPTS.md`, `docs/` and `frontend/` were not yet committed. The frontend results therefore describe the working tree, not a commit.

## 3. Verification results

| Check | Command | Recorded result | Fresh run (16:14 UTC) |
|---|---|---|---|
| Backend tests | `npm test --prefix backend` | 113 / 113 passed, 10 files | 113 / 113 passed, 10 files |
| Backend coverage | `npm run test:coverage --prefix backend` | Thresholds met | Thresholds met |
| Backend typecheck | `npm run typecheck --prefix backend` | Passed | Passed |
| Backend lint | `npm run lint --prefix backend` | Passed | Passed |
| Frontend tests | `npm test --prefix frontend` | 8 / 8 passed, 1 file | **10 / 10** passed, 1 file |
| Frontend typecheck | `npm run typecheck --prefix frontend` | Passed | Passed |
| Frontend lint | `npm run lint --prefix frontend` | Passed | Passed |

## 4. Note on the frontend result

The recorded frontend figure (8 tests) predates a restructuring of the frontend into feature modules. The current suite adds two tests (the lot-map view and the command palette) to the original eight, which cover sign-in, search and filtering, purchase behaviour and admin controls. The fresh run is the authoritative figure for the frontend.

## 5. Backend coverage

| Metric | Covered | Total | Coverage | Threshold | Status |
|---|---:|---:|---:|---:|---|
| Statements | 201 | 205 | 98.04 % | 90 % | Met |
| Branches | 60 | 69 | 86.95 % | 80 % | Met |
| Functions | 56 | 57 | 98.24 % | 90 % | Met |
| Lines | 173 | 177 | 97.74 % | 90 % | Met |

The fresh run reproduced the recorded figures exactly. Coverage is measured for `backend/src`, excluding the generated Prisma client and `server.ts`. Frontend coverage is not measured.

## 6. Backend test distribution

| File | Tests | Scope |
|---|---:|---|
| `integration/vehicles.test.ts` | 43 | CRUD, search, pagination, access control |
| `integration/inventory.test.ts` | 32 | Purchases, restocking, stock ceiling, concurrency, rollback, ledger |
| `integration/auth.test.ts` | 16 | Registration, login, token validation |
| `integration/error-handling.test.ts` | 5 | Error response envelope |
| `integration/seed.test.ts` | 4 | Administrator and demo-data seed |
| `integration/health.test.ts` | 3 | Health endpoint |
| `integration/db-integrity.test.ts` | 3 | Database constraints and ledger arithmetic |
| `unit/env.test.ts` | 3 | Environment validation |
| `integration/database.test.ts` | 2 | Connectivity and migrations |
| `unit/parse.test.ts` | 2 | Input parsing helper |
| **Total** | **113** | **0 failed** |

Per-file counts in the fresh run match the recorded distribution.

## 7. Reproduction

```bash
cp .env.example .env
npm run install:all
npm run db:up

npm test --prefix backend
npm run test:coverage --prefix backend
npm run typecheck --prefix backend
npm run lint --prefix backend

npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
```

Backend integration tests require a running PostgreSQL instance (`npm run db:up` starts one with Docker). Each run drops and recreates the isolated `_test` database.

## 8. Scope and limitations

- **Out of scope:** browser end-to-end testing and a formal accessibility audit were not performed and are not implied by this report.
- **Frontend tests** are component-level and run against a stubbed network layer; they do not exercise the real API. The backend integration tests do exercise a real PostgreSQL database.
- **Frontend test timing:** the frontend tests were written after the interface, not test-first. The backend contains one recorded Red-Green-Refactor cycle (commits `6d1c47e`, `cb752d2`, `113404f`).
- **Continuous integration:** results from the GitHub Actions workflow are not covered by this report.
- **Test count** reflects scenario coverage and is not itself a quality measure; coverage thresholds are enforced by `backend/vitest.config.ts`.

## 9. Conclusion

At the time of the fresh run, every verification check passed: 113 of 113 backend tests with all coverage thresholds met, 10 of 10 frontend tests, and clean type-checking and linting for both applications. The backend results are unchanged from the recorded run. The frontend result differs from the recorded figure because the frontend was extended afterwards, as explained in §4.
