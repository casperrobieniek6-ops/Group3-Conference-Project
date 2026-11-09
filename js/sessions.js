$(document).ready(function () {
    "use strict";

    const storageKey = "cyberSecSummitProducts";
    const legacyStorageKey = "cyberSecSummitSessions";
    const apiEndpoint = "https://example.com/api/products";
    const $statusMessage = $("#sessionStatus");
    const $form = $("#sessionForm");
    const $saveButton = $("#saveSessionButton");
    const $cancelButton = $("#cancelSessionEditButton");
    const $resetButton = $("#resetSessionFormButton");
    const $searchField = $("#sessionSearch");
    const $tableBody = $("#sessionTableBody");
    const $count = $("#sessionCount");
    const $emptyMessage = $("#sessionEmptyMessage");
    const $jsonView = $("#sessionJsonView");
    const $exportButton = $("#exportSessionsButton");
    const $apiButton = $("#submitProductsToApiButton");
    const $cartBadge = $("#cartBadge");

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

    const fields = {
        id: $("#sessionId"),
        name: $("#sessionName"),
        description: $("#sessionDescription"),
        category: $("#sessionCategory"),
        price: $("#sessionPrice")
    };

    let products = [];
    let editingProductId = null;

    function normalizeProduct(product) {
        if (!product || typeof product !== "object") {
            return null;
        }

        const id = String(product.id || product.productId || "").trim();
        const name = String(product.name || product.productName || product.description || "").trim();
        const description = String(product.description || product.additionalInfo || product.summary || "").trim();
        const category = String(product.category || product.track || "").trim();
        const price = Number(product.price);

        if (!id || !name || !category || !Number.isFinite(price) || price <= 0) {
            return null;
        }

        return {
            id: id,
            name: name,
            description: description || name,
            category: category,
            price: Number(price)
        };
    }

    function readProductCollection() {
        try {
            const rawValue = localStorage.getItem(storageKey);
            if (rawValue) {
                const parsedValue = JSON.parse(rawValue);
                const list = Array.isArray(parsedValue) ? parsedValue : (Array.isArray(parsedValue.products) ? parsedValue.products : []);
                const normalized = list.map(normalizeProduct).filter(Boolean);
                return normalized.length > 0 ? normalized : defaultProducts;
            }

            const legacyValue = localStorage.getItem(legacyStorageKey);
            if (legacyValue) {
                const parsedLegacy = JSON.parse(legacyValue);
                const legacyList = Array.isArray(parsedLegacy) ? parsedLegacy : (Array.isArray(parsedLegacy.sessions) ? parsedLegacy.sessions : []);
                const normalizedLegacy = legacyList.map(normalizeProduct).filter(Boolean);
                if (normalizedLegacy.length > 0) {
                    localStorage.setItem(storageKey, JSON.stringify(normalizedLegacy));
                    return normalizedLegacy;
                }
            }
        } catch (error) {
            // Fall back to the bundled sample data when browser storage is invalid.
        }

        return defaultProducts;
    }

    function saveProducts(list) {
        try {
            products = list;
            localStorage.setItem(storageKey, JSON.stringify(list));
            renderProducts(products);
            return true;
        } catch (error) {
            showStatus("Browser storage is unavailable, but the current product list is still visible in this session.", "warning");
            return false;
        }
    }

    function renderJsonViewer(list) {
        $jsonView.text(JSON.stringify({ products: list }, null, 2));
    }

    function showStatus(message, type) {
        $statusMessage
            .removeClass("alert-info alert-success alert-warning alert-danger")
            .addClass("alert alert-" + type)
            .text(message);
    }

    function setFieldState(fieldName, isValid, message) {
        const field = fields[fieldName];
        const errorId = fieldName + "Error";
        const errorElement = $("#" + errorId);

        field.toggleClass("is-invalid", !isValid);
        field.attr("aria-invalid", String(!isValid));
        errorElement.text(message);
    }

    function clearValidation() {
        Object.keys(fields).forEach(function (fieldName) {
            setFieldState(fieldName, true, "");
        });
    }

    function resetForm() {
        $form.trigger("reset");
        editingProductId = null;
        $saveButton.text("Add Product");
        $cancelButton.prop("hidden", true);
        $("#sessionFormHeading").text("Add a conference product");
        fields.id.removeProp("readonly");

        Object.keys(fields).forEach(function (fieldName) {
            const field = fields[fieldName];
            field.removeClass("is-invalid");
            field.removeAttr("aria-invalid");
        });
    }

    function validateProductForm() {
        clearValidation();

        const productId = $.trim(fields.id.val());
        const productName = $.trim(fields.name.val());
        const description = $.trim(fields.description.val());
        const category = $.trim(fields.category.val());
        const priceText = $.trim(fields.price.val());
        const priceValue = Number(priceText);

        const duplicateId = productId !== "" && products.some(function (product) {
            const isSameId = product.id && product.id.toLowerCase() === productId.toLowerCase();
            if (!editingProductId) {
                return isSameId;
            }

            return isSameId && product.id.toLowerCase() !== editingProductId.toLowerCase();
        });

        const validationResults = {
            id: productId !== "" && !duplicateId,
            name: productName.length >= 2,
            description: description.length >= 5,
            category: category.length >= 2,
            price: priceText !== "" && Number.isFinite(priceValue) && priceValue > 0
        };

        if (!validationResults.id) {
            setFieldState("id", false, duplicateId ? "A product with this ID already exists. Choose a unique value." : "Enter a product ID.");
        }

        if (!validationResults.name) {
            setFieldState("name", false, "Enter a product name with useful wording.");
        }

        if (!validationResults.description) {
            setFieldState("description", false, "Add a detailed description for the product.");
        }

        if (!validationResults.category) {
            setFieldState("category", false, "Enter a category such as Passes, Workshop, or Merchandise.");
        }

        if (!validationResults.price) {
            setFieldState("price", false, "Enter a valid price greater than zero.");
        }

        const firstInvalidKey = Object.keys(validationResults).find(function (key) {
            return validationResults[key] === false;
        });

        if (firstInvalidKey) {
            const invalidField = fields[firstInvalidKey];
            invalidField.addClass("is-invalid");
            invalidField.attr("aria-invalid", "true");
            invalidField.focus();
            showStatus("Please correct the highlighted fields before saving.", "danger");
            return false;
        }

        return true;
    }

    function renderProducts(list) {
        const productList = Array.isArray(list) ? list : [];
        $tableBody.empty();

        if (productList.length === 0) {
            $count.text("0");
            $emptyMessage.removeClass("d-none").text(
                $.trim($searchField.val()) !== "" ? "No matching products found." : "No products available yet. Add the first conference product."
            );
            renderJsonViewer([]);
            return;
        }

        $emptyMessage.addClass("d-none");
        $count.text(productList.length);

        productList.forEach(function (product) {
            const row = $("<tr>");

            row.append($("<td>").text(product.id || ""));
            row.append($("<td>").text(product.name || ""));
            row.append($("<td>").text(product.description || ""));
            row.append($("<td>").text(product.category || ""));
            row.append($("<td>").text("$" + Number(product.price || 0).toFixed(2)));

            const actionsCell = $("<td>");
            const editButton = $("<button type='button' class='btn btn-sm btn-outline-primary me-2'>Edit</button>");

            editButton.on("click", function () {
                editProduct(product.id);
            });

            actionsCell.append(editButton);
            row.append(actionsCell);
            $tableBody.append(row);
        });

        renderJsonViewer(productList);
    }

    function editProduct(productId) {
        const selectedProduct = products.find(function (product) {
            return product.id === productId;
        });

        if (!selectedProduct) {
            return;
        }

        resetForm();
        editingProductId = selectedProduct.id;
        $saveButton.text("Update Product");
        $cancelButton.prop("hidden", false);
        $("#sessionFormHeading").text("Edit product");

        fields.id.val(selectedProduct.id).prop("readonly", true);
        fields.name.val(selectedProduct.name);
        fields.description.val(selectedProduct.description || "");
        fields.category.val(selectedProduct.category);
        fields.price.val(Number(selectedProduct.price).toFixed(2));

        showStatus("Edit the selected product and save your changes.", "info");
        fields.name.focus();
    }

    function handleSearch() {
        const searchTerm = $.trim($searchField.val()).toLowerCase();

        if (searchTerm === "") {
            renderProducts(products);
            return;
        }

        const filteredProducts = products.filter(function (product) {
            const searchableText = [product.id, product.name, product.description, product.category].join(" ").toLowerCase();
            return searchableText.includes(searchTerm);
        });

        renderProducts(filteredProducts);
    }

    function updateCartBadge() {
        const rawCart = localStorage.getItem("cyberSecSummitCart");
        let total = 0;

        if (rawCart) {
            try {
                const cart = JSON.parse(rawCart);
                if (cart && typeof cart === "object") {
                    total = Object.keys(cart).reduce(function (sum, key) {
                        return sum + (Number(cart[key].quantity) || 0);
                    }, 0);
                }
            } catch (error) {
                total = 0;
            }
        }

        if ($cartBadge.length) {
            $cartBadge.text(total);
        }
    }

    function loadInitialData() {
        const savedProducts = readProductCollection();
        products = savedProducts;
        renderProducts(products);
        updateCartBadge();
        showStatus("Conference product data loaded successfully.", "success");
    }

    function downloadProducts() {
        const data = JSON.stringify({ products: products }, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "products.json";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);

        showStatus("Current product data downloaded as products.json.", "success");
    }

    function submitProductsToApi() {
        if (!products.length) {
            showStatus("Add a product before sending the collection to the API.", "warning");
            return;
        }

        // Configure the future API endpoint here before enabling live submissions.
        $.ajax({
            url: apiEndpoint,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ products: products }),
            success: function () {
                showStatus("The product collection was sent to the configured API endpoint.", "success");
            },
            error: function () {
                showStatus("The API request failed. Update the endpoint in js/sessions.js to a real REST service.", "danger");
            }
        });
    }

    $form.on("submit", function (event) {
        event.preventDefault();

        if (!validateProductForm()) {
            return;
        }

        const productObject = {
            id: $.trim(fields.id.val()),
            name: $.trim(fields.name.val()),
            description: $.trim(fields.description.val()),
            category: $.trim(fields.category.val()),
            price: Number($.trim(fields.price.val()))
        };

        if (editingProductId) {
            products = products.map(function (product) {
                return product.id === editingProductId ? productObject : product;
            });
            showStatus("Product updated successfully.", "success");
        } else {
            products.push(productObject);
            showStatus("Product added successfully.", "success");
        }

        saveProducts(products);
        resetForm();
    });

    $cancelButton.on("click", function () {
        resetForm();
        showStatus("Edit canceled. The form is ready for a new product.", "info");
    });

    $resetButton.on("click", function () {
        resetForm();
        showStatus("Form cleared. Ready for a new product.", "info");
    });

    $searchField.on("input", handleSearch);

    $exportButton.on("click", function () {
        downloadProducts();
    });

    $apiButton.on("click", function () {
        submitProductsToApi();
    });

    loadInitialData();
});
