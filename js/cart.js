$(document).ready(function () {
    "use strict";
    const productsStorageKey = "cyberSecSummitSessions"; // same as sessions.js
    const cartStorageKey = "cyberSecSummitCart";
    let products = [];
    let cart = [];

    function loadProducts() {
        // TODO: Read saved sessions from localStorage when available.
        // TODO: Otherwise use $.getJSON("sessions.json") and access data.sessions.
        // TODO: Populate products, then call renderProducts().
    }
    function renderProducts() {
        // TODO: Build Bootstrap cards in #productList using jQuery.
        // TODO: Each card needs an Add to Cart button with a data-product-id.
    }
    function searchProducts(term) {
        // TODO: Filter products by productId, description, or category.
        // TODO: Re-render matching cards on #productSearch input.
    }
    function addToCart(productId) {
        // TODO: Find product, add or increment quantity, and persist cart.
    }
    function removeFromCart(productId) {
        // TODO: Remove or decrement quantity and persist cart.
    }
    function updateCartDisplay() {
        // TODO: Show cart rows, Remove buttons, quantity, and total price.
        // TODO: Put JSON.stringify(cart, null, 2) in #cartJsonPreview.
    }
    function validateProduct(product) {
        // TODO: Validate required fields and nonnegative numeric price.
        return Boolean(product && product.productId && product.description &&
            product.category && product.unitOfMeasure &&
            Number.isFinite(Number(product.price)) && Number(product.price) >= 0);
    }

    // TODO: Bind delegated jQuery click handlers to Add and Remove buttons.
    // TODO: Bind #productSearch input to searchProducts().
    // TODO: Bind #sendCartButton to JSON preview / AJAX demonstration.
    loadProducts();
});
