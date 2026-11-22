(function () {
    "use strict";

    const app = angular.module("conferenceBilling", []);
    app.controller("BillingController", ["$scope", "$http", function ($scope, $http) {
        $scope.details = {
            name: "",
            email: "",
            address: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "United States" }
        };
        $scope.card = { number: "", expiry: "", code: "" };
        $scope.shipping = "standard";
        $scope.cartItems = [];
        $scope.cartLoading = true;
        $scope.submitting = false;
        $scope.error = "";
        $scope.confirmation = "";

        function localCartItems(cart) {
            return Object.keys(cart).map(function (id) {
                const item = cart[id];
                return {
                    id: String(item.id || id),
                    name: String(item.name || ""),
                    price: Number(item.price),
                    quantity: Number(item.quantity)
                };
            }).filter(function (item) {
                return item.name && Number.isFinite(item.price) && item.price > 0
                    && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20;
            });
        }

        ConferenceCartApi.load().done(function (result) {
            $scope.$applyAsync(function () {
                $scope.cartItems = result.cart.items.map(function (item) {
                    return {
                        id: item.productId,
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    };
                });
                ConferenceCartApi.cache(result.cart.items);
                $scope.cartLoading = false;
            });
        }).fail(function (response) {
            const localCart = ConferenceCartApi.readLocal();
            if (response.status === 404 && Object.keys(localCart).length > 0) {
                $scope.$applyAsync(function () {
                    $scope.cartItems = localCartItems(localCart);
                });
                ConferenceCartApi.save(localCart).always(function () {
                    $scope.$applyAsync(function () { $scope.cartLoading = false; });
                }).fail(function () {
                    $scope.$applyAsync(function () {
                        $scope.error = "The saved cart could not be migrated to the database.";
                    });
                });
                return;
            }
            $scope.$applyAsync(function () {
                $scope.cartLoading = false;
                if (response.status !== 404) {
                    $scope.error = response.responseJSON && response.responseJSON.error
                        ? response.responseJSON.error
                        : "The cart could not be loaded from the database.";
                }
            });
        });

        $scope.subtotal = function () {
            return $scope.cartItems.reduce(function (sum, item) { return sum + item.price * item.quantity; }, 0);
        };
        $scope.shippingAmount = function () {
            if (!$scope.cartItems.length) {
                return 0;
            }
            return $scope.shipping === "pickup" ? 0 : 8;
        };
        $scope.total = function () {
            return $scope.subtotal() + $scope.shippingAmount();
        };
        $scope.clearError = function () {
            $scope.error = "";
        };

        function validCardNumber(rawNumber) {
            const number = rawNumber.replace(/\D/g, "");
            if (number.length < 13 || number.length > 19) {
                return false;
            }
            let sum = 0;
            let doubleDigit = false;
            for (let index = number.length - 1; index >= 0; index -= 1) {
                let digit = Number(number[index]);
                if (doubleDigit) {
                    digit *= 2;
                    if (digit > 9) {
                        digit -= 9;
                    }
                }
                sum += digit;
                doubleDigit = !doubleDigit;
            }
            return sum % 10 === 0;
        }

        function validExpiry(value) {
            let year;
            let month;
            if (value instanceof Date && Number.isFinite(value.getTime())) {
                year = value.getFullYear();
                month = value.getMonth() + 1;
            } else {
                if (!/^\d{4}-\d{2}$/.test(value || "")) {
                    return false;
                }
                [year, month] = value.split("-").map(Number);
            }
            const now = new Date();
            return month >= 1 && month <= 12
                && (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1));
        }

        $scope.submit = function (form) {
            $scope.error = "";
            $scope.confirmation = "";
            if ($scope.cartLoading) {
                $scope.error = "Wait for the database cart to finish loading.";
                return;
            }
            if (!form.$valid) {
                $scope.error = "Complete all required billing fields using a valid email address.";
                return;
            }
            if (!$scope.cartItems.length) {
                $scope.error = "Add at least one item to your cart before placing an order.";
                return;
            }
            if (!validCardNumber(String($scope.card.number || ""))) {
                $scope.error = "Enter a valid card number. It is checked locally and is not sent to the server.";
                return;
            }
            if (!validExpiry($scope.card.expiry)) {
                $scope.error = "Enter an expiration month that has not passed.";
                return;
            }
            if (!/^\d{3,4}$/.test(String($scope.card.code || ""))) {
                $scope.error = "Enter a 3- or 4-digit security code.";
                return;
            }

            const digits = String($scope.card.number).replace(/\D/g, "");
            const payload = {
                cartId: ConferenceCartApi.getId(),
                name: $scope.details.name.trim(),
                email: $scope.details.email.trim(),
                address: angular.copy($scope.details.address),
                payment: { method: "card", last4: digits.slice(-4) },
                order: {
                    items: $scope.cartItems.map(function (item) {
                        return { productId: item.id, quantity: item.quantity };
                    }),
                    subtotal: Number($scope.subtotal().toFixed(2)),
                    shipping: $scope.shipping,
                    shippingAmount: $scope.shippingAmount(),
                    total: Number($scope.total().toFixed(2))
                }
            };
            $scope.card = { number: "", expiry: "", code: "" };
            $scope.submitting = true;
            $http.post("/api/billing", payload).then(function (response) {
                $scope.confirmation = "Demo order " + response.data.order.id + " recorded for "
                    + response.data.order.total.toLocaleString("en-US", { style: "currency", currency: "USD" })
                    + ". No payment was charged.";
                $scope.cartItems = [];
                ConferenceCartApi.forget();
            }).catch(function (response) {
                $scope.error = response.data && response.data.error
                    ? response.data.error
                    : "The order could not be processed. Your cart and form are still available to retry.";
            }).finally(function () {
                $scope.submitting = false;
            });
        };
    }]);
}());
