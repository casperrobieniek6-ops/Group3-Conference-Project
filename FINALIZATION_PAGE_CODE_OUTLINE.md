# Conference Registration Finalization

The React page in `public/finalization.html` loads its schedule from `GET /api/sessions`, validates attendee details and session selections, and saves successful submissions with `POST /api/registrations`. Registration records include the attendee name and email, participation type, and database-verified snapshots of selected sessions.

The `ConferenceSession` and `Registration` Mongoose schemas are defined in `models.js`; the Express API and schedule seed are in `server.js`. The schedule is initially loaded from `public/sessions.json` only if MongoDB's `sessions` collection is empty. The page no longer has a demo-only success path: an API or database error is shown instead of a false confirmation.

Run the app with `npm install`, configure `MONGODB_URI` in `.env`, and start it with `npm start`. The page relies on the same-origin API and must be opened through Express.
