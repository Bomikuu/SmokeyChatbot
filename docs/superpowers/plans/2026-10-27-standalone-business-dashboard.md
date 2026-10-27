# Standalone business dashboard extension

Extend the approved Smokey business assistant design at the user's explicit request. Native React screens manage the same business-scoped assistant settings, encrypted provider connections, generation jobs, saved reports and usage as PixelCore. The main standalone login uses host account authentication; existing website chatbots remain at `/websites` with their separate legacy owner authentication.

## Implementation

1. Add a same-origin `/business-api` proxy to PixelCore. Rewrite refresh-cookie paths to isolate the standalone session. Keep access tokens in memory; retain host-side permission checks. Configure the existing website API independently on port 8001.
2. Add typed business API services and reusable async-state, business selection, authentication and generation hooks. Retain idempotency across uncertain requests; guard stale responses and stop polling on unmount/business changes.
3. Implement business navigation, Overview/enable, Assistant, saved reports/details/pagination, AI connection CRUD/discovery/check/default, mascot/presentation settings and usage/limits using the existing official shadcn layer. Share mascot feedback and theme preference.
4. Create a new local non-superuser administrator account with a generated password and membership in the existing local businesses. Do not reset existing accounts or copy provider secrets to the browser.
5. Run focused TypeScript/static and programmatic HTTP checks (no builds or browser inspection). Start Vite on 5173, verify login, session restoration/logout, allowed business data, private asset/API routing and denied unauthenticated access. Never make paid provider calls during verification.

## Canonical UI owners

Select/Listbox: shared shadcn Select. Form fields: Field + Input/Textarea and server validation. Tables: generated shadcn Table. Overlays: generated Dialog/Sheet and existing AlertDialog. Feedback: Notice/MascotStatus. Themes/scrollbars: existing ThemeProvider and index.css. Business API data/auth/CRUD remain owned by the host API. Calendar dates use native date inputs with business timezone shown. Delete confirmations name the affected object and preserve usage records.

Existing local changes in both repositories must be retained. Standalone credentials are provided only to the requesting user and never committed into source or documentation.

## Execution record

Implemented the native React dashboard and isolated host-session proxy. The main
login is served on port 5173; existing website management is preserved at
`/websites`. A new local administrator account was provisioned for the existing
active businesses without superuser/staff access or changes to existing passwords.
Account secrets are stored outside the repository with mode 0600 and supplied to
the requesting user; they are intentionally absent from this document.

Verification completed: TypeScript checks, formatting, git whitespace checks,
seven focused React server-render checks, programmatic HTTP login, HttpOnly cookie
path isolation, business memberships/permissions, settings/connections/reports/
usage/private asset reads, refresh, logout and unauthenticated rejection. PixelCore's
UI boundary check passed. The scoped Impeccable detector returned no findings.
No production builds, browser/visual inspections, test suites or paid provider
calls were run for this extension. Live model output remains dependent on the
business adding a provider key, checking its selected model and setting a default.

The local Vite development process was started for immediate user access. Product
changes remain uncommitted alongside preserved existing work.
