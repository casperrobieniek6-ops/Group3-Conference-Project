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

    const $productGrid = $("#storeProductGrid");
    const $searchField = $("#storeSearch");
    const $emptyMessage = $("#storeEmptyMessage");
    const $feedback = $("#storeFeedback");
    const $cartBadge = $("#cartBadge");

    function readStoredProducts() {
        try {
            const rawValue = localStorage.getItem(productStorageKey);
            if (!rawValue) {
                return defaultProducts;
            }

            const parsedValue = JSON.parse(rawValue);
            if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
                return defaultProducts;
            }

            return parsedValue.map(function (product) {
                return {
                    id: String(product.id || "").trim(),
                    name: String(product.name || product.description || "").trim(),
                    description: String(product.description || "").trim(),
                    category: String(product.category || "").trim(),
                    price: Number(product.price) || 0
                };
            }).filter(function (product) {
                return product.id && product.name && product.category && product.price > 0;
            });
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

        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
        updateCartBadge();
        showFeedback(product.name + " was added to the cart.", "success");
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
                '<div class="col-md-6 col-xl-4">' +
                '  <div class="card product-card h-100">' +
                '    <div class="card-body d-flex flex-column">' +
                '      <span class="product-category">' + product.category + '</span>' +
                '      <h3 class="h5 product-title">' + product.name + '</h3>' +
                '      <p class="product-description">' + product.description + '</p>' +
                '      <div class="mt-auto d-flex justify-content-between align-items-center">' +
                '        <span class="product-price">$' + Number(product.price).toFixed(2) + '</span>' +
                '        <button type="button" class="btn btn-primary add-to-cart-button" data-product-id="' + product.id + '">Add to Cart</button>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>'
            );

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

    updateCartBadge();
    renderProducts(readStoredProducts());

    $searchField.on("input", handleSearch);
});
