/*
  Conference session manager
  This page lets the project add, edit, search, and export conference sessions.
  The app uses localStorage for persistence after refresh, and it loads the
  starter data from sessions.json before the user starts editing.
*/

$(document).ready(function () {
    "use strict";

    const storageKey = "cyberSecSummitSessions";
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

    const fields = {
        productId: $("#sessionId"),
        description: $("#sessionDescription"),
        category: $("#sessionCategory"),
        unitOfMeasure: $("#sessionFormat"),
        price: $("#sessionPrice"),
        additionalInfo: $("#sessionAdditionalInfo")
    };

    const fallbackSessions = [
        {
            productId: "SES-001",
            description: "Introduction to Cloud Security",
            category: "Cybersecurity",
            unitOfMeasure: "Workshop",
            price: 25.00,
            additionalInfo: "Room 204; 60 minutes"
        },
        {
            productId: "SES-002",
            description: "Threat Hunting in Real Time",
            category: "Threat Intelligence",
            unitOfMeasure: "Keynote",
            price: 45.00,
            additionalInfo: "Main Hall; 45 minutes"
        },
        {
            productId: "SES-003",
            description: "Zero Trust Architecture",
            category: "Network Security",
            unitOfMeasure: "Panel",
            price: 35.00,
            additionalInfo: "Room 118; 75 minutes"
        },
        {
            productId: "SES-004",
            description: "Secure DevOps Practices",
            category: "Software Security",
            unitOfMeasure: "Workshop",
            price: 0,
            additionalInfo: "Lab A; 90 minutes"
        }
    ];

    let sessions = [];
    let editingSessionId = null;

    // Show a visible alert message near the form so users get immediate feedback.
    function showStatus(message, type) {
        $statusMessage
            .removeClass("alert-info alert-success alert-warning alert-danger")
            .addClass("alert alert-" + type)
            .text(message);
    }

    // Save the current session list to browser storage so it still exists after refresh.
    function getStoredSessionList() {
        try {
            const rawData = localStorage.getItem(storageKey);
            const parsedData = rawData ? JSON.parse(rawData) : [];
            return Array.isArray(parsedData) ? parsedData : [];
        } catch (error) {
            return [];
        }
    }

    function storeSessions(sessionList) {
        sessions = sessionList;

        try {
            localStorage.setItem(storageKey, JSON.stringify(sessionList));
        } catch (error) {
            showStatus("Local storage is unavailable in this browser, but the current session list is still visible for this page session.", "warning");
        }

        renderSessions(sessions);
        return true;
    }

    // Build a safe JSON string for the read-only viewer at the bottom of the page.
    function renderJsonViewer(list) {
        const currentList = Array.isArray(list) ? list : [];
        $jsonView.text(JSON.stringify({ sessions: currentList }, null, 2));
    }

    // Add a Bootstrap validation style to a field and set a custom error message.
    function setFieldState(fieldName, isValid, message) {
        const field = fields[fieldName];
        const errorId = fieldName + "Error";
        const errorElement = $("#" + errorId);

        field.toggleClass("is-invalid", !isValid);
        field.attr("aria-invalid", String(!isValid));
        errorElement.text(message);
    }

    // Reset all validation state for the form before a new submission attempt.
    function clearValidation() {
        Object.keys(fields).forEach(function (fieldName) {
            setFieldState(fieldName, true, "");
        });
    }

    // Check whether the form is valid before saving or updating a session.
    function validateSessionForm() {
        clearValidation();

        const productId = $.trim(fields.productId.val());
        const description = $.trim(fields.description.val());
        const category = $.trim(fields.category.val());
        const format = $.trim(fields.unitOfMeasure.val());
        const priceText = $.trim(fields.price.val());
        const priceValue = Number(priceText);
        const additionalInfo = $.trim(fields.additionalInfo.val());

        const duplicateId = productId !== "" && sessions.some(function (session) {
            const sameId = session.productId && session.productId.toLowerCase() === productId.toLowerCase();

            if (!editingSessionId) {
                return sameId;
            }

            return sameId && session.productId.toLowerCase() !== editingSessionId.toLowerCase();
        });

        const validationResults = {
            productId: productId !== "" && !duplicateId,
            description: description !== "",
            category: category !== "",
            unitOfMeasure: format !== "",
            price: priceText !== "" && !Number.isNaN(priceValue) && priceValue >= 0
        };

        if (!validationResults.productId) {
            setFieldState(
                "productId",
                false,
                duplicateId ? "A session with this ID already exists. Use a unique ID." : "Enter a session ID."
            );
        }

        if (!validationResults.description) {
            setFieldState("description", false, "Enter the session title or description.");
        }

        if (!validationResults.category) {
            setFieldState("category", false, "Enter the session category or track.");
        }

        if (!validationResults.unitOfMeasure) {
            setFieldState("unitOfMeasure", false, "Enter the session format such as Workshop or Keynote.");
        }

        if (!validationResults.price) {
            setFieldState(
                "price",
                false,
                "Enter a valid price. Zero is allowed for free sessions."
            );
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

        // Optional notes are saved as entered, but they are not required.
        fields.additionalInfo.val(additionalInfo);
        return true;
    }

    // Reset the form after a successful save or when an edit is canceled.
    function resetForm() {
        $form.trigger("reset");
        editingSessionId = null;
        $saveButton.text("Add Session");
        $cancelButton.prop("hidden", true);
        $("#sessionFormHeading").text("Add a conference session");
        fields.productId.removeAttr("readonly");

        Object.keys(fields).forEach(function (fieldName) {
            const field = fields[fieldName];
            field.removeClass("is-invalid");
            field.removeAttr("aria-invalid");
        });
    }

    // Show all current session rows in a table with buttons for editing.
    function renderSessions(sessionList) {
        const list = Array.isArray(sessionList) ? sessionList : [];
        $tableBody.empty();

        if (list.length === 0) {
            $count.text("0");
            $emptyMessage.removeClass("d-none").text(
                $.trim($searchField.val()) !== "" ? "No matching sessions found." : "No sessions available yet. Add the first conference session."
            );
            renderJsonViewer([]);
            return;
        }

        $emptyMessage.addClass("d-none");
        $count.text(list.length);

        list.forEach(function (session) {
            const row = $("<tr>");

            row.append($("<td>").text(session.productId || ""));
            row.append($("<td>").text(session.description || ""));
            row.append($("<td>").text(session.category || ""));
            row.append($("<td>").text(session.unitOfMeasure || ""));
            row.append($("<td>").text(Number(session.price || 0).toFixed(2)));
            row.append($("<td>").text(session.additionalInfo || "-"));

            const actionsCell = $("<td>");
            const editButton = $("<button type='button' class='btn btn-sm btn-outline-primary me-2'>Edit</button>");

            editButton.on("click", function () {
                editSession(session.productId);
            });

            actionsCell.append(editButton);
            row.append(actionsCell);
            $tableBody.append(row);
        });

        renderJsonViewer(list);
    }

    // Load a session into the form so the user can edit it without creating a duplicate.
    function editSession(productId) {
        const selectedSession = sessions.find(function (session) {
            return session.productId === productId;
        });

        if (!selectedSession) {
            return;
        }

        resetForm();
        editingSessionId = selectedSession.productId;
        $saveButton.text("Update Session");
        $cancelButton.prop("hidden", false);
        $("#sessionFormHeading").text("Edit session");
        fields.productId.val(selectedSession.productId).prop("readonly", true);
        fields.description.val(selectedSession.description);
        fields.category.val(selectedSession.category);
        fields.unitOfMeasure.val(selectedSession.unitOfMeasure);
        fields.price.val(Number(selectedSession.price).toFixed(2));
        fields.additionalInfo.val(selectedSession.additionalInfo || "");
        showStatus("Edit the selected session and save your changes.", "info");
        fields.description.focus();
    }

    // Search is case-insensitive and checks ID, description, and category.
    function handleSearch() {
        const searchTerm = $.trim($searchField.val()).toLowerCase();

        if (searchTerm === "") {
            renderSessions(sessions);
            return;
        }

        const filteredList = sessions.filter(function (session) {
            const text = [
                session.productId,
                session.description,
                session.category
            ].join(" ").toLowerCase();

            return text.includes(searchTerm);
        });

        renderSessions(filteredList);
    }

    // Load the starting JSON data from the project file. If there is saved localStorage data,
    // that value should win so changes survive a browser refresh.
    function loadInitialData() {
        const savedSessions = localStorage.getItem(storageKey);

        if (savedSessions) {
            try {
                const parsedSaved = JSON.parse(savedSessions);

                if (Array.isArray(parsedSaved)) {
                    sessions = parsedSaved;
                    renderSessions(sessions);
                    showStatus("Saved sessions loaded from this browser.", "info");
                    return;
                }
            } catch (error) {
                showStatus("Saved session data was unreadable, so the default file was loaded instead.", "warning");
            }
        }

        $.getJSON("sessions.json")
            .done(function (data) {
                if (!data || !Array.isArray(data.sessions)) {
                    throw new Error("The JSON file does not contain a valid sessions array.");
                }

                sessions = data.sessions;

                try {
                    localStorage.setItem(storageKey, JSON.stringify(sessions));
                } catch (error) {
                    showStatus("Session data loaded successfully, but browser storage is unavailable on this page.", "warning");
                }

                renderSessions(sessions);
                showStatus("Sample sessions loaded successfully.", "success");
            })
            .fail(function () {
                sessions = fallbackSessions;
                renderSessions(sessions);
                showStatus("Sample session data is available locally because the JSON file could not be loaded in this browser.", "warning");
            });
    }

    // Save the form when the user submits it. This covers both adding and updating.
    $form.on("submit", function (event) {
        event.preventDefault();

        if (!validateSessionForm()) {
            return;
        }

        const sessionObject = {
            productId: $.trim(fields.productId.val()),
            description: $.trim(fields.description.val()),
            category: $.trim(fields.category.val()),
            unitOfMeasure: $.trim(fields.unitOfMeasure.val()),
            price: Number($.trim(fields.price.val())),
            additionalInfo: $.trim(fields.additionalInfo.val())
        };

        const isEditing = editingSessionId !== null;
        const duplicateIdOnSave = sessions.some(function (session) {
            const sameId = session.productId && session.productId.toLowerCase() === sessionObject.productId.toLowerCase();

            if (!isEditing) {
                return sameId;
            }

            return sameId && session.productId.toLowerCase() !== editingSessionId.toLowerCase();
        });

        if (duplicateIdOnSave) {
            setFieldState("productId", false, "A session with this ID already exists. Use a unique ID.");
            fields.productId.focus();
            showStatus("Please correct the highlighted fields before saving.", "danger");
            return;
        }

        if (isEditing) {
            sessions = sessions.map(function (session) {
                return session.productId === editingSessionId ? sessionObject : session;
            });
            showStatus("Session updated successfully.", "success");
        } else {
            sessions.push(sessionObject);
            showStatus("Session added successfully.", "success");
        }

        if (storeSessions(sessions)) {
            resetForm();
        }
    });

    $cancelButton.on("click", function () {
        resetForm();
        showStatus("Edit canceled. The form is ready for a new session.", "info");
    });

    $resetButton.on("click", function () {
        resetForm();
        showStatus("Form cleared. Ready for a new session.", "info");
    });

    $searchField.on("input", handleSearch);

    $exportButton.on("click", function () {
        const data = JSON.stringify({ sessions: sessions }, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "sessions.json";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);

        showStatus("Current session data downloaded as sessions.json.", "success");
    });

    loadInitialData();
});
