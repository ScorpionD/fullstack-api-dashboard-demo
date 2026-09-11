# REST API reference

Production base URL: `https://fullstack-api-dashboard-demo.pages.dev/api`.

The API is accessed from the same-origin browser. `POST`, `PUT` and `DELETE` require the exact public `Origin` header. Authenticated mutations also require `X-CSRF-Token`, obtained at login or session restoration. Session cookies are HttpOnly; JavaScript never receives the authentication token itself.

| Method | Path                  | Access                 | Contract                                                             |
| ------ | --------------------- | ---------------------- | -------------------------------------------------------------------- |
| GET    | `/health`             | Public through gateway | Service and database readiness                                       |
| POST   | `/auth/login`         | Public                 | `{email,password}` → `{user,csrfToken,workspaceId}` + session cookie |
| GET    | `/auth/session`       | Signed in              | Restore current identity and CSRF token                              |
| POST   | `/auth/logout`        | Signed in + CSRF       | Invalidate session, clear cookie; 204                                |
| GET    | `/overview`           | Admin/user             | Totals, trend, pipeline, recent orders                               |
| GET    | `/customers`          | Admin/user             | Paginated customer list                                              |
| GET    | `/customer-options`   | Admin/user             | Bounded customer selector for this workspace                         |
| POST   | `/customers`          | Admin + CSRF           | Create; 201 `{data: Customer}`                                       |
| PUT    | `/customers/:id`      | Admin + CSRF           | Replace editable fields; 200                                         |
| DELETE | `/customers/:id`      | Admin + CSRF           | Delete if no related orders; 204                                     |
| GET    | `/orders`             | Admin/user             | Paginated order list with customer metadata                          |
| POST   | `/orders`             | Admin + CSRF           | Create; 201 `{data: Order}`                                          |
| PUT    | `/orders/:id`         | Admin + CSRF           | Replace editable fields; 200                                         |
| DELETE | `/orders/:id`         | Admin + CSRF           | Delete; 204                                                          |
| GET    | `/audit`              | Admin                  | Paginated immutable API audit view                                   |
| GET    | `/integrations/rates` | Admin/user             | `scenario=live`, `timeout` or `bad-response`                         |

## Lists

Query parameters: `search` (maximum 100 characters), `status`, `page` (1–10000), `pageSize` (1–50; default 8). Customer statuses: `active`, `inactive`; order statuses: `pending`, `processing`, `completed`, `cancelled`. Omit status or use `all` for all states. Unknown query keys are rejected. Audit uses pagination only.

```json
{ "data": [], "meta": { "page": 1, "pageSize": 8, "pages": 1, "total": 0 } }
```

Search is case-insensitive; SQL wildcard characters are escaped. Customers search name/email/company; orders search reference/customer/company. Results are sorted by creation time and UUID for stable pagination. An out-of-range page is clamped to the last valid page. List rows and totals are read from the same database snapshot.

## Write bodies

Customer:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "company": "Demo Studio",
  "status": "active"
}
```

Order:

```json
{
  "customerId": "UUID of a customer in this workspace",
  "description": "API integration sprint",
  "amountCents": 123456,
  "status": "pending"
}
```

Order amounts are integer EUR cents, 1–100000000 (€0.01–€1,000,000). Fractional cents, strings, negative or zero amounts are rejected. Names are 2–80 characters, company names 2–100, descriptions 2–120 and email addresses at most 160 characters. Bodies must be JSON and at most 16 KiB. Unknown properties, including attempted workspace or role overrides, are rejected.

## Audit records

`GET /audit` is admin-only and returns `{data,meta}`. Each row includes `id`, `action` (`create`, `update`, `delete`), `entity` (`customer`, `order`), `summary`, `created_at`, `actor` and `role` (`admin` or `user`, labelled Viewer in the UI). Update summaries identify changed business fields; a no-op update is explicitly described as having no field-value changes. Timestamps use ISO 8601 in the API and the visitor's local time in the UI.

All business CRUD writes and their before/after audit records share the same PostgreSQL transaction. Failed writes do not leave an audit record. The audit endpoint does not offer edit/delete actions.

## Error responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "requestId": "server-generated UUID",
    "fields": { "amountCents": "Validation explanation" }
  }
}
```

400 invalid input/JSON; 401 expired or absent session; 403 origin/CSRF/role denial; 404 missing record/route; 409 duplicate, related record or demo capacity; 413 oversized request; 429 rate limit; 503 service unavailable. Infrastructure details, SQL errors, passwords and stack traces are not returned. The gateway may return the same code/message envelope without a backend request ID when the request never reached the API.

## Limits and external-service status

Gateway/API limit: 120 requests/minute/IP. Login: 12 attempts/hour/IP. Public workspaces: 200 concurrent unexpired workspaces; 100 customers and 200 orders each. The server trusts forwarding headers only behind the authenticated private gateway.

Rate adapter: fixed external URL, 1.8-second timeout per attempt, at most one retry, schema validation, 15-minute in-memory cache. `live`/`cached` contain verified data. `fallback` contains the last verified data and a reason; `unavailable` returns null rates. Cache clears on API restart. Simulations are request-scoped and explicitly labelled; no fake rates are generated. A fallback is not counted as a provider success.
