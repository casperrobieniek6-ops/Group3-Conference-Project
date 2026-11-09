# Finalization Page — Code Outline

> Read-only reference documenting the registration finalization page. This document does not change the application's behavior.

## Purpose

The Finalization page collects attendee details, participation type, and one or more conference sessions. It validates the form, displays a preview of the validated registration JSON, and sends that JSON asynchronously to a configurable REST endpoint. The default configuration is a clearly labeled local demonstration; it does not send a request or save a registration. The page uses React for form state, jQuery for session data loading/filtering and AJAX, and the site's existing Bootstrap and shared styles.

## Files and code sections

### `finalization.html` — Page structure and dependencies

- **Navigation:** Provides links to Home, Storefront, Register, Finalize, Store Manager, and Cart.
- **Page introduction:** Presents the session selection and registration finalization flow.
- **Service-mode banner:** `#serviceModeBanner` identifies whether the page is in demonstration mode, live API mode, or unavailable due to missing configuration.
- **React mount point:** `#registrationApp` receives the form rendered by React.
- **Dependencies:** Loads Bootstrap, the shared stylesheet `css/styles.css`, local jQuery 3.7.1, React 18 and ReactDOM from their CDNs, the service configuration, and `js/finalization.js`.

### `js/finalization.js` — Form, validation, sessions, and submission

- **Service banner:** `updateServiceModeBanner()` displays the configured service mode so a local demonstration cannot be mistaken for a real API submission.
- **Session data normalization:** `normalizeSessions()` adapts the existing fields in `sessions.json` into session IDs, titles, tracks, formats, and details.
- **Service transport:** `sendRegistration()` uses jQuery `$.ajax()` to POST JSON when an endpoint is configured. With no endpoint and `demoMode: true`, it performs only a short asynchronous UI demonstration. With no endpoint and demo mode disabled, it returns an error.
- **React state:** `FinalizationApp` stores name, email, participation type, selected session IDs, search text, sessions, validation errors, generated JSON, submission state, and confirmation data.
- **Session loading and filtering:** On mount, jQuery `$.getJSON()` loads `sessions.json`. The session search filters by ID, title, track, format, and details.
- **Form validation:** `validateForm()` requires a first and last name, a valid email address, one of the supported participation types, and at least one selected session. Field-specific feedback is displayed without clearing entered values.
- **JSON generation:** A successful validation builds a registration object with attendee details, selected session records, and a submission timestamp. `renderJson()` displays formatted JSON; `downloadJson()` downloads it as `conference-registration.json`.
- **Submission and errors:** `handleSubmit()` prevents duplicate submissions, shows loading state, and retains the generated JSON on submission failure. API errors are displayed while preserving form values.
- **Confirmation:** `renderConfirmation()` displays an attendee and session summary after success and explicitly distinguishes a local demo from a successful API response.

### `js/registration-config.js` — Configurable service settings

- `endpoint` — REST API URL for JSON POST requests; empty by default.
- `demoMode` — Enables the labeled asynchronous demonstration only when no endpoint is configured.
- `mockDelayMs` — Controls the demonstration loading delay.

To use a real API, set `endpoint` to its POST URL and set `demoMode` to `false`. The endpoint must accept JSON and return a JSON response.

### `sessions.json` — Available session data

The Finalization page uses the existing top-level `sessions` collection and adapts its fields:

- `productId` — session identifier
- `description` — session title
- `category` — session track
- `unitOfMeasure` — session format
- `additionalInfo` — optional room, duration, or other details

### `css/styles.css` — Shared and finalization styling

The finalization page uses the shared site stylesheet for its page-specific hero, service banner, form card, session choices, JSON preview, confirmation, and small-screen adjustments. No separate finalization stylesheet is required.

### `index.html`, `signup.html`, `sessions.html`, and `cart.html` — Navigation

The new Finalize link is included in the shared navigation on these pages. The homepage also links directly to the finalization flow from its hero and storefront sections.

## Data flow

1. React renders the form and jQuery asynchronously loads the session list from `sessions.json`.
2. The user searches the loaded session data and selects one or more sessions.
3. Form submission validates all required values and preserves them if validation fails.
4. On valid input, the page creates and displays the registration JSON.
5. If a REST endpoint is configured, jQuery sends the JSON by POST and the page displays success or an actionable error. If not, the explicitly labeled demo completes without a network request or saved record.
6. After a successful API response or demonstration, the page displays the registration summary.

## Scope note

No registration backend is included in the project. The default demonstration is not a real registration or API success. The page relies on CDN-hosted React and Bootstrap and should be served over HTTP (for example, with `python -m http.server 8000`) so the browser can load `sessions.json`.
