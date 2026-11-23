(function (global, $) {
    "use strict";

    const cartIdKey = "cyberSecSummitCartId";
    const cartStorageKey = "cyberSecSummitCart";
    let saveQueue = $.Deferred().resolve().promise();

    function getId() {
        let id = localStorage.getItem(cartIdKey);
        if (!id) {
            id = global.crypto && typeof global.crypto.randomUUID === "function"
                ? global.crypto.randomUUID()
                : Date.now().toString(36) + Math.random().toString(36).slice(2);
            localStorage.setItem(cartIdKey, id);
        }
        return id;
    }

    function readLocal() {
        try {
            const cart = JSON.parse(localStorage.getItem(cartStorageKey) || "{}");
            return cart && typeof cart === "object" && !Array.isArray(cart) ? cart : {};
        } catch (error) {
            return {};
        }
    }

    function writeLocal(cart) {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    }

    function save(cart) {
        writeLocal(cart);
        const items = Object.keys(cart).map(function (key) {
            return {
                productId: String(cart[key].id || key),
                quantity: Number(cart[key].quantity)
            };
        });
        const saveRequest = function () {
            return $.ajax({
                url: "/api/carts/" + encodeURIComponent(getId()),
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify({ items: items })
            });
        };
        const pending = saveQueue.then(saveRequest, saveRequest);
        saveQueue = pending.then(function () {}, function () {});
        return pending;
    }

    function load() {
        const existingId = localStorage.getItem(cartIdKey);
        if (existingId) {
            return $.getJSON("/api/carts/" + encodeURIComponent(existingId)).then(function (result) {
                const localCart = readLocal();
                if (result.cart.items.length === 0 && Object.keys(localCart).length > 0) {
                    return save(localCart);
                }
                return result;
            }, function (response) {
                if (response.status === 404) {
                    return save(readLocal());
                }
                return $.Deferred().reject(response).promise();
            });
        }
        getId();
        const cart = readLocal();
        return save(cart);
    }

    function cache(items) {
        const cart = {};
        (Array.isArray(items) ? items : []).forEach(function (item) {
            if (item && item.productId && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0) {
                cart[item.productId] = {
                    id: item.productId,
                    name: String(item.name || ""),
                    price: Number(item.price),
                    quantity: Number(item.quantity)
                };
            }
        });
        writeLocal(cart);
        return cart;
    }

    function forget() {
        localStorage.removeItem(cartStorageKey);
        localStorage.removeItem(cartIdKey);
    }

    global.ConferenceCartApi = { getId, readLocal, save, load, cache, forget };
}(window, jQuery));
