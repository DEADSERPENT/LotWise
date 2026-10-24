# Lotwise API Contract — v1

**Status:** Proposed baseline for implementation. Implement tests against this contract before writing business logic.  
**Base path:** `/api`  
**Transport:** JSON over HTTPS in production; JSON over HTTP on local development.  
**Authentication:** JWT bearer access token in `Authorization: Bearer <token>` for protected routes.

## 1. Contract decisions

1. **Roles:** `STAFF` and `ADMIN`. Public registration always creates `STAFF`; role supplied by the client is rejected. Admin is created only through a controlled database seed using environment variables.
2. **Money:** prices are positive integer minor units (`priceInPaise`) at the API and persistence layers. The UI displays INR (`₹`) by dividing paise by 100 and formatting to two decimal places. Do not send binary floating-point rupees to the API.
3. **Stock:** quantity is a non-negative integer. Purchase/restock request quantity is a required positive integer. Vehicle update cannot directly change stock.
4. **Catalog:** regular vehicle lists include active vehicles even when quantity is zero; the UI labels zero-stock vehicles and disables Purchase. Archived vehicles are hidden from normal routes.
5. **Delete:** `DELETE /vehicles/:id` archives the vehicle (`archivedAt`), rather than deleting the database row. This preserves movement history. The response is `204 No Content`; an archived vehicle cannot be purchased or restocked.
6. **Inventory integrity:** update stock and create its movement entry in one database transaction. Purchase uses an atomic conditional update so concurrent requests cannot reduce stock below zero.
7. **Pagination:** default `page=1`, `pageSize=20`; maximum `pageSize=100`. Pages are 1-indexed.
8. **Errors:** use the same JSON error envelope for expected errors; never expose stack traces or secrets.
9. **Date/time:** timestamps are ISO-8601 UTC strings.

## 2. Authentication

### `POST /api/auth/register`

**Request**

```json
{
  "email": "staff@example.com",
  "password": "a-long-password"
}
```

**Validation**
- Normalize email by trimming and lowercasing it.
- Require a syntactically valid email.
- Require a password of at least 8 characters; never log it.
- Reject unexpected role fields rather than trusting them.
- A duplicate email returns `409 EMAIL_ALREADY_EXISTS`.

**Success — `201 Created`**

```json
{
  "user": {
    "id": "uuid",
    "email": "staff@example.com",
    "role": "STAFF",
    "createdAt": "2026-10-24T12:00:00.000Z"
  },
  "accessToken": "jwt-token"
}
```

Password hashes are never returned.

### `POST /api/auth/login`

**Request**

```json
{
  "email": "staff@example.com",
  "password": "a-long-password"
}
```

**Success — `200 OK`** returns the same `user` shape and `accessToken` as registration. Invalid credentials return `401 INVALID_CREDENTIALS` without revealing whether the email exists.

### `GET /api/auth/me`

Requires authentication. Returns `{ "user": { "id", "email", "role", "createdAt" } }`.

**Token policy:** access tokens have a configured finite expiry (initial target: 30 minutes). The initial release does not implement refresh tokens; an expired session must log in again. Keep signing secrets in environment configuration.

## 3. Vehicle representation

```json
{
  "id": "uuid",
  "make": "Toyota",
  "model": "Corolla",
  "category": "SEDAN",
  "priceInPaise": 185000000,
  "quantity": 4,
  "createdAt": "2026-10-24T12:00:00.000Z",
  "updatedAt": "2026-10-24T12:00:00.000Z"
}
```

`priceInPaise: 185000000` represents ₹1,850,000.00. The frontend owns formatting; the backend performs calculations using integer units. `archivedAt` is internal and is not included in normal vehicle responses.

### `GET /api/vehicles`

Requires authentication. Lists active vehicles, including vehicles with zero stock.

Supported query parameters:
- `page` — integer, default `1`
- `pageSize` — integer, default `20`, maximum `100`
- `sortBy` — one of `createdAt`, `make`, `priceInPaise`, `quantity`; default `createdAt`
- `sortOrder` — `asc` or `desc`; default `desc`

**Success — `200 OK`**

```json
{
  "data": [
    {
      "id": "uuid",
      "make": "Toyota",
      "model": "Corolla",
      "category": "SEDAN",
      "priceInPaise": 185000000,
      "quantity": 4,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### `GET /api/vehicles/search`

Requires authentication. Uses the same list response shape and pagination rules as `GET /api/vehicles`.

Supported filters (case-insensitive text matching):
- `make` — partial match
- `model` — partial match
- `category` — exact match after normalizing whitespace/case
- `minPriceInPaise` — inclusive integer lower bound
- `maxPriceInPaise` — inclusive integer upper bound
- plus `page`, `pageSize`, `sortBy`, and `sortOrder`

If both price bounds are present, the minimum must be less than or equal to the maximum. Invalid bounds or parameters return `400 VALIDATION_ERROR`. An empty result is `200 OK` with `data: []`.

### `POST /api/vehicles` — Admin only

Creates a vehicle and its `INITIAL_STOCK` movement within the same transaction.

**Request**

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "category": "SEDAN",
  "priceInPaise": 185000000,
  "quantity": 4
}
```

**Validation:** trimmed non-empty make/model/category; `priceInPaise` is a positive integer; `quantity` is a non-negative integer. **Success:** `201 Created` with `{ "data": <vehicle> }`. Quantity zero is allowed for catalogue setup; the UI displays Out of stock.

### `PUT /api/vehicles/:id` — Admin only

Replaces editable vehicle details. All four fields below are required; `quantity` is deliberately excluded so stock adjustments cannot bypass the inventory ledger.

