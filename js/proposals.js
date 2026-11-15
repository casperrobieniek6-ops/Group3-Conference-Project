(function () {
    "use strict";

    const h = React.createElement;
    const categories = ["Application Security", "Cloud Security", "Governance", "Incident Response", "Threat Intelligence"];

    async function request(url, options) {
        const response = await fetch(url, options);
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || "The server could not complete the request.");
        }
        return payload;
    }

    function ProposalApp() {
        const [proposals, setProposals] = React.useState([]);
        const [form, setForm] = React.useState({ title: "", abstract: "", speaker: "", email: "", category: "", format: "" });
        const [filter, setFilter] = React.useState("all");
        const [message, setMessage] = React.useState("");
        const [error, setError] = React.useState("");
        const [busy, setBusy] = React.useState(false);

        const loadProposals = React.useCallback(async function () {
            try {
                const result = await request("/api/proposals");
                setProposals(result.proposals);
                setError("");
            } catch (loadError) {
                setError(loadError.message);
            }
        }, []);

        React.useEffect(function () { loadProposals(); }, [loadProposals]);

        function updateField(event) {
            setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
        }

        async function submitProposal(event) {
            event.preventDefault();
            setMessage("");
            setError("");
            setBusy(true);
            try {
                const result = await request("/api/proposals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form)
                });
                setProposals((current) => [result.proposal, ...current]);
                setForm({ title: "", abstract: "", speaker: "", email: "", category: "", format: "" });
                setMessage("Proposal submitted. Its status is pending moderator review.");
            } catch (submitError) {
                setError(submitError.message);
            } finally {
                setBusy(false);
            }
        }

        async function decide(id, status) {
            setBusy(true);
            setMessage("");
            setError("");
            try {
                const result = await request("/api/proposals/" + encodeURIComponent(id), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: status })
                });
                setProposals((current) => current.map((proposal) => proposal.id === id ? result.proposal : proposal));
            } catch (decisionError) {
                setError(decisionError.message);
            } finally {
                setBusy(false);
            }
        }

        const visibleProposals = proposals.filter((proposal) => filter === "all" || proposal.status === filter);
        return h("div", null,
            h("h2", { className: "h4 mb-3" }, "Submit a session"),
            h("form", { onSubmit: submitProposal, className: "mb-5" },
                h("div", { className: "row g-3" },
                    h("div", { className: "col-md-8" },
                        h("label", { className: "form-label", htmlFor: "proposalTitle" }, "Session title"),
                        h("input", { id: "proposalTitle", className: "form-control", name: "title", value: form.title, onChange: updateField, minLength: 5, maxLength: 120, required: true })
                    ),
                    h("div", { className: "col-md-4" },
                        h("label", { className: "form-label", htmlFor: "proposalSpeaker" }, "Speaker"),
                        h("input", { id: "proposalSpeaker", className: "form-control", name: "speaker", value: form.speaker, onChange: updateField, maxLength: 100, required: true })
                    ),
                    h("div", { className: "col-md-6" },
                        h("label", { className: "form-label", htmlFor: "proposalEmail" }, "Speaker email"),
                        h("input", { id: "proposalEmail", type: "email", className: "form-control", name: "email", value: form.email, onChange: updateField, maxLength: 254, required: true })
                    ),
                    h("div", { className: "col-md-3" },
                        h("label", { className: "form-label", htmlFor: "proposalCategory" }, "Category"),
                        h("select", { id: "proposalCategory", className: "form-select", name: "category", value: form.category, onChange: updateField, required: true },
                            h("option", { value: "" }, "Choose a category"),
                            categories.map((category) => h("option", { key: category, value: category }, category))
                        )
                    ),
                    h("div", { className: "col-md-3" },
                        h("label", { className: "form-label", htmlFor: "proposalFormat" }, "Format"),
                        h("select", { id: "proposalFormat", className: "form-select", name: "format", value: form.format, onChange: updateField, required: true },
                            h("option", { value: "" }, "Choose a format"),
                            ["Talk", "Workshop", "Panel"].map((format) => h("option", { key: format, value: format }, format))
                        )
                    ),
                    h("div", { className: "col-12" },
                        h("label", { className: "form-label", htmlFor: "proposalAbstract" }, "Abstract (30–3,000 characters)"),
                        h("textarea", { id: "proposalAbstract", className: "form-control", name: "abstract", value: form.abstract, onChange: updateField, minLength: 30, maxLength: 3000, rows: 5, required: true })
                    )
                ),
                h("button", { className: "btn btn-primary mt-3", type: "submit", disabled: busy }, busy ? "Please wait…" : "Submit proposal")
            ),
            message && h("div", { className: "alert alert-success", role: "status" }, message),
            error && h("div", { className: "alert alert-danger", role: "alert" }, error),
            h("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3" },
                h("h2", { className: "h4 mb-0" }, "Moderator review"),
                h("label", { className: "d-flex align-items-center gap-2" },
                    h("span", null, "Show"),
                    h("select", { className: "form-select w-auto", value: filter, onChange: (event) => setFilter(event.target.value), "aria-label": "Filter proposals by status" },
                        ["all", "pending", "approved", "rejected"].map((status) => h("option", { key: status, value: status }, status === "all" ? "All statuses" : status))
                    )
                )
            ),
            visibleProposals.length === 0
                ? h("p", { className: "text-secondary" }, "No proposals to display.")
                : h("div", { className: "row g-3" }, visibleProposals.map((proposal) =>
                    h("div", { className: "col-12", key: proposal.id },
                        h("article", { className: "proposal-card p-3 p-md-4" },
                            h("div", { className: "d-flex flex-wrap justify-content-between gap-2" },
                                h("h3", { className: "h5 mb-1" }, proposal.title),
                                h("span", { className: "badge " + (proposal.status === "approved" ? "text-bg-success" : proposal.status === "rejected" ? "text-bg-danger" : "text-bg-warning") }, proposal.status)
                            ),
                            h("p", { className: "small text-secondary mb-2" }, proposal.category + " · " + proposal.format + " · " + proposal.speaker + " · " + proposal.email),
                            h("p", { className: "mb-3" }, proposal.abstract),
                            proposal.status === "pending" && h("div", { className: "d-flex flex-wrap gap-2" },
                                h("button", { className: "btn btn-success", type: "button", disabled: busy, onClick: () => decide(proposal.id, "approved") }, "Approve"),
                                h("button", { className: "btn btn-outline-danger", type: "button", disabled: busy, onClick: () => decide(proposal.id, "rejected") }, "Reject")
                            )
                        )
                    )
                ))
        );
    }

    ReactDOM.createRoot(document.getElementById("proposalApp")).render(h(ProposalApp));
}());
