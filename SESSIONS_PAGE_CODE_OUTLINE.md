# Conference Product Manager — Code Outline

The Store Manager in `public/sessions.html` uses `public/js/sessions.js` to manage the MongoDB-backed conference product catalog. It loads the catalog from `GET /api/products`, validates entries in the browser, and uses `POST`, `PUT`, and `DELETE` requests to create, edit, and remove products. Search, JSON preview, export, and cart badge remain in the page.

The Express routes and Mongoose `Product` and `ConferenceSession` schemas are in `models.js`. Product documents use their conference product ID as MongoDB `_id`; the catalog and session schedule are seeded from `public/products.json` and `public/sessions.json` only when their respective collections are empty. The schedule is served from `/api/sessions` and supports CRUD endpoints.

Run the app with `npm install`, configure `MONGODB_URI` in `.env`, and start the site with `npm start`. The product manager and catalog API require a running MongoDB instance.