```json
{
  "make": "Toyota",
  "model": "Corolla Hybrid",
  "category": "SEDAN",
  "priceInPaise": 199500000
}
```

**Success:** `200 OK` with `{ "data": <vehicle> }`. Missing or archived vehicle returns `404 VEHICLE_NOT_FOUND`.

### `DELETE /api/vehicles/:id` — Admin only

Archives an active vehicle while preserving its inventory movements. **Success:** `204 No Content`. A missing or already archived vehicle returns `404 VEHICLE_NOT_FOUND`.

## 4. Inventory operations

### `POST /api/vehicles/:id/purchase` — Staff/Admin

**Request**

```json
{
  "quantity": 1
}
```

`quantity` is required and must be a positive integer. Execute a conditional stock decrement and insert a `PURCHASE` movement in the same transaction.

**Success — `200 OK`**

```json
{
  "data": {
    "vehicle": {
      "id": "uuid",
      "make": "Toyota",
      "model": "Corolla",
      "category": "SEDAN",
      "priceInPaise": 185000000,
      "quantity": 3,
      "createdAt": "2026-10-24T12:00:00.000Z",
      "updatedAt": "2026-10-24T12:01:00.000Z"
    },
    "movement": {
      "id": "uuid",
      "type": "PURCHASE",
      "quantityDelta": -1,
      "quantityBefore": 4,
      "quantityAfter": 3,
      "createdAt": "2026-10-24T12:01:00.000Z"
    }
  }
}
```

- Insufficient stock returns `409 INSUFFICIENT_STOCK` and changes neither vehicle quantity nor movement history.
- Missing/archived vehicle returns `404 VEHICLE_NOT_FOUND`.
- The endpoint must remain correct for simultaneous purchases; a pre-read followed by an unconditional decrement is not sufficient.

### `POST /api/vehicles/:id/restock` — Admin only

**Request**

```json
{
  "quantity": 5,
  "reason": "New shipment received"
}
```

`quantity` is a positive integer. `reason` is optional text with a reasonable maximum length.

**Success — `200 OK`** returns the updated vehicle and a `RESTOCK` movement, with matching before/after quantities. Missing/archived vehicle returns `404 VEHICLE_NOT_FOUND`. Invalid quantity returns `400 VALIDATION_ERROR`.

### `GET /api/vehicles/:id/movements` — Admin only

Returns movement history in chronological order with pagination.

```json
{
  "data": [
    {
      "id": "uuid",
      "vehicleId": "uuid",
      "actorUserId": "uuid",
      "type": "RESTOCK",
      "quantityDelta": 5,
      "quantityBefore": 3,
      "quantityAfter": 8,
      "reason": "New shipment received",
      "createdAt": "2026-10-24T12:02:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Movement rows are append-only through application features. Vehicle creation always makes an `INITIAL_STOCK` record, including when initial quantity is zero (`quantityDelta: 0`, `quantityBefore: 0`, `quantityAfter: 0`). Archive does not delete prior movement history. Admins can read movement history for archived vehicles, although archived vehicles remain excluded from normal catalog and stock-operation routes.

## 5. Standard errors

All expected errors use this shape:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock available."
  }
}
```

| HTTP | Example code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid body/query/parameter |
| `401` | `UNAUTHENTICATED` | Missing, malformed, invalid, or expired token |
| `401` | `INVALID_CREDENTIALS` | Login failed |
| `403` | `FORBIDDEN` | Authenticated user lacks permission |
| `404` | `VEHICLE_NOT_FOUND` | Vehicle does not exist or is archived |
| `409` | `EMAIL_ALREADY_EXISTS` | Email is already registered |
| `409` | `INSUFFICIENT_STOCK` | Requested purchase exceeds available quantity |
| `500` | `INTERNAL_ERROR` | Unexpected server error; no stack trace in response |

Validation details may be included as a structured `details` array only for `400` responses; never include passwords, tokens, SQL, or stack traces.

## 6. Public health endpoint

### `GET /api/health`

Returns `200 OK` with `{ "status": "ok" }` when the application is healthy. If database connectivity is part of the health check, document that behavior and return a non-200 status when the dependency is unavailable. Do not expose secrets or connection strings.

## 7. Contract-level acceptance tests

- [ ] Public registration cannot create an Admin.
- [ ] Passwords are hashed and never returned.
- [ ] Every protected endpoint rejects missing/invalid authentication.
- [ ] Admin-only operations reject Staff.
- [ ] Search supports each filter individually and in combination.
- [ ] Invalid page, page size, sort field, and price range return `400`.
- [ ] A purchase decrements stock and writes one movement atomically.
- [ ] Insufficient stock has no side effects.
- [ ] Concurrent purchases cannot drive stock negative or oversell.
- [ ] Restock changes stock and writes one movement atomically.
- [ ] Vehicle edits cannot bypass the stock movement path.
- [ ] Archiving hides the vehicle and preserves movement history.
- [ ] Responses do not leak password hashes, tokens, or internal exceptions.

## 8. Final implementation decisions

- Maximum lengths: `make` 80 characters, `model` 80, `category` 40, and `reason` 300. Trim leading/trailing whitespace before storing text fields.
- Password policy: minimum 8 characters; use a modern password-hashing library (Argon2id preferred) and do not log password values.
- The frontend keeps the short-lived JWT in `sessionStorage` for tab-session persistence. This is a practical assignment choice, not a claim that browser storage is immune to XSS; keep token lifetime finite, avoid unsafe HTML rendering, and document the trade-off.
- `GET /api/vehicles/search` is a separate route that calls the same validated listing/search service as `GET /api/vehicles`; do not duplicate filter logic.
- `GET /api/vehicles/:id/movements` remains available to Admin for archived vehicles so that archiving does not destroy auditability.
