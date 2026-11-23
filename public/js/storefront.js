$(document).ready(function () {
    "use strict";

    const $productGrid = $("#storeProductGrid");
    const $searchField = $("#storeSearch");
    const $emptyMessage = $("#storeEmptyMessage");
    const $feedback = $("#storeFeedback");
    const $cartBadge = $("#cartBadge");
    let products = [];

    function readStoredProducts() {
        return products;
    }

    function readCart() {
        return ConferenceCartApi.readLocal();
    }

    function updateCartBadge() {
        const cart = readCart();
        const totalItems = Object.keys(cart).reduce(function (sum, key) {
            const quantity = Number(cart[key].quantity) || 0;
            return sum + quantity;
        }, 0);

        if ($cartBadge.length) {
            $cartBadge.text(totalItems);
        }
    }

    function showFeedback(message, type) {
        if (!$feedback.length) {
            return;
        }

        $feedback
            .removeClass("alert-success alert-danger alert-warning alert-info")
            .addClass("alert alert-" + type)
            .text(message)
            .removeClass("d-none");
    }

    function addToCart(productId) {
        const products = readStoredProducts();
        const product = products.find(function (item) {
            return item.id === productId;
        });

        if (!product) {
            showFeedback("The selected product could not be found in the current collection.", "danger");
            return;
        }

        const cart = readCart();
        const existingItem = cart[product.id] || { quantity: 0 };
        const nextQuantity = Number(existingItem.quantity) + 1;

        cart[product.id] = {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: nextQuantity
        };

        ConferenceCartApi.save(cart).done(function () {
            updateCartBadge();
            showFeedback(product.name + " was added to the database-backed cart.", "success");
        }).fail(function () {
            showFeedback("The cart could not be saved to the database. Please try again.", "danger");
        });
    }

    function renderProducts(productList) {
        const filteredProducts = Array.isArray(productList) ? productList : [];
        $productGrid.empty();

        if (filteredProducts.length === 0) {
            $emptyMessage.removeClass("d-none").text("No products match your search. Try a different keyword.");
            return;
        }

        $emptyMessage.addClass("d-none");

        filteredProducts.forEach(function (product) {
            const card = $(
                '<div class="col-md-6 col-xl-4"><div class="card product-card h-100"><div class="card-body d-flex flex-column"></div></div></div>'
            );
            const body = card.find(".card-body");
            body.append($("<span>").addClass("product-category").text(product.category));
            body.append($("<h3>").addClass("h5 product-title").text(product.name));
            body.append($("<p>").addClass("product-description").text(product.description));
            const footer = $("<div>").addClass("mt-auto d-flex justify-content-between align-items-center");
            footer.append($("<span>").addClass("product-price").text("$" + Number(product.price).toFixed(2)));
            footer.append($("<button type='button'>").addClass("btn btn-primary add-to-cart-button").text("Add to Cart"));
            body.append(footer);
            card.find(".add-to-cart-button").on("click", function () {
                addToCart(product.id);
            });

            $productGrid.append(card);
        });
    }

    function handleSearch() {
        const searchTerm = $.trim($searchField.val()).toLowerCase();
        const products = readStoredProducts();

        if (searchTerm === "") {
            renderProducts(products);
            return;
        }

        const filteredProducts = products.filter(function (product) {
            const searchableText = [
                product.name,
                product.description,
                product.category,
                product.id
            ].join(" ").toLowerCase();

            return searchableText.includes(searchTerm);
        });

        renderProducts(filteredProducts);
    }

    $searchField.on("input", handleSearch);
    updateCartBadge();
    $.getJSON("/api/products").done(function (result) {
        if (!result || !Array.isArray(result.products)) {
            showFeedback("The product catalog response is invalid.", "danger");
            return;
        }
        products = result.products;
        const localCart = readCart();
        ConferenceCartApi.load().done(function (cartResult) {
            ConferenceCartApi.cache(cartResult.cart.items);
            updateCartBadge();
            handleSearch();
        }).fail(function (response) {
            if (response.status === 404 && Object.keys(localCart).length > 0) {
                ConferenceCartApi.save(localCart).always(function () {
                    updateCartBadge();
                    handleSearch();
                }).fail(function () {
                    showFeedback("Your existing cart could not be migrated to the database.", "danger");
                });
                return;
            }
            if (response.status !== 404) {
                showFeedback("The saved cart could not be loaded from the database.", "danger");
            }
            handleSearch();
        });
    }).fail(function () {
        $emptyMessage.removeClass("d-none").text("The product catalog could not be loaded. Check the server and database.");
        showFeedback("The product catalog could not be loaded.", "danger");
    });
});
