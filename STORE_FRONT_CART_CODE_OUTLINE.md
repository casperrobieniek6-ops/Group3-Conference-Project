# Storefront and Cart — Code Outline

> Read-only reference documenting the storefront, cart, and product-management code added for this project. This document does not change the application's behavior.

## Purpose

The storefront gives the conference site a product catalog for CyberSec Summit registrations and merchandise. Users can browse products, search the available catalog, add items to a cart, update quantities, remove items, and manage the product list from a dedicated manager page. The project uses Bootstrap, jQuery, and browser `localStorage` for persistence. There is no server-side database or live checkout flow.

## Files and code sections

### `index.html` — Storefront landing page

- **Navigation:** Adds a Storefront link and cart badge to the shared header so users can move between home, register, store manager, and cart pages.
- **Hero and conference content:** Keeps the existing event branding and homepage sections while introducing the conference shop.
- **Storefront section:** `#storefront` contains the search field, page heading, cart navigation button, feedback message, and product grid container `#storeProductGrid`.
- **Empty-state messaging:** `#storeEmptyMessage` displays a clear message if a search produces no products.
- **Dependencies:** Loads Bootstrap, shared site styles, local jQuery, and the storefront script `js/storefront.js`.

### `cart.html` — Cart page

- **Navigation:** Reuses the same top navigation as the rest of the site and includes a cart badge with the current item count.
- **Product search panel:** `#cartProductSearch` lets users search the product collection while staying on the cart page.
- **Search results area:** `#cartProductResults` renders matching products that can be added directly to the cart.
- **Cart table:** The main cart table contains product name, unit price, quantity, line subtotal, and remove-button controls.
- **Summary:** `#cartItemCount` and `#cartTotal` show the total quantity and overall cost.
- **Empty cart state:** `#cartEmptyMessage` explains that no items are currently in the cart.
- **Continue Shopping link:** Returns the user to the storefront section.
- **Dependencies:** Loads Bootstrap, shared styles, jQuery, and `js/cart.js`.

### `products.json` — Starter product collection

Contains the initial product catalog used for the storefront and cart. The file includes a top-level `products` array with properties:

- `id` — unique product identifier
- `name` — display name
- `description` — product summary
- `category` — item group such as Passes, Workshop, Merchandise, or Materials
- `price` — numeric product price

This file acts as the starting data source; browser storage is used after the page loads so changes persist locally in the browser.

### `js/storefront.js` — Storefront behavior

- **Initialization and selectors:** Runs after the document is ready and collects the storefront elements.
- **Default product data:** Provides six realistic conference-themed items if no saved collection exists.
- **Local storage access:** Reads and validates the product collection from `localStorage` before rendering the page.
- **Cart badge updates:** Calculates the number of items currently in the cart and updates the badge in the header.
- **Add-to-cart flow:** `addToCart()` verifies that the product exists, updates the cart object in `localStorage`, and shows a success message.
- **Search logic:** `handleSearch()` filters by name, description, category, or product ID with a case-insensitive match.
- **Render logic:** `renderProducts()` creates Bootstrap card layouts using jQuery and text-based DOM methods, then attaches events to each Add to Cart button.
- **Feedback messages:** Uses `showFeedback()` to display success, danger, or warning announcements when cart actions occur.

### `js/cart.js` — Cart logic and page updates

- **Initialization and selectors:** Runs after page load and captures the cart table, search field, result area, badge, and summary elements.
- **Storage helpers:** Reads the product list and cart object from browser `localStorage` and writes updates back using `JSON.stringify()` and `JSON.parse()`.
- **Add item helper:** `addProductToCart()` increases the quantity of a product if it is already in the cart; otherwise it adds a new row.
- **Remove and quantity updates:** `removeCartItem()` removes a single product, while `changeCartQuantity()` updates quantity values and prevents invalid or non-positive entries.
- **Cart table rendering:** `renderCart()` rebuilds the table each time and recalculates:
  - total item quantity
  - line subtotal for each item
  - overall cart total
  - empty-cart messaging
- **Search while in cart:** `renderMatchingProducts()` searches the product collection from the cart page and lets the user add items without returning to the storefront.
- **Badge synchronization:** Keeps the cart count consistent across the site after any update or refresh.

### `sessions.html` — Product manager page

- **Navigation:** Adds a Store Manager link to the shared top navigation.
- **Form controls:** Includes fields for product ID, product name, description, category, and price. Each field has a label and validation-message region.
- **Form actions:** Add Product, Update Product, Cancel Edit, Clear Form, Export JSON, and Send JSON to API buttons support the management workflow.
- **Search and list view:** Search filters the product collection in real time, and the table displays all current products.
- **JSON viewer:** Shows the active data in a readable JSON block.
- **Dependencies:** Loads Bootstrap, shared styles, jQuery, and `js/sessions.js`.

### `js/sessions.js` — Product manager logic

- **Initialization and selectors:** Declares the product storage key, API endpoint placeholder, form controls, search field, and table elements.
- **Default sample products:** Uses six sample conference products when no saved local data exists.
- **Validation:** `validateProductForm()` checks that required fields are filled, trimmed text is meaningful, price is a positive number, and IDs are unique during create and edit workflows.
- **Persistence:** Saves the collection to `localStorage` and refreshes the table and JSON viewer.
- **Table rendering and editing:** `renderProducts()` creates rows and `editProduct()` loads a record into the form for updates.
- **Search:** `handleSearch()` filters by ID, name, description, or category in a case-insensitive way.
- **Initial load:** Uses the browser-stored product list if available; otherwise it falls back to the default sample data.
- **Submit handler:** Adds or updates a product record while preventing duplicate IDs.
- **Download and AJAX:**
  - `downloadProducts()` exports the current collection as a JSON file.
  - `submitProductsToApi()` makes a jQuery `$.ajax()` POST request with `contentType: "application/json"` and `JSON.stringify({ products: products })`.
  - The endpoint is intentionally configurable and can be replaced with a future REST service.

### `css/styles.css` — Shared and storefront styling

The stylesheet includes shared site styling and storefront-specific rules for:

- navigation and header appearance
- hero area and conference callouts
- product cards and cart item cards
- buttons and badges
- cart summary blocks
- responsive layout adjustments for smaller screens

## Data flow

1. The page loads the default product list from `products.json` or browser storage.
2. The storefront renders the product grid and supports live search.
3. Clicking Add to Cart stores the selected product in the cart object in `localStorage`.
4. The cart page reads that stored cart, recalculates totals, and updates the badge.
5. The product manager page manages the same product collection used by the storefront and cart.
6. Export JSON downloads the current collection, and the AJAX function prepares the collection for a future REST API endpoint.

## Scope note

Browser `localStorage` is local to the user's browser and does not change the repository’s `products.json` file automatically. The app is intended to support future server-side storage; for now, the browser preserves the data locally until a backend is connected.
