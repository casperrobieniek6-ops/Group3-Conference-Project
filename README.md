# CyberSec Summit 2026

## Run the site

The site is static and uses the existing Bootstrap and jQuery files plus React from its CDN. From the project folder, start a local web server:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/` for the homepage or `http://localhost:8000/finalization.html` for the session-based registration flow. Serving the files over HTTP is required for the session JSON request; opening the HTML directly as a `file://` URL may block it.

## Registration finalization

The finalization page loads session options from `sessions.json`. Its registration form validates attendee details and at least one session selection, previews the generated `conference-registration.json` data, and supports downloading that JSON.

By default, `js/registration-config.js` has an empty `endpoint` and `demoMode: true`. This intentionally displays a local demonstration confirmation and does **not** make an API request or save a registration. To connect a REST service, set `endpoint` to its POST URL and set `demoMode` to `false`. The endpoint must accept JSON and return a JSON response; API failures are shown in the form and can be retried without losing entered information.
