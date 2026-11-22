# CyberSec Summit 2026

## Run the site

The site uses Express to serve the frontend from `public/` and Mongoose to persist conference data in MongoDB.

1. Install Node.js 20 or newer and start MongoDB locally, or create a MongoDB Atlas database.
2. From the project folder, install dependencies and create your local environment file:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

3. If needed, edit `MONGODB_URI` in `.env` to your MongoDB connection string. The example uses a local database at `mongodb://127.0.0.1:27017/cybersec_summit`.
4. Start the server:

   ```powershell
   npm start
   ```

Open `http://localhost:3000/`. Do not open the HTML files with a `file://` URL or use a static-only server; the pages use the same-origin API. On first startup, Mongoose creates the collections and seeds the products and schedule from the bundled JSON files if those collections are empty.

## Pages

- **Home and storefront:** `index.html`
- **Attendee registration and session selection:** `signup.html` and `finalization.html`
- **Session proposal submission and moderator review:** `proposal.html` (React)
- **Billing and order summary:** `billing.html` (AngularJS)
- **Product returns:** `returns.html` (AngularJS and jQuery catalog search)
- **Conference product manager and cart:** `sessions.html` and `cart.html`

The attendee form, registration finalizer, product manager, storefront, cart, proposal page, billing page, and returns page use the Express API. Cart data is stored in MongoDB; browser storage is only a local display cache. Products, attendees, sessions, registrations, carts, proposals, and return requests have CRUD endpoints.

## MongoDB collections and REST API

- **`products`** — conference passes, workshops, merchandise, and other catalog items. The first run seeds these from `public/products.json`.
- **`attendees`** — attendee contact and registration-form details.
- **`sessions`** — conference schedule and session details. The first run seeds these from `public/sessions.json`.
- **`registrations`** — participation type and selected session snapshots from the finalization form.
- **`carts`** — browser-specific cart items, validated against the product catalog.
- **`proposals`** — speaker proposals with moderator status and decision timestamps.
- **`billings`** — demo billing records and order line snapshots; only payment method and last four digits are retained.
- **`shippings`** — shipping or event-pickup method, address, amount, and associated billing record.
- **`returns`** — conference catalog return requests and review status.

Products, attendees, and sessions each support:

- `GET /api/products`, `GET /api/attendees`, and `GET /api/sessions`
- `GET /api/products/:id`, `GET /api/attendees/:id`, and `GET /api/sessions/:id`
- `POST`, `PUT`, and `DELETE` on each corresponding resource path

Registration endpoints:

- `GET /api/registrations` and `GET /api/registrations/:id`
- `POST /api/registrations`
- `PUT /api/registrations/:id`
- `DELETE /api/registrations/:id`

Cart endpoints:

- `GET /api/carts/:id`
- `PUT /api/carts/:id` — create or replace a cart; product IDs and quantities are checked against MongoDB.
- `DELETE /api/carts/:id`

Proposal endpoints:

- `GET /api/proposals` — optional `?status=pending|approved|rejected`
- `GET /api/proposals/:id`
- `POST /api/proposals`
- `PUT /api/proposals/:id`
- `PATCH /api/proposals/:id` — set status to `approved` or `rejected`
- `DELETE /api/proposals/:id`

Checkout and return endpoints:

- `GET /api/billing`, `POST /api/billing` — checkout reads the persisted cart, verifies current product prices, writes billing and shipping records, and empties the cart.
- `GET /api/shipping` — list persisted shipping and pickup records.
- `GET /api/returns`, `POST /api/returns`, `GET /api/returns/:id`, `PATCH /api/returns/:id`, `DELETE /api/returns/:id`.

## Demo and payment safety

This is a course demonstration, not a production checkout or authenticated moderation system. Proposal approval is open to anyone who can access the demo server. Billing validates a card number, expiration, and security code in the browser, then discards those values before sending the request. The API only receives the payment method and last four digits; full card numbers and security codes are rejected if included. The server verifies product prices and order totals, records a demo order, and does not charge a payment method. Do not enter real payment or personal information.

Attendee records and finalized conference registrations are saved separately in MongoDB. The finalizer reads the schedule from `/api/sessions` and submits to `/api/registrations`.
