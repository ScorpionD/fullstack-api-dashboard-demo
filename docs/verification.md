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

- **32 layouts:** login, overview, customers, orders, audit log, integration lab, debugging cases and architecture at **320, 390, 768 and 1440 px**. Each measurement checks the actual viewport and page heading, not only the requested emulation size. No page-level horizontal overflow was found. Customer/order tables become labelled cards on narrow screens.
- **Four edit-order modal sizes:** the modal fits within the viewport at all four widths. Checked mobile navigation, readable fields and visible action/confirmation controls. Closed mobile navigation is hidden from keyboard/accessibility navigation.
- Created a fictional customer, changed its company and status, then created an order for €1,250.50 and updated it to €1,840.00 / completed. Searching the actual order reference returned the correct customer and amount; the session and saved record survived a page reload.
- Tried to delete the customer while an order referenced it: the UI showed the related-record conflict and retained the customer. Confirmed that **Keep record** cancels deletion. Then deleted the test order and customer successfully.
- Verified **six real audit events** (create/update/delete for both entities), including Admin actor/role and changed field names. Test records were removed; their audit trail remains until the isolated workspace expires.
- Changed a later-page status filter and confirmed it returned to page 1 with matching totals. A no-result search shows a clear empty state; **Clear filters** restores the full list.
- Ran the normal integration path, simulated timeout and simulated malformed response. Cached/last-verified data is identified explicitly; simulated failures cannot be mistaken for a new live result.
- Entered as **Viewer**: creation, editing, deletion and audit navigation are disabled with an explanation. API authorization is separately checked by the automated and public smoke suites.
- Saved real production captures in the [screenshot gallery](screenshots/README.md). Data is fictional and no infrastructure settings or secrets appear in these images. Measured dimensions are preserved in [browser-verification.json](browser-verification.json).

The browser and smoke checks above exercise application commit `029fe0b45c76e8d66e8aa84c8d9f8f8cffe42827`; subsequent release changes add documentation and images only. Its [GitHub Actions run](https://github.com/ScorpionD/fullstack-api-dashboard-demo/actions/runs/34593170081) passed.

## Deployment and isolation

The corrected application is live on Cloudflare Pages. The Node.js API and PostgreSQL containers are healthy; the dedicated tunnel reaches the private API. PostgreSQL has no published production host port. The API's only host binding is loopback and its origin secret is required. The runtime database role is not a superuser and cannot create roles or databases.

The application release was initially deployed from `main` using an explicit Cloudflare Pages build trigger. On 11 September 2026 the owner completed GitHub's **Confirm access** step, and `fullstack-api-dashboard-demo` was added to the Cloudflare GitHub App's selected repositories. Existing repository selections were preserved. The project's Git source, production branch (`main`), build command (`npm run build`), output (`dist`) and production service binding remain configured. Production push deployments are enabled; preview deployments remain disabled.

The new deployment has independent services, networks, volume and credentials. No application or DNS changes were made to the other portfolio projects or cryptoanalyze.pro. The live site does not depend on the developer computer being online.

The public smoke command deliberately uses only published demo credentials, creates separate demo workspaces, removes its own test records and invalidates its sessions. It never reads deployment secrets. This record documents functional verification, not an independent penetration test or a production SLA.
