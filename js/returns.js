(function () {
    "use strict";

    const app = angular.module("conferenceReturns", []);
    app.controller("ReturnsController", ["$scope", "$http", function ($scope, $http) {
        $scope.products = [];
        $scope.filteredProducts = [];
        $scope.selectedProduct = null;
        $scope.request = { email: "", reason: "", condition: "" };
        $scope.savedReturns = [];
        $scope.loading = true;
        $scope.submitting = false;
        $scope.error = "";
        $scope.submitError = "";
        $scope.confirmation = "";

        function filterProducts(searchTerm) {
            const query = $.trim(searchTerm || "").toLowerCase();
            $scope.filteredProducts = $.grep($scope.products, function (product) {
                return [product.id, product.name, product.category, product.description]
                    .join(" ").toLowerCase().includes(query);
            });
        }

        $http.get("/api/products").then(function (response) {
            if (!response.data || !Array.isArray(response.data.products)) {
                throw new Error("The product catalog response is invalid.");
            }
            $scope.products = response.data.products;
            filterProducts("");
        }).catch(function () {
            $scope.error = "The product catalog could not be loaded. Check the Node server and try again.";
        }).finally(function () {
            $scope.loading = false;
        });

        $("#returnProductSearch").on("input", function () {
            const searchTerm = $(this).val();
            $scope.$applyAsync(function () {
                filterProducts(searchTerm);
            });
        });

        $scope.selectProduct = function (product) {
            $scope.selectedProduct = product;
            $scope.submitError = "";
            $scope.confirmation = "";
        };

        $scope.submit = function (form) {
            $scope.submitError = "";
            $scope.confirmation = "";
            if (!form.$valid || !$scope.selectedProduct || $scope.request.reason.trim().length < 10) {
                $scope.submitError = "Choose a product and complete a valid email, reason, and product condition.";
                return;
            }
            const payload = {
                productId: $scope.selectedProduct.id,
                email: $scope.request.email.trim(),
                reason: $scope.request.reason.trim(),
                condition: $scope.request.condition
            };
            $scope.submitting = true;
            $http.post("/api/returns", payload).then(function (response) {
                const saved = response.data.returnRequest;
                $scope.savedReturns.unshift(saved);
                $scope.confirmation = "Return request " + saved.id + " was recorded. No refund or shipping label was created.";
                $scope.request.reason = "";
                $scope.request.condition = "";
                form.$setPristine();
                form.$setUntouched();
            }).catch(function (response) {
                $scope.submitError = response.data && response.data.error
                    ? response.data.error
                    : "The return request could not be submitted. Please try again.";
            }).finally(function () {
                $scope.submitting = false;
            });
        };
    }]);
}());
