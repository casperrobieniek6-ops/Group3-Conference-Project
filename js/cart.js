$(document).ready(function () {
    "use strict";

    const productStorageKey = "cyberSecSummitProducts";
    const cartStorageKey = "cyberSecSummitCart";

    const defaultProducts = [
        {
            id: "GEN-101",
            name: "General Admission Pass",
            description: "Full conference access for all keynotes, exhibits, and networking sessions.",
            category: "Passes",
            price: 149.00
        },
        {
            id: "STU-201",
            name: "Student Admission Pass",
            description: "Reduced-rate access for enrolled students with full event participation.",
            category: "Passes",
            price: 89.00
        },
        {
            id: "WRK-301",
            name: "Cloud Security Workshop",
            description: "A hands-on workshop covering secure cloud design and practical guardrails.",
            category: "Workshop",
            price: 79.00
        },
        {
            id: "NET-401",
            name: "Networking Event Ticket",
            description: "Join the evening networking event with speakers, sponsors, and peers.",
            category: "Events",
            price: 49.00
        },
        {
            id: "MER-501",
            name: "Summit Swag Kit",
            description: "A branded bundle featuring a conference notebook, lanyard, and stickers.",
            category: "Merchandise",
            price: 34.00
        },
        {
            id: "MAT-601",
            name: "Speaker Briefing Packet",
            description: "A detailed digital packet with the conference schedule and speaker notes.",
            category: "Materials",
            price: 19.00
        }
    ];

    const $cartTableBody = $("#cartTableBody");
    const $cartEmptyMessage = $("#cartEmptyMessage");
    const $itemCount = $("#cartItemCount");
    const $cartTotal = $("#cartTotal");
    const $cartProductSearch = $("#cartProductSearch");
    const $cartProductResults = $("#cartProductResults");
    const $cartProductEmpty = $("#cartProductEmpty");
    const $cartBadge = $("#cartBadge");

    function readProducts() {
        try {
            const rawValue = localStorage.getItem(productStorageKey);
            if (!rawValue) {
                return defaultProducts;
            }

            const parsedValue = JSON.parse(rawValue);
            if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
                return defaultProducts;
            }

            return parsedValue;
        } catch (error) {
            return defaultProducts;
        }
    }

    function readCart() {
        try {
            const rawValue = localStorage.getItem(cartStorageKey);
            if (!rawValue) {
                return {};
            }

            const parsedValue = JSON.parse(rawValue);
            return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
        } catch (error) {
            return {};
        }
    }

    function saveCart(cart) {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
        updateCartBadge();
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
            const productCard = $(
                '<div class="col-md-6 col-xl-4">' +
                '  <div class="card cart-product-card h-100">' +
                '    <div class="card-body d-flex flex-column">' +
                '      <span class="product-category">' + product.category + '</span>' +
                '      <h3 class="h5 product-title">' + product.name + '</h3>' +
                '      <p class="product-description">' + product.description + '</p>' +
                '      <div class="mt-auto d-flex justify-content-between align-items-center">' +
                '        <span class="product-price">$' + Number(product.price).toFixed(2) + '</span>' +
                '        <button type="button" class="btn btn-primary btn-sm add-product-button" data-product-id="' + product.id + '" ' + (isAlreadyInCart ? "disabled" : "") + '>' + (isAlreadyInCart ? "Added" : "Add") + '</button>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>'
            );

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

            const row = $(
                '<tr>' +
                '  <td>' + entry.product.name + '</td>' +
                '  <td>$' + Number(entry.product.price).toFixed(2) + '</td>' +
                '  <td><input type="number" min="1" step="1" value="' + entry.quantity + '" class="form-control cart-quantity-input" data-product-id="' + entry.product.id + '" aria-label="Quantity for ' + entry.product.name + '"></td>' +
                '  <td>$' + entry.subtotal.toFixed(2) + '</td>' +
                '  <td><button type="button" class="btn btn-outline-danger btn-sm remove-cart-item" data-product-id="' + entry.product.id + '">Remove</button></td>' +
                '</tr>'
            );

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

    updateCartBadge();
    renderMatchingProducts();
    renderCart();

    $cartProductSearch.on("input", renderMatchingProducts);
});
