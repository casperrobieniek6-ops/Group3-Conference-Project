$(document).ready(function () {
    "use strict";

    const $cartTableBody = $("#cartTableBody");
    const $cartEmptyMessage = $("#cartEmptyMessage");
    const $itemCount = $("#cartItemCount");
    const $cartTotal = $("#cartTotal");
    const $cartProductSearch = $("#cartProductSearch");
    const $cartProductResults = $("#cartProductResults");
    const $cartProductEmpty = $("#cartProductEmpty");
    const $cartBadge = $("#cartBadge");
    const $cartStatus = $("#cartStatusMessage");
    let products = [];

    function readProducts() {
        return products;
    }

    function readCart() {
        return ConferenceCartApi.readLocal();
    }

    function saveCart(cart) {
        updateCartBadge();
        ConferenceCartApi.save(cart).done(function () {
            $cartStatus.removeClass("alert-danger").addClass("alert-success")
                .text("Cart saved to the database.");
        }).fail(function () {
            $cartStatus.removeClass("alert-success").addClass("alert-danger")
                .text("The cart could not be saved to the database. Please try again.");
        });
    }

    function updateCartBadge() {
        const cart = readCart();
        const totalItems = Object.keys(cart).reduce(function (total, key) {
            return total + (Number(cart[key].quantity) || 0);
        }, 0);

        if ($cartBadge.length) {
            $cartBadge.text(totalItems);
        }
    }

    function productMap() {
        return readProducts().reduce(function (map, product) {
            map[product.id] = product;
            return map;
        }, {});
    }

    function addProductToCart(productId) {
        const cart = readCart();
        const products = readProducts();
        const matchingProduct = products.find(function (product) {
            return product.id === productId;
        });

        if (!matchingProduct) {
            return;
        }

        const existingEntry = cart[productId] || { quantity: 0 };
        cart[productId] = {
            id: matchingProduct.id,
            name: matchingProduct.name,
            price: Number(matchingProduct.price),
            quantity: Number(existingEntry.quantity) + 1
        };

        saveCart(cart);
        renderCart();
        renderMatchingProducts();
    }

    function removeCartItem(productId) {
        const cart = readCart();
        delete cart[productId];
        saveCart(cart);
        renderCart();
        renderMatchingProducts();
    }

    function changeCartQuantity(productId, newQuantity) {
        const cart = readCart();
        const numericQuantity = Number(newQuantity);

        if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
            delete cart[productId];
            saveCart(cart);
            renderCart();
            renderMatchingProducts();
            return;
        }

        if (cart[productId]) {
            cart[productId].quantity = numericQuantity;
            saveCart(cart);
            renderCart();
        }
    }

    function renderMatchingProducts() {
        const products = readProducts();
        const searchTerm = $.trim($cartProductSearch.val()).toLowerCase();
        const cart = readCart();

        let filteredProducts = products;

        if (searchTerm !== "") {
            filteredProducts = products.filter(function (product) {
                const fullText = [product.id, product.name, product.description, product.category].join(" ").toLowerCase();
                return fullText.includes(searchTerm);
            });
        }

        $cartProductResults.empty();

        if (filteredProducts.length === 0) {
            $cartProductEmpty.removeClass("d-none").text("No products match the current search.");
            return;
        }

        $cartProductEmpty.addClass("d-none");

        filteredProducts.forEach(function (product) {
            const isAlreadyInCart = Boolean(cart[product.id]);
            const productCard = $('<div class="col-md-6 col-xl-4"><div class="card cart-product-card h-100"><div class="card-body d-flex flex-column"></div></div></div>');
            const body = productCard.find(".card-body");
            body.append($("<span>").addClass("product-category").text(product.category));
            body.append($("<h3>").addClass("h5 product-title").text(product.name));
            body.append($("<p>").addClass("product-description").text(product.description));
            const footer = $("<div>").addClass("mt-auto d-flex justify-content-between align-items-center");
            footer.append($("<span>").addClass("product-price").text("$" + Number(product.price).toFixed(2)));
            footer.append($("<button type='button'>").addClass("btn btn-primary btn-sm add-product-button")
                .prop("disabled", isAlreadyInCart).text(isAlreadyInCart ? "Added" : "Add"));
            body.append(footer);
            productCard.find(".add-product-button").on("click", function () {
                addProductToCart(product.id);
            });

            $cartProductResults.append(productCard);
        });
    }

    function renderCart() {
        const cart = readCart();
        const productsById = productMap();
        const cartItems = Object.keys(cart).map(function (productId) {
            const product = productsById[productId];
            if (!product) {
                return null;
            }

            const quantity = Number(cart[productId].quantity) || 0;
            if (quantity <= 0) {
                return null;
            }

            return {
                product: product,
                quantity: quantity,
                subtotal: quantity * Number(product.price)
            };
        }).filter(Boolean);

        $cartTableBody.empty();

        if (cartItems.length === 0) {
            $cartEmptyMessage.removeClass("d-none");
            $itemCount.text("0");
            $cartTotal.text("$0.00");
            return;
        }

        $cartEmptyMessage.addClass("d-none");

        let totalQuantity = 0;
        let grandTotal = 0;

        cartItems.forEach(function (entry) {
            totalQuantity += entry.quantity;
            grandTotal += entry.subtotal;

            const row = $("<tr>");
            row.append($("<td>").text(entry.product.name));
            row.append($("<td>").text("$" + Number(entry.product.price).toFixed(2)));
            row.append($("<td>").append($("<input type='number' min='1' step='1'>").addClass("form-control cart-quantity-input")
                .val(entry.quantity).attr("aria-label", "Quantity for " + entry.product.name)));
            row.append($("<td>").text("$" + entry.subtotal.toFixed(2)));
            row.append($("<td>").append($("<button type='button'>").addClass("btn btn-outline-danger btn-sm remove-cart-item").text("Remove")));

            row.find(".remove-cart-item").on("click", function () {
                removeCartItem(entry.product.id);
            });

            row.find(".cart-quantity-input").on("change", function () {
                changeCartQuantity(entry.product.id, $(this).val());
            });

            $cartTableBody.append(row);
        });

        $itemCount.text(totalQuantity);
        $cartTotal.text("$" + grandTotal.toFixed(2));
    }

    $cartProductSearch.on("input", renderMatchingProducts);
    updateCartBadge();
    $.getJSON("/api/products").done(function (result) {
        if (!result || !Array.isArray(result.products)) {
            $cartProductEmpty.removeClass("d-none").text("The product catalog response is invalid.");
            return;
        }
        products = result.products;
        const localCart = readCart();
        ConferenceCartApi.load().done(function (cartResult) {
            ConferenceCartApi.cache(cartResult.cart.items);
            updateCartBadge();
            $cartStatus.removeClass("alert-danger").removeClass("alert-success")
                .addClass("alert-info").text("Cart loaded from the database.");
            renderMatchingProducts();
            renderCart();
        }).fail(function (response) {
            if (response.status === 404 && Object.keys(localCart).length > 0) {
                ConferenceCartApi.save(localCart).done(function () {
                    $cartStatus.removeClass("alert-danger").addClass("alert-success")
                        .text("Existing cart items were saved to the database.");
                }).fail(function () {
                    $cartStatus.removeClass("alert-success").addClass("alert-danger")
                        .text("Existing cart items could not be migrated to the database.");
                }).always(function () {
                    updateCartBadge();
                    renderMatchingProducts();
                    renderCart();
                });
                return;
            }
            if (response.status !== 404) {
                $cartStatus.removeClass("alert-success").addClass("alert-danger")
                    .text("The saved cart could not be loaded from the database.");
            }
            renderMatchingProducts();
            renderCart();
        });
    }).fail(function () {
        $cartProductEmpty.removeClass("d-none").text("The product catalog could not be loaded. Check the server and database.");
        renderCart();
    });
});
