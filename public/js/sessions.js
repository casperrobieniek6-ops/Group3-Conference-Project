$(document).ready(function () {
    "use strict";

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
    const $refreshButton = $("#refreshProductsButton");
    const $cartBadge = $("#cartBadge");

    const fields = {
        id: $("#sessionId"),
        name: $("#sessionName"),
        description: $("#sessionDescription"),
        category: $("#sessionCategory"),
        price: $("#sessionPrice")
    };

    let products = [];
    let editingProductId = null;

    function showStatus(message, type) {
        $statusMessage
            .removeClass("alert-info alert-success alert-warning alert-danger")
            .addClass("alert alert-" + type)
            .text(message);
    }

    function setFieldState(fieldName, isValid, message) {
        const field = fields[fieldName];
        field.toggleClass("is-invalid", !isValid);
        field.attr("aria-invalid", String(!isValid));
        const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        $("#session" + label + "Error").text(message);
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
        fields.id.prop("readonly", false);
        Object.keys(fields).forEach(function (fieldName) {
            fields[fieldName].removeClass("is-invalid").removeAttr("aria-invalid");
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
            return product.id.toLowerCase() === productId.toLowerCase()
                && product.id.toLowerCase() !== String(editingProductId || "").toLowerCase();
        });
        const results = {
            id: productId !== "" && !duplicateId,
            name: productName.length >= 2,
            description: description.length >= 5,
            category: category.length >= 2,
            price: priceText !== "" && Number.isFinite(priceValue) && priceValue > 0
        };
        const messages = {
            id: duplicateId ? "A product with this ID already exists. Choose a unique value." : "Enter a product ID.",
            name: "Enter a product name with useful wording.",
            description: "Add a detailed description for the product.",
            category: "Enter a category such as Passes, Workshop, or Merchandise.",
            price: "Enter a valid price greater than zero."
        };
        Object.keys(results).forEach(function (key) {
            if (!results[key]) {
                setFieldState(key, false, messages[key]);
            }
        });
        const invalidField = Object.keys(results).find(function (key) { return !results[key]; });
        if (invalidField) {
            fields[invalidField].focus();
            showStatus("Please correct the highlighted fields before saving.", "danger");
            return false;
        }
        return true;
    }

    function renderJsonViewer(list) {
        $jsonView.text(JSON.stringify({ products: list }, null, 2));
    }

    function deleteProduct(product) {
        if (!window.confirm("Delete " + product.name + " from the conference catalog?")) {
            return;
        }
        $.ajax({
            url: "/api/products/" + encodeURIComponent(product.id),
            method: "DELETE"
        }).done(function () {
            products = products.filter(function (item) { return item.id !== product.id; });
            renderProducts(products);
            showStatus("Product deleted from the database.", "success");
        }).fail(function (response) {
            showStatus(response.responseJSON && response.responseJSON.error
                ? response.responseJSON.error
                : "The product could not be deleted.", "danger");
        });
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
            row.append($("<td>").text(product.id));
            row.append($("<td>").text(product.name));
            row.append($("<td>").text(product.description));
            row.append($("<td>").text(product.category));
            row.append($("<td>").text("$" + Number(product.price).toFixed(2)));

            const actionsCell = $("<td>");
            const editButton = $("<button type='button' class='btn btn-sm btn-outline-primary me-2'>Edit</button>");
            const deleteButton = $("<button type='button' class='btn btn-sm btn-outline-danger'>Delete</button>");
            editButton.on("click", function () { editProduct(product.id); });
            deleteButton.on("click", function () { deleteProduct(product); });
            actionsCell.append(editButton, deleteButton);
            row.append(actionsCell);
            $tableBody.append(row);
        });
        renderJsonViewer(productList);
    }

    function editProduct(productId) {
        const selectedProduct = products.find(function (product) { return product.id === productId; });
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
        fields.description.val(selectedProduct.description);
        fields.category.val(selectedProduct.category);
        fields.price.val(Number(selectedProduct.price).toFixed(2));
        showStatus("Edit the selected product and save your changes.", "info");
        fields.name.focus();
    }

    function handleSearch() {
        const searchTerm = $.trim($searchField.val()).toLowerCase();
        const filteredProducts = products.filter(function (product) {
            return [product.id, product.name, product.description, product.category]
                .join(" ").toLowerCase().includes(searchTerm);
        });
        renderProducts(filteredProducts);
    }

    function updateCartBadge() {
        let total = 0;
        try {
            const cart = JSON.parse(localStorage.getItem("cyberSecSummitCart") || "{}");
            if (cart && typeof cart === "object") {
                total = Object.keys(cart).reduce(function (sum, key) {
                    return sum + (Number(cart[key].quantity) || 0);
                }, 0);
            }
        } catch (error) {
            total = 0;
        }
        $cartBadge.text(total);
    }

    function loadProducts() {
        $refreshButton.prop("disabled", true);
        $.getJSON("/api/products").done(function (result) {
            if (!result || !Array.isArray(result.products)) {
                showStatus("The product catalog response is invalid.", "danger");
                return;
            }
            products = result.products;
            renderProducts(products);
            showStatus("Conference products loaded from MongoDB.", "success");
        }).fail(function (response) {
            showStatus(response.responseJSON && response.responseJSON.error
                ? response.responseJSON.error
                : "The product catalog could not be loaded. Check the Node server and database.", "danger");
        }).always(function () {
            $refreshButton.prop("disabled", false);
        });
    }

    function downloadProducts() {
        const blob = new Blob([JSON.stringify({ products: products }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "products.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        showStatus("Current product data downloaded as products.json.", "success");
    }

    $form.on("submit", function (event) {
        event.preventDefault();
        if (!validateProductForm()) {
            return;
        }
        const product = {
            id: $.trim(fields.id.val()),
            name: $.trim(fields.name.val()),
            description: $.trim(fields.description.val()),
            category: $.trim(fields.category.val()),
            price: Number($.trim(fields.price.val()))
        };
        const isEditing = Boolean(editingProductId);
        $saveButton.prop("disabled", true);
        $.ajax({
            url: editingProductId
                ? "/api/products/" + encodeURIComponent(editingProductId)
                : "/api/products",
            method: editingProductId ? "PUT" : "POST",
            contentType: "application/json",
            data: JSON.stringify(product)
        }).done(function (result) {
            if (editingProductId) {
                products = products.map(function (item) {
                    return item.id === editingProductId ? result.product : item;
                });
            } else {
                products.push(result.product);
            }
            renderProducts(products);
            resetForm();
            showStatus(isEditing ? "Product updated in the database." : "Product added to the database.", "success");
        }).fail(function (response) {
            showStatus(response.responseJSON && response.responseJSON.error
                ? response.responseJSON.error
                : "The product could not be saved.", "danger");
        }).always(function () {
            $saveButton.prop("disabled", false);
        });
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
    $exportButton.on("click", downloadProducts);
    $refreshButton.on("click", loadProducts);

    updateCartBadge();
    loadProducts();
});
