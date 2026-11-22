# Billing Details Page — Code Outline

The AngularJS billing page in `public/billing.html` loads its cart from MongoDB, calculates the demo order, and submits it to `POST /api/billing`. The Express route in `server.js` rechecks the persisted cart and current product prices, then stores billing and shipping documents in the `billings` and `shippings` collections.

The browser validates card number, expiration, and security code locally, then clears those fields before submission. The API rejects full card number and security-code fields and stores only the payment method and last four digits. On successful checkout, the persisted cart is emptied. Orders are demonstrations only; no payment is charged.

Start the application with `npm install`, set `MONGODB_URI` in `.env`, and run `npm start`. Do not use real payment or personal information.
