# Storefront and Cart — Code Outline

The storefront in `public/index.html` and cart in `public/cart.html` display the conference catalog returned by `GET /api/products`. Their scripts fetch cart data through `public/js/api.js`; MongoDB is the source of truth, and `localStorage` is a display cache and stable anonymous-cart key.

The product manager at `public/sessions.html` is the catalog's CRUD interface. Catalog changes are persisted by the Express/Mongoose product endpoints, then appear on the storefront and cart when they reload. Product fields are inserted as text in the browser UI.

`public/products.json` and `public/sessions.json` seed the MongoDB catalog and conference schedule collections only when each collection is empty. Cart items are stored as product IDs and quantities in the `carts` collection, validated against `products`, and loaded by checkout.
