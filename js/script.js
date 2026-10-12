/*
  Conference registration logic
  This script handles attendee validation, local storage, editing,
  deletion, and JSON export for the registration form.
  It includes a safety guard so the page still loads cleanly on non-registration pages.
*/

"use strict";

const storageKey = "cyberSecSummitAttendees";
const form = document.getElementById("attendeeForm");
const tableBody = document.getElementById("attendeeTable");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const downloadButton = document.getElementById("downloadButton");

// Guard: allow the script to be safe if a future page includes it without the form.
if (!form || !tableBody || !statusMessage || !submitButton || !cancelButton || !downloadButton) {
    console.warn("Registration elements were not found. Skipping attendee initialization.");
} else {
    // Reference the form fields so validation and data updates can be managed together.
    const fields = {
        fullName: document.getElementById("fullName"),
        age: document.getElementById("age"),
        email: document.getElementById("email"),
        phone: document.getElementById("phone"),
        address: document.getElementById("address")
    };

    let attendees = [];
    let editingId = null;

    function showMessage(message, type) {
        if (!statusMessage) {
            return;
        }

        statusMessage.className = "alert alert-" + type;
        statusMessage.textContent = message;
    }

    // Load any saved attendee data from browser storage when the page loads.
    try {
        const savedData = localStorage.getItem(storageKey);

        if (savedData !== null) {
            const parsedData = JSON.parse(savedData);

            const validRecords = Array.isArray(parsedData) &&
                parsedData.every(function (attendee) {
                    return attendee !== null &&
                        typeof attendee === "object" &&
                        typeof attendee.id === "string" &&
                        typeof attendee.fullName === "string" &&
                        Number.isInteger(attendee.age) &&
                        typeof attendee.email === "string" &&
                        typeof attendee.phone === "string" &&
                        typeof attendee.address === "string";
                });

            if (!validRecords) {
                throw new Error("Invalid stored records");
            }

            attendees = parsedData;
        }
    } catch (error) {
        showMessage(
            "Saved records could not be loaded. Check browser storage before saving new records.",
            "warning"
        );
    }

    // Mark a specific form field as valid or invalid for Bootstrap validation styling.
    function setFieldValidity(field, valid) {
        field.classList.toggle("is-invalid", !valid);
        field.setAttribute("aria-invalid", String(!valid));
    }

    // Validate all required fields before saving a new attendee or updating an existing one.
    function validateForm() {
        const name = fields.fullName.value.trim();
        const ageText = fields.age.value.trim();
        const age = Number(ageText);
        const email = fields.email.value.trim();
        const phone = fields.phone.value.trim();
        const address = fields.address.value.trim();

        const duplicateEmail = attendees.some(function (attendee) {
            return attendee.email.toLowerCase() === email.toLowerCase() &&
                attendee.id !== editingId;
        });

        const phoneDigits = phone.replace(/\D/g, "");

        const results = {
            fullName: name.length <= 100 &&
                name.split(/\s+/).filter(Boolean).length >= 2,
            age: ageText !== "" &&
                Number.isInteger(age) && age >= 1 && age <= 120,
            email: email !== "" &&
                fields.email.validity.valid && !duplicateEmail,
            phone: phone === "" ||
                (/^[+\d\s().-]+$/.test(phone) &&
                 phoneDigits.length >= 7 && phoneDigits.length <= 15),
            address: address.length > 0 && address.length <= 250
        };

        document.getElementById("emailError").textContent =
            duplicateEmail
                ? "An attendee with this email is already registered."
                : "Enter a valid email address.";

        Object.keys(results).forEach(function (key) {
            setFieldValidity(fields[key], results[key]);
        });

        const firstInvalid = Object.keys(results).find(function (key) {
            return !results[key];
        });

        if (firstInvalid) {
            showMessage("Please correct the highlighted fields.", "danger");
            fields[firstInvalid].focus();
            return false;
        }

        return true;
    }

    // Save the attendee list to localStorage and update the visible table.
    function saveAttendees(nextAttendees) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(nextAttendees));

            attendees = nextAttendees;
            renderAttendees();
            return true;
        } catch (error) {
            showMessage(
                "Records could not be saved. Browser storage may be unavailable or full.",
                "danger"
            );
            return false;
        }
    }

    // Clear the form and reset the edit state when the user finishes submitting or cancels.
    function resetForm() {
        form.reset();
        editingId = null;
        submitButton.textContent = "Register Attendee";
        cancelButton.hidden = true;
        document.getElementById("formHeading").textContent = "Register an attendee";

        Object.values(fields).forEach(function (field) {
            field.classList.remove("is-invalid");
            field.removeAttribute("aria-invalid");
        });
    }

    // Fill the form with an attendee's data so the user can update it.
    function editAttendee(id) {
        const attendee = attendees.find(function (record) {
            return record.id === id;
        });

        if (!attendee) {
            return;
        }

        resetForm();
        editingId = id;

        Object.keys(fields).forEach(function (key) {
            fields[key].value = attendee[key];
        });

        submitButton.textContent = "Save Changes";
        cancelButton.hidden = false;
        document.getElementById("formHeading").textContent = "Update attendee";

        showMessage("Edit the information and select Save Changes.", "info");
        fields.fullName.focus();
    }

    // Remove an attendee from the list after confirmation.
    function deleteAttendee(id) {
        if (!window.confirm("Delete this attendee?")) {
            return;
        }

        const nextAttendees = attendees.filter(function (attendee) {
            return attendee.id !== id;
        });

        if (saveAttendees(nextAttendees)) {
            if (editingId === id) {
                resetForm();
            }

            showMessage("Attendee deleted.", "success");
        }
    }

    // Draw the attendee table rows from the current in-memory list.
    function renderAttendees() {
        tableBody.replaceChildren();

        attendees.forEach(function (attendee) {
            const row = document.createElement("tr");

            const values = [
                attendee.fullName,
                attendee.age,
                attendee.email,
                attendee.phone || "Not provided",
                attendee.address
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actions = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "btn btn-sm btn-outline-primary m-1";
            editButton.textContent = "Edit";
            editButton.setAttribute("aria-label", "Edit " + attendee.fullName);
            editButton.addEventListener("click", function () {
                editAttendee(attendee.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "btn btn-sm btn-outline-danger m-1";
            deleteButton.textContent = "Delete";
            deleteButton.setAttribute("aria-label", "Delete " + attendee.fullName);
            deleteButton.addEventListener("click", function () {
                deleteAttendee(attendee.id);
            });

            actions.append(editButton, deleteButton);
            row.appendChild(actions);
            tableBody.appendChild(row);
        });

        document.getElementById("attendeeCount").textContent = attendees.length;
        document.getElementById("emptyMessage").hidden = attendees.length > 0;
        downloadButton.disabled = attendees.length === 0;
    }

    // Handle form submission for both creating and updating attendee records.
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const wasEditing = editingId !== null;

        const attendee = {
            id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2),
            fullName: fields.fullName.value.trim(),
            age: Number(fields.age.value),
            email: fields.email.value.trim(),
            phone: fields.phone.value.trim(),
            address: fields.address.value.trim()
        };

        const nextAttendees = wasEditing
            ? attendees.map(function (record) {
                return record.id === editingId ? attendee : record;
            })
            : [...attendees, attendee];

        if (saveAttendees(nextAttendees)) {
            resetForm();

            showMessage(
                wasEditing
                    ? "Attendee information updated."
                    : "Attendee registered successfully.",
                "success"
            );
        }
    });

    // Cancel an in-progress edit without saving any changes.
    cancelButton.addEventListener("click", function () {
        resetForm();
        showMessage("Editing canceled.", "info");
    });

    // Export all currently stored attendees as a JSON file.
    downloadButton.addEventListener("click", function () {
        const json = JSON.stringify(attendees, null, 4);
        const file = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = "attendees.json";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    });

    // Display the initial table state as soon as the page loads.
    renderAttendees();
}
