/* React-managed registration form with jQuery session loading, filtering, and AJAX. */
(function () {
    "use strict";

    const h = React.createElement;
    const config = window.CONFERENCE_REGISTRATION_API || {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const participationTypes = [
        { value: "in-person", label: "In-person", detail: "Join us at the Harrisburg venue." },
        { value: "virtual", label: "Virtual", detail: "Attend remotely from anywhere." },
        { value: "vip", label: "VIP", detail: "Enjoy premium access and networking." }
    ];

    function updateServiceModeBanner() {
        const banner = document.getElementById("serviceModeBanner");
        if (!banner) {
            return;
        }

        if (String(config.endpoint || "").trim()) {
            banner.className = "alert alert-info mock-banner";
            banner.textContent = "Live API mode: registration details will be sent to the configured REST endpoint. The confirmation appears only after the API responds successfully.";
        } else if (config.demoMode !== true) {
            banner.className = "alert alert-danger mock-banner";
            banner.textContent = "Registration unavailable: no REST endpoint is configured and demonstration mode is disabled.";
        } else {
            banner.className = "alert alert-warning mock-banner";
            banner.textContent = "Demonstration mode: No registration server is configured. Submitting this form shows a clearly labeled local demo confirmation; it does not send or save a real registration.";
        }
    }

    // Convert the repository's existing session JSON fields into consistent option data.
    function normalizeSessions(data) {
        if (!data || !Array.isArray(data.sessions)) {
            throw new Error("The sessions.json file does not contain a sessions list.");
        }

        return data.sessions.map(function (session) {
            const id = String(session.productId || session.id || "").trim();
            const title = String(session.title || session.name || session.description || "").trim();
            const track = String(session.track || session.category || "").trim();
            const format = String(session.format || session.unitOfMeasure || "Session").trim();
            const details = String(session.additionalInfo || session.details || "").trim();

            if (!id || !title) {
                throw new Error("A session in sessions.json is missing its ID or title.");
            }

            return { id: id, title: title, track: track, format: format, details: details };
        });
    }

    // Keep service transport in one place so a configured REST endpoint can replace the demo.
    function sendRegistration(payload) {
        const endpoint = String(config.endpoint || "").trim();

        if (endpoint) {
            return $.ajax({
                url: endpoint,
                method: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                data: JSON.stringify(payload)
            }).then(function (response) {
                return { mode: "api", response: response };
            });
        }

        if (config.demoMode !== true) {
            return $.Deferred().reject(new Error("No registration API endpoint is configured."));
        }

        // This is only an asynchronous UI demonstration, not a network request or saved record.
        return $.Deferred(function (deferred) {
            window.setTimeout(function () {
                deferred.resolve({ mode: "mock" });
            }, Number(config.mockDelayMs) || 500);
        }).promise();
    }

    class FinalizationApp extends React.Component {
        constructor(props) {
            super(props);
            // React state is the single source of truth for attendee data and selections.
            this.state = {
                fullName: "",
                email: "",
                participationType: "",
                selectedSessionIds: [],
                searchTerm: "",
                sessions: [],
                filteredSessions: [],
                sessionsLoading: true,
                sessionsError: "",
                errors: {},
                jsonPayload: null,
                submitting: false,
                submissionError: "",
                confirmation: null
            };

            this.handleSubmit = this.handleSubmit.bind(this);
            this.handleChange = this.handleChange.bind(this);
            this.handleSearch = this.handleSearch.bind(this);
            this.handleSessionToggle = this.handleSessionToggle.bind(this);
            this.downloadJson = this.downloadJson.bind(this);
        }

        componentDidMount() {
            const self = this;

            // jQuery loads the existing JSON file asynchronously and reports file/data errors.
            $.getJSON("sessions.json")
                .done(function (data) {
                    try {
                        const sessions = normalizeSessions(data);
                        self.setState({
                            sessions: sessions,
                            filteredSessions: self.filterSessions(self.state.searchTerm, sessions),
                            sessionsLoading: false
                        });
                    } catch (error) {
                        self.setState({ sessionsError: error.message, sessionsLoading: false });
                    }
                })
                .fail(function () {
                    self.setState({
                        sessionsError: "Session options could not be loaded. Run this site through a local web server and check sessions.json.",
                        sessionsLoading: false
                    });
                });
        }

        filterSessions(term, sessions) {
            // Use jQuery to filter the loaded session records by all of their display fields.
            const query = $.trim(term).toLowerCase();
            return $.grep(sessions, function (session) {
                const searchableText = [session.id, session.title, session.track, session.format, session.details]
                    .join(" ")
                    .toLowerCase();
                return searchableText.includes(query);
            });
        }

        handleChange(event) {
            const target = event.target;
            const field = target.name;
            const value = target.value;

            this.setState(function (state) {
                const errors = Object.assign({}, state.errors);
                delete errors[field];
                return { [field]: value, errors: errors, submissionError: "" };
            });
        }

        handleSearch(event) {
            const searchTerm = event.target.value;
            this.setState({
                searchTerm: searchTerm,
                filteredSessions: this.filterSessions(searchTerm, this.state.sessions)
            });
        }

        handleSessionToggle(sessionId, checked) {
            this.setState(function (state) {
                const selectedSessionIds = checked
                    ? state.selectedSessionIds.concat(sessionId)
                    : state.selectedSessionIds.filter(function (id) { return id !== sessionId; });
                const errors = Object.assign({}, state.errors);
                delete errors.sessions;
                return { selectedSessionIds: selectedSessionIds, errors: errors, submissionError: "" };
            });
        }

        validateForm() {
            // Build field-specific messages first so invalid submissions keep the user's entries.
            const fullName = this.state.fullName.trim();
            const email = this.state.email.trim();
            const errors = {};

            if (fullName.split(/\s+/).filter(Boolean).length < 2) {
                errors.fullName = "Enter your first and last name.";
            }
            if (!emailPattern.test(email)) {
                errors.email = "Enter a valid email address (for example, name@example.com).";
            }
            if (!participationTypes.some(function (type) { return type.value === this.state.participationType; }, this)) {
                errors.participationType = "Choose in-person, virtual, or VIP participation.";
            }
            if (!this.state.selectedSessionIds.length) {
                errors.sessions = "Choose at least one conference session.";
            }

            this.setState({ errors: errors });

            if (Object.keys(errors).length) {
                const firstInvalid = Object.keys(errors)[0];
                window.setTimeout(function () {
                    const firstField = document.querySelector('[name="' + firstInvalid + '"]');
                    if (firstField) {
                        firstField.focus();
                    }
                }, 0);
                return null;
            }

            const selectedSessions = this.state.sessions
                .filter(function (session) { return this.state.selectedSessionIds.includes(session.id); }, this)
                .map(function (session) {
                    return { id: session.id, title: session.title, track: session.track, format: session.format };
                });

            return {
                fullName: fullName,
                email: email,
                participationType: this.state.participationType,
                selectedSessions: selectedSessions,
                submittedAt: new Date().toISOString()
            };
        }

        handleSubmit(event) {
            event.preventDefault();
            if (this.state.submitting || this.state.sessionsLoading) {
                return;
            }

            const payload = this.validateForm();
            if (!payload) {
                this.setState({ jsonPayload: null, confirmation: null });
                return;
            }

            this.setState({
                jsonPayload: payload,
                submitting: true,
                submissionError: "",
                confirmation: null
            });

            // Keep the generated JSON visible whether this request succeeds or fails.
            sendRegistration(payload)
                .done((result) => {
                    this.setState({ confirmation: result, submitting: false });
                })
                .fail((xhr, status, error) => {
                    const message = error instanceof Error
                        ? error.message
                        : (xhr && xhr.responseJSON && xhr.responseJSON.message) ||
                          (status === "timeout" ? "The registration request timed out." : "The registration API request failed. Check the endpoint and try again.");
                    this.setState({ submissionError: message, submitting: false });
                });
        }

        downloadJson() {
            if (!this.state.jsonPayload) {
                return;
            }

            const blob = new Blob([JSON.stringify(this.state.jsonPayload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "conference-registration.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }

        renderError(field) {
            const message = this.state.errors[field];
            return message ? h("div", { className: "invalid-feedback d-block", id: field + "Error" }, message) : null;
        }

        renderSession(session) {
            const selected = this.state.selectedSessionIds.includes(session.id);
            const sessionError = Boolean(this.state.errors.sessions);

            return h("label", {
                className: "session-option form-check d-flex gap-3 p-3 mb-2",
                key: session.id
            },
                h("input", {
                    className: "form-check-input",
                    type: "checkbox",
                    name: "sessions",
                    value: session.id,
                    checked: selected,
                    onChange: (event) => this.handleSessionToggle(session.id, event.target.checked),
                    "aria-invalid": String(sessionError),
                    "aria-describedby": sessionError ? "sessionsError" : undefined
                }),
                h("span", { className: "d-block" },
                    h("span", { className: "session-option-title d-block" }, session.title),
                    h("span", { className: "small text-secondary" },
                        [session.track, session.format, session.details].filter(Boolean).join(" · ")
                    )
                )
            );
        }

        renderJson() {
            if (!this.state.jsonPayload) {
                return null;
            }

            return h("section", { className: "json-card mt-4", "aria-labelledby": "jsonHeading" },
                h("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2" },
                    h("h3", { id: "jsonHeading", className: "h5 mb-0" }, "Generated registration JSON"),
                    h("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: this.downloadJson }, "Download JSON")
                ),
                h("pre", { className: "json-view registration-json", "data-testid": "registration-json" },
                    JSON.stringify(this.state.jsonPayload, null, 2)
                )
            );
        }

        renderConfirmation() {
            if (!this.state.confirmation) {
                return null;
            }

            const isMock = this.state.confirmation.mode === "mock";
            const selected = this.state.jsonPayload.selectedSessions;
            return h("section", { className: "alert alert-success confirmation-card mt-4", role: "status", "aria-labelledby": "confirmationHeading" },
                h("h2", { id: "confirmationHeading", className: "h4" }, "Registration confirmation"),
                h("p", null, isMock
                    ? "Demo completed: no API request was sent and no registration was saved."
                    : "Your registration was accepted by the configured registration API."),
                h("dl", { className: "row mb-0" },
                    h("dt", { className: "col-sm-3" }, "Attendee"),
                    h("dd", { className: "col-sm-9" }, this.state.jsonPayload.fullName),
                    h("dt", { className: "col-sm-3" }, "Email"),
                    h("dd", { className: "col-sm-9" }, this.state.jsonPayload.email),
                    h("dt", { className: "col-sm-3" }, "Participation"),
                    h("dd", { className: "col-sm-9 text-capitalize" }, this.state.jsonPayload.participationType.replace("-", " ")),
                    h("dt", { className: "col-sm-3" }, "Sessions"),
                    h("dd", { className: "col-sm-9" }, selected.map(function (session) { return session.title; }).join(", "))
                )
            );
        }

        render() {
            const fieldsDisabled = this.state.submitting || Boolean(this.state.confirmation);

            return h("div", null,
                h("section", { className: "card finalization-card", "aria-labelledby": "registrationHeading" },
                    h("div", { className: "card-body p-4 p-lg-5" },
                        h("h2", { id: "registrationHeading", className: "h3 mb-1" }, "Attendee details"),
                        h("p", { className: "text-secondary mb-4" }, "Complete each field, then review and download the generated JSON."),
                        h("form", { onSubmit: this.handleSubmit, noValidate: true },
                            h("div", { className: "row g-4" },
                                h("div", { className: "col-md-6" },
                                    h("label", { className: "form-label", htmlFor: "fullName" }, "Full name"),
                                    h("input", {
                                        className: "form-control" + (this.state.errors.fullName ? " is-invalid" : ""),
                                        id: "fullName", name: "fullName", type: "text", autoComplete: "name",
                                        maxLength: 100, required: true, value: this.state.fullName,
                                        onChange: this.handleChange, disabled: fieldsDisabled,
                                        "aria-invalid": String(Boolean(this.state.errors.fullName)),
                                        "aria-describedby": this.state.errors.fullName ? "fullNameError" : undefined
                                    }),
                                    this.renderError("fullName")
                                ),
                                h("div", { className: "col-md-6" },
                                    h("label", { className: "form-label", htmlFor: "email" }, "Email address"),
                                    h("input", {
                                        className: "form-control" + (this.state.errors.email ? " is-invalid" : ""),
                                        id: "email", name: "email", type: "email", autoComplete: "email",
                                        maxLength: 254, required: true, value: this.state.email,
                                        onChange: this.handleChange, disabled: fieldsDisabled,
                                        "aria-invalid": String(Boolean(this.state.errors.email)),
                                        "aria-describedby": this.state.errors.email ? "emailError" : undefined
                                    }),
                                    this.renderError("email")
                                ),
                                h("fieldset", { className: "col-12", disabled: fieldsDisabled },
                                    h("legend", { className: "form-label fs-6 mb-2" }, "Participation type"),
                                    h("div", { className: "row g-2" },
                                        participationTypes.map((type) =>
                                            h("div", { className: "col-md-4", key: type.value },
                                                h("label", {
                                                    className: "session-option form-check h-100 p-3",
                                                    htmlFor: "type-" + type.value
                                                },
                                                    h("input", {
                                                        className: "form-check-input me-2",
                                                        id: "type-" + type.value, name: "participationType",
                                                        type: "radio", value: type.value, required: true,
                                                        checked: this.state.participationType === type.value,
                                                        onChange: this.handleChange,
                                                        "aria-invalid": String(Boolean(this.state.errors.participationType)),
                                                        "aria-describedby": this.state.errors.participationType ? "participationTypeError" : undefined
                                                    }),
                                                    h("span", { className: "fw-bold" }, type.label),
                                                    h("span", { className: "d-block small text-secondary mt-1" }, type.detail)
                                                )
                                            )
                                        )
                                    ),
                                    this.renderError("participationType")
                                ),
                                h("fieldset", {
                                    className: "col-12", disabled: fieldsDisabled || this.state.sessionsLoading,
                                    "aria-describedby": this.state.errors.sessions ? "sessionsError" : undefined
                                },
                                    h("legend", { className: "form-label fs-6 mb-1" }, "Choose your conference sessions"),
                                    h("p", { className: "small text-secondary" }, "Select one or more sessions from the current conference schedule."),
                                    this.state.sessionsLoading
                                        ? h("div", { className: "alert alert-info py-2", role: "status" }, "Loading available sessions…")
                                        : null,
                                    this.state.sessionsError
                                        ? h("div", { className: "alert alert-danger py-2", role: "alert" }, this.state.sessionsError)
                                        : null,
                                    !this.state.sessionsLoading && !this.state.sessionsError
                                        ? h("div", null,
                                            h("label", { className: "visually-hidden", htmlFor: "sessionSearch" }, "Search sessions"),
                                            h("input", {
                                                className: "form-control mb-3", id: "sessionSearch", type: "search",
                                                placeholder: "Filter sessions by topic, track, or format…",
                                                value: this.state.searchTerm, onChange: this.handleSearch,
                                                disabled: fieldsDisabled
                                            }),
                                            this.state.filteredSessions.length
                                                ? this.state.filteredSessions.map((session) => this.renderSession(session))
                                                : h("p", { className: "text-secondary mb-0" }, "No sessions match that search. Clear the search to see all sessions.")
                                        )
                                        : null,
                                    this.renderError("sessions")
                                )
                            ),
                            this.state.submissionError
                                ? h("div", { className: "alert alert-danger mt-4 mb-0", role: "alert" }, this.state.submissionError)
                                : null,
                            h("button", {
                                type: "submit",
                                className: "btn btn-primary mt-4",
                                disabled: fieldsDisabled || this.state.sessionsLoading || Boolean(this.state.sessionsError)
                            }, this.state.submitting ? "Submitting…" : "Review and submit registration")
                        )
                    )
                ),
                this.renderJson(),
                this.renderConfirmation()
            );
        }
    }

    const rootElement = document.getElementById("registrationApp");
    updateServiceModeBanner();
    if (rootElement) {
        ReactDOM.createRoot(rootElement).render(h(FinalizationApp));
    }
}());
