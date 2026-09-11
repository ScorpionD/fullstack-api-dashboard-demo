# Verification

Verified on 11 September 2026 against the real deployed application.

## Automated verification

- `npm test`: **47 passed**, using Vitest 4.1.11, Testing Library and Supertest. Includes 17 API tests against a separate real PostgreSQL test database and 30 contract/frontend checks. The original 42-check baseline is extended with role selection, clearing filters, order-form retry with preserved input, avoiding unnecessary requests and honest integration error/retry handling.
- `npm run lint`: strict TypeScript checking passed. This script does not claim to run ESLint.
- `npm run build`: TypeScript and Vite production build passed. Main JavaScript bundle approximately 277 kB, 86 kB compressed; no source maps or server secrets in the frontend bundle.
- `npm audit --audit-level=moderate`: **0 vulnerabilities** at verification time.
- GitHub Actions runs the full PostgreSQL-backed test suite and production build. The intentionally broken historical reproduction commit is expected to fail; corrected release checks pass.
- `npm run smoke:production`: **14 live check groups passed** through the public Pages URL, including secure cookies, session restoration, role checks, origin/CSRF protection, size limits, customer/order CRUD, duplicate checks, filtered pagination, audit consistency, live Frankfurter responses and timeout/malformed-response fallback.

## Browser verification

- Desktop: inspected the real login and dashboard at 1920 px and 1366 px.
- Mobile: inspected 390 px and 320 px layouts; no page-level horizontal overflow. Wide data tables scroll inside their own container.
- Created, edited and deleted a customer in an isolated browser workspace; verified the saved company name and authenticated session after page reload.
- Created an order through the mobile form, verified the customer, €1,250.50 amount and completed status, then removed the test order.
- Changed a later-page status filter and confirmed it returned to page 1 with the matching totals.
- Checked modal layout, mobile navigation, confirmation controls and the external-integration fallback display. Closed mobile navigation is hidden from keyboard/accessibility navigation.
- Saved real application screenshots in [screenshots](screenshots). Data is fictional and no infrastructure settings or secrets appear in these images.

## Deployment and isolation

The corrected application is live on Cloudflare Pages. The Node.js API and PostgreSQL containers are healthy; the dedicated tunnel reaches the private API. PostgreSQL has no published production host port. The API's only host binding is loopback and its origin secret is required. The runtime database role is not a superuser and cannot create roles or databases.

The new deployment has independent services, networks, volume and credentials. No application or DNS changes were made to the other portfolio projects or cryptoanalyze.pro. The live site does not depend on the developer computer being online.

The public smoke command deliberately uses only published demo credentials, creates separate demo workspaces, removes its own test records and invalidates its sessions. It never reads deployment secrets. This record documents functional verification, not an independent penetration test or a production SLA.
