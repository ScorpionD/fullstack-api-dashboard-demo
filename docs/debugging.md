# Five debugging cases

The final main branch contains corrected application code. These are intentional engineering exercises, not claims about client incidents. The separate `debugging/reproductions` branch stops at `7f0bcef` and is never deployed. Running the 24 unit/React checks on it produced **10 failures and 14 passes**, detecting all five intentionally introduced problems. Each fix below then passed its focused regression checks.

| Case              | Regression                                    | Correct behavior                                                 | Tests                                                     |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| API mapping       | Database field names used as frontend keys    | Explicit mapping of customer metadata and integer monetary cents | `tests/contracts.test.ts`, real API order CRUD            |
| Session expiry    | Row existence treated as authentication       | Expiry checked on every request; 401 for expired sessions        | Contract and API expiry tests                             |
| Loading/error     | Rejection leaves spinner active               | Error finishes loading; retry recovers; stale requests cancelled | React failure/retry/stale response tests                  |
| Pagination/filter | Later page preserved after result set shrinks | Client resets page, backend clamps and keeps totals consistent   | Contract, React and real database filtering tests         |
| Validation        | Zero, negative or fractional cents accepted   | Positive bounded integer schema plus PostgreSQL constraints      | Parameterized invalid-amount tests and real failed update |

The debugging casebook in the UI summarizes these examples. The Integration Lab's timeout/bad-response controls are safe adapter simulations, not broken authentication, validation or production branches.

## Review the fixes

| Fix commit | Change                                                           | Focused checks |
| ---------- | ---------------------------------------------------------------- | -------------- |
| `55ac1f6`  | Explicit snake_case → camelCase mapping; preserve integer cents  | 1 passed       |
| `44801a3`  | Reject expired or invalid session timestamps                     | 2 passed       |
| `0baa71c`  | End loading on rejection and keep retry usable                   | 2 passed       |
| `05110df`  | Clamp pagination after filtering or deletion                     | 4 passed       |
| `072c732`  | Reject non-integer, coerced, negative, zero or excessive amounts | 8 passed       |

The changes are merged into `main`; production deploys only that branch. The historical reproduction commit retains the original CI configuration and has an expected failing check; this is part of the exercise, not a failed release. To reproduce locally, use a disposable checkout with no production credentials:

```sh
git switch debugging/reproductions
npm ci
npm run test:unit # Expected: 10 failures, 14 passes
git switch main
npm ci
npm run test:unit # Expected: all passing
```

Do not run or deploy the reproduction branch against a public API or real business data.
