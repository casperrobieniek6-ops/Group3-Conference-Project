# Database Integration — Code Outline

> Reference for the Express, Mongoose, and MongoDB persistence added to the CyberSec Summit project.

## Purpose

The Node.js application serves the static frontend from `public/` and exposes same-origin REST endpoints backed by MongoDB. Conference attendees, sessions, registrations, products, proposals, carts, billing records, shipping records, and return requests are modeled with Mongoose. Frontend pages submit and retrieve their data through the API; browser storage is retained only as a cart display cache and anonymous cart key.

## Files and code sections

### `models.js` — Mongoose collections

Defines the schemas and model-to-collection mappings:

- **`Product` → `products`:** Conference catalog items, keyed by product ID.
- **`Attendee` → `attendees`:** Contact and attendee-form data; email addresses are unique.
- **`ConferenceSession` → `sessions`:** Schedule items with track, format, price, and details.
- **`Registration` → `registrations`:** Attendee name and email, participation type, and selected-session snapshots.
- **`Cart` → `carts`:** Anonymous browser cart ID with product IDs and quantities.
- **`Proposal` → `proposals`:** Speaker submissions and moderator decisions.
- **`Billing` → `billings`:** Order details and masked payment data.
- **`Shipping` → `shippings`:** Shipping or event-pickup details associated with a billing record.
- **`ReturnRequest` → `returns`:** Product return details and review status.

Schemas use required fields, length and range checks, enums, timestamps, and indexes where appropriate.

### `server.js` — Express API and database startup

- Loads `MONGODB_URI` and `PORT` from the environment, with a local MongoDB URI as the default.
- Connects to MongoDB, initializes model indexes and collections, then starts Express.
- Seeds `products` from `public/products.json` and `sessions` from `public/sessions.json` only if the corresponding collection is empty.
- Serves the frontend with `express.static(publicDirectory)`.
- Validates request bodies and reports validation, duplicate-record, not-found, and server errors through JSON responses.

### Frontend pages and scripts

- **Attendee CRUD:** `public/signup.html` and `public/js/script.js` load, create, update, and delete records through `/api/attendees`.
- **Session selection and registration:** `public/js/finalization.js` loads `/api/sessions` and submits database-verified selections to `/api/registrations`. The former demo-only submission path is disabled.
- **Products:** `public/js/sessions.js` manages products through `/api/products`; the storefront and cart load the same catalog.
- **Cart:** `public/js/api.js` provides the cart API helper. The storefront and cart save and load carts through `/api/carts/:id`; checkout uses the persisted cart rather than trusting client-supplied prices.
- **Proposals:** `public/js/proposals.js` uses the proposal API to submit, review, change status, and delete proposals.
- **Billing and shipping:** `public/js/billing.js` submits checkout to `/api/billing`. The server validates current product prices, saves a billing record and associated shipping record, then empties the saved cart.
- **Returns:** `public/js/returns.js` loads the product catalog and saved return history and submits return requests through the API.

### `package.json`, `.env.example`, and `.gitignore`

`package.json` declares Express, Mongoose, and dotenv. Copy `.env.example` to `.env` and set `MONGODB_URI` for a local MongoDB instance or an approved hosted database. `.env` and `node_modules/` are excluded from Git.

## Data flow

1. Start MongoDB, install dependencies with `npm install`, configure `.env`, and run `npm start`.
2. Express connects to MongoDB and seeds the initial catalog and schedule only when their collections are empty.
3. Frontend pages retrieve and change attendee, session, product, proposal, registration, and cart data through REST endpoints.
4. Checkout reads the cart from MongoDB, recomputes item prices and totals from the product collection, and saves billing and shipping records.
5. Return requests are checked against the product collection and saved in `returns`.

## Payment and scope note

This is a course demonstration, not an authenticated or production checkout. Full card numbers, expiration dates, and security codes are validated in the browser and are not sent to or stored by the server; only payment method and last four digits are retained. The API does not charge a payment method.

Run the app with a reachable MongoDB instance configured through `MONGODB_URI` to exercise the live database-backed flows. The local MongoDB setup and browser/API checks used for this project are described in the project README.
