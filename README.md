# CyberSec Summit 2026

## Run the site

The project uses Node.js built-in modules; no package installation is required. From the project folder run:

```powershell
node server.js
```

Open `http://localhost:3000/`. The Node server hosts the pages and same-origin REST API. Do not use a static `file://` URL or `python -m http.server` for the API-backed pages.

## Pages

- **Home and storefront:** `index.html`
- **Attendee registration and session selection:** `signup.html` and `finalization.html`
- **Session proposal submission and moderator review:** `proposal.html` (React)
- **Billing and order summary:** `billing.html` (AngularJS)
- **Product returns:** `returns.html` (AngularJS and jQuery catalog search)
- **Conference product manager and cart:** `sessions.html` and `cart.html`

## REST API

- `GET /api/products` — return the conference product catalog.
- `GET /api/proposals` — list session proposals; optional `?status=pending|approved|rejected`.
- `POST /api/proposals` — submit a proposal as JSON; new records start as `pending`.
- `PATCH /api/proposals/:id` — set a proposal's status to `approved` or `rejected`.
- `POST /api/billing` — validate and record a demo order with billing details, product IDs, quantities, and masked payment information.
- `POST /api/returns` — validate and record a product return request.

JSON records are written to `.data/` and are excluded from Git. The directory is created on the first successful submission.

## Demo and payment safety

This is a course demonstration, not a production checkout or authenticated moderation system. Proposal approval is open to anyone who can access the demo server. Billing validates a card number, expiration, and security code in the browser, then discards those values before sending the request. The API only receives the payment method and last four digits; full card numbers and security codes are rejected if included. The server verifies product prices and order totals, records a demo order, and does not charge a payment method. Do not enter real payment or personal information.

The existing registration finalization page remains in its labeled demo mode by default. Its API endpoint can be configured in `js/registration-config.js`.
