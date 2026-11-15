# Billing Details Page — Code Outline

> Read-only reference documenting the Billing Details page. This document does not change the application's behavior.

## Purpose

The Billing Details page provides a responsive conference-store checkout interface. It displays the shopper's cart, collects billing and demo payment fields, validates input in the browser, and sends a JSON order to the Node.js REST API. AngularJS manages form state and order totals; Bootstrap and shared site styles provide the layout. This is a demonstration checkout only: no payment is charged, and the full card number, expiration, and security code are not sent to or stored by the server.

## Files and code sections

### `billing.html` — Page structure and form

- **AngularJS app and controller:** `ng-app="conferenceBilling"` initializes the billing application, and `ng-controller="BillingController"` manages the page.
- **Navigation and page introduction:** Links to the main site pages and labels the checkout as a demo.
- **Payment safety notice:** Warns users not to enter real payment details and explains which card fields are not sent to the server.
- **Billing form:** Collects name, email, street address, city, region, postal code, and country. The second address line is optional. AngularJS models bind values to the controller.
- **Payment fields:** Collects card number, expiration month, and security code for local validation only.
- **Order summary:** Dynamically lists cart products and quantities, provides standard-delivery or event-pickup options, and calculates subtotal, shipping, and total.
- **Feedback and submit control:** Displays validation or API errors and success confirmation. The submit button is disabled when the cart is empty or a request is in progress.
- **Dependencies:** Loads Bootstrap, `css/styles.css`, local jQuery, AngularJS 1.8.3, and `js/billing.js`.

### `js/billing.js` — State, validation, and checkout request

- **AngularJS setup:** Defines the `conferenceBilling` module and `BillingController`.
- **Cart loading:** Reads `cyberSecSummitCart` from browser `localStorage`, normalizes entries, and excludes entries with invalid names, prices, or quantities. Invalid JSON produces a visible error.
- **Order calculations:** `subtotal()`, `shippingAmount()`, and `total()` calculate the displayed amounts. Standard delivery costs $8; event pickup is free, and an empty cart has no shipping charge.
- **Card validation:** `validCardNumber()` applies a length check and the Luhn checksum. `validExpiry()` rejects malformed or expired months, including AngularJS's `Date` model for the HTML month input. The security code must contain three or four digits.
- **Form validation:** `submit()` checks AngularJS form validity, nonempty cart, card number, expiration, and security code before sending anything.
- **JSON payload:** Sends the shopper's name, email, address, payment method and last four digits, product IDs and quantities, shipping choice, and calculated totals. Card number, expiration, and security code are cleared before the AJAX request.
- **AJAX and feedback:** AngularJS `$http.post()` sends JSON to `/api/billing`. On success, the page displays the demo order ID and total and clears the cart. On failure, it displays the server error or a retry message.

### `server.js` — Billing REST endpoint

- **Route:** `POST /api/billing` receives billing and order JSON.
- **Validation:** Rejects requests containing full card number or security-code fields; validates contact and address fields, masked payment details, product IDs, quantities, shipping selection, and totals.
- **Price verification:** Recalculates item prices and totals from `products.json` rather than trusting client-provided prices.
- **Persistence:** Appends the accepted demo order to `.data/orders.json`, creating the ignored `.data/` directory as needed. Stored payment data contains only the method and last four digits.
- **Response:** Returns the new order ID, total, masked payment information, and a message that no payment was charged.

### `products.json` and `cart.html` — Order items

- `products.json` supplies the product IDs and server-side prices used to verify an order.
- `cart.html` and the existing cart code maintain `cyberSecSummitCart` in browser storage, which the billing controller reads to build the order summary and JSON request.

### `css/styles.css` — Billing presentation

The page reuses the site's responsive Bootstrap grid, shared navigation, hero, button, and typography styles. The `.billing-card` rule adds the billing and order-summary card treatment.

## Data flow

1. The billing controller reads cart items from browser `localStorage` and renders the order summary.
2. The shopper enters billing and demo payment fields and chooses a shipping option.
3. AngularJS validates required fields, email, card number, expiration, and security code. Invalid submissions do not make an API request.
4. On valid input, the controller constructs a JSON payload containing billing details, product IDs, quantities, shipping choice, and calculated totals. It includes only the card method and last four digits; the full card number, expiration, and security code are cleared before submission.
5. The Node.js server verifies the order against `products.json` and appends the masked order to `.data/orders.json`.
6. On success, the page displays the demo order confirmation and clears the cart. On failure, it displays an error and keeps the cart available for retry.

## Scope note

This page is not a production payment flow. It does not charge a payment method, and the demo server stores billing contact and address information alongside order details. Do not use real card, security-code, or personal information. Start the Node.js server with `node server.js` and open `http://localhost:3000/billing.html`; the REST API requires the same-origin server rather than a static file server.
