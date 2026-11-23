"use strict";

const form = document.getElementById("attendeeForm");
const tableBody = document.getElementById("attendeeTable");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const downloadButton = document.getElementById("downloadButton");

if (form && tableBody && statusMessage && submitButton && cancelButton && downloadButton) {
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
        statusMessage.className = "alert alert-" + type;
        statusMessage.textContent = message;
    }

    async function request(url, method, data) {
        const response = await fetch(url, {
            method: method,
            headers: data ? { "Content-Type": "application/json" } : undefined,
            body: data ? JSON.stringify(data) : undefined
        });
        const result = response.status === 204 ? {} : await response.json();
        if (!response.ok) {
            throw new Error(result.error || "The server could not complete the request.");
        }
        return result;
    }

    function setFieldValidity(field, valid) {
        field.classList.toggle("is-invalid", !valid);
        field.setAttribute("aria-invalid", String(!valid));
    }

    function validateForm() {
        const name = fields.fullName.value.trim();
        const ageText = fields.age.value.trim();
        const age = Number(ageText);
        const email = fields.email.value.trim();
        const phone = fields.phone.value.trim();
        const address = fields.address.value.trim();
        const duplicateEmail = attendees.some(function (attendee) {
            return attendee.email.toLowerCase() === email.toLowerCase() && attendee.id !== editingId;
        });
        const phoneDigits = phone.replace(/\D/g, "");
        const results = {
            fullName: name.split(/\s+/).filter(Boolean).length >= 2 && name.length <= 100,
            age: ageText !== "" && Number.isInteger(age) && age >= 1 && age <= 120,
            email: fields.email.validity.valid && !duplicateEmail,
            phone: phone === "" || (/^[+\d\s().-]+$/.test(phone) && phoneDigits.length >= 7 && phoneDigits.length <= 15),
            address: address.length > 0 && address.length <= 250
        };
        document.getElementById("emailError").textContent = duplicateEmail
            ? "An attendee with this email is already registered."
            : "Enter a valid email address.";
        Object.keys(results).forEach(function (key) {
            setFieldValidity(fields[key], results[key]);
        });
        const firstInvalid = Object.keys(results).find(function (key) { return !results[key]; });
        if (firstInvalid) {
            showMessage("Please correct the highlighted fields.", "danger");
            fields[firstInvalid].focus();
            return null;
        }
        return { fullName: name, age: age, email: email, phone: phone, address: address };
    }

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

    function renderAttendees() {
        tableBody.replaceChildren();
        attendees.forEach(function (attendee) {
            const row = document.createElement("tr");
            [attendee.fullName, attendee.age, attendee.email, attendee.phone || "Not provided", attendee.address]
                .forEach(function (value) {
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
            editButton.addEventListener("click", function () { editAttendee(attendee.id); });
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "btn btn-sm btn-outline-danger m-1";
            deleteButton.textContent = "Delete";
            deleteButton.setAttribute("aria-label", "Delete " + attendee.fullName);
            deleteButton.addEventListener("click", function () { deleteAttendee(attendee.id); });
            actions.append(editButton, deleteButton);
            row.appendChild(actions);
            tableBody.appendChild(row);
        });
        document.getElementById("attendeeCount").textContent = attendees.length;
        document.getElementById("emptyMessage").hidden = attendees.length > 0;
        downloadButton.disabled = attendees.length === 0;
    }

    function editAttendee(id) {
        const attendee = attendees.find(function (record) { return record.id === id; });
        if (!attendee) return;
        resetForm();
        editingId = id;
        Object.keys(fields).forEach(function (key) { fields[key].value = attendee[key] || ""; });
        submitButton.textContent = "Save Changes";
        cancelButton.hidden = false;
        document.getElementById("formHeading").textContent = "Update attendee";
        showMessage("Edit the information and select Save Changes.", "info");
        fields.fullName.focus();
    }

    async function deleteAttendee(id) {
        if (!window.confirm("Delete this attendee?")) return;
        try {
            await request("/api/attendees/" + encodeURIComponent(id), "DELETE");
            attendees = attendees.filter(function (attendee) { return attendee.id !== id; });
            if (editingId === id) resetForm();
            renderAttendees();
            showMessage("Attendee deleted from the database.", "success");
        } catch (error) {
            showMessage(error.message, "danger");
        }
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const attendee = validateForm();
        if (!attendee) return;
        const wasEditing = editingId !== null;
        submitButton.disabled = true;
        try {
            const result = await request(
                wasEditing ? "/api/attendees/" + encodeURIComponent(editingId) : "/api/attendees",
                wasEditing ? "PUT" : "POST",
                attendee
            );
            attendees = wasEditing
                ? attendees.map(function (item) { return item.id === editingId ? result.attendee : item; })
                : [result.attendee, ...attendees];
            renderAttendees();
            resetForm();
            showMessage(wasEditing ? "Attendee updated in the database." : "Attendee registered in the database.", "success");
        } catch (error) {
            showMessage(error.message, "danger");
        } finally {
            submitButton.disabled = false;
        }
    });

    cancelButton.addEventListener("click", function () {
        resetForm();
        showMessage("Editing canceled.", "info");
    });

    downloadButton.addEventListener("click", function () {
        const file = new Blob([JSON.stringify(attendees, null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = "attendees.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    request("/api/attendees", "GET").then(function (result) {
        if (!result || !Array.isArray(result.attendees)) {
            throw new Error("The attendee response is invalid.");
        }
        attendees = result.attendees;
        renderAttendees();
        showMessage("Attendees loaded from the database.", "success");
    }).catch(function (error) {
        showMessage(error.message, "danger");
    });
}
