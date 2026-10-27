# Installing Smokey in PixelCore

Smokey's reusable Django package is `python/smokey_assistant`. It has no dependency
on PixelCore models. PixelCore owns authentication, business permissions, report
queries and Celery dispatch. Public website chat remains a separate boundary and
cannot retrieve internal business reports.

## Runtime setup

Install the package in the host's environment:

```sh
pip install /path/to/SmokeyChatbot/python
```

For development, PixelCore can instead load `SMOKEY_ROOT/python`, or the explicit
`SMOKEY_PYTHON_PATH`. Its Compose services mount the sibling source at
`/smokey-python`; restart affected services after changing Compose configuration.
No runtime package downloads or service API-key fallback take place.

Set `SMOKEY_ENCRYPTION_KEYS` to a comma-separated list of Fernet encryption keys.
Generate a key locally with `python -c 'from cryptography.fernet import Fernet;
print(Fernet.generate_key().decode())'`. Store it in the deployment secret store,
not source control. The first key encrypts new credentials; retain old keys in the
list until all existing encrypted connections have been rotated or replaced.
Do not use Django's signing key as an implicit encryption fallback.

Run the host migrations for `businesses` and `smokey_assistant`, and restart its
Celery worker/beat processes after installing or updating the package. A running
worker is required for generation. The host registers a five-minute recovery task;
requests abandoned for ten minutes become explicit failures without automatic AI
retries. PostgreSQL is required for production quota/worker locking guarantees.

## Standalone dashboard

With PixelCore's backend and workers running, start `npm run dev` in `dashboard/`
and open `http://localhost:5173`. Sign in with a host business account that has an
active owner, administrator or manager membership. All business settings, provider
connections, reports and usage are shared with the PixelCore integration.

The development server proxies `/business-api` to PixelCore on port 8000 and
rewrites the refresh cookie to `/business-api/auth/`. Access tokens live in memory;
refresh cookies are HttpOnly. Production hosting needs the same authenticated
proxy/path rewrite over HTTPS. `dashboard/.env.example` documents local origin
configuration. Legacy website owner management stays at `/websites` and proxies
to its separate Django service on port 8001.

## Business setup

1. Open the standalone Smokey dashboard (or **Smokey** in PixelCore), select the
   business and enable the capability.
2. In **AI connections**, enter the provider key and use **Load provider models**
   to choose a model before saving a named connection. The catalog call does not
   persist the key or create a connection.
   The selected model must be in the connection's permitted-model list.
3. Browse the provider's model catalog if needed; save and explicitly check the
   connection. Checks make a small structured-generation call and may cost tokens.
4. Select the verified connection as the default.
5. In **Appearance**, select Smokey, a custom PNG/WebP/static/sprite mascot or a
   standard icon, then choose a drawer or modal.
6. Set limits under **Usage** and ask for a daily, sales, attendance or late report.

Owners/admins configure the assistant and delete reports. Managers can generate
and read reports. Staff, device sessions and public website IDs cannot access
internal report endpoints. Every request and saved report is business-scoped.

## Host contract

The host provides `HostContext(tenant_id, actor_id, timezone, permissions)` and
fresh authorization for `configure`, `generate`, `view_reports` and `delete_reports`.
`resolve_report(context, plan)` returns `ResolvedReport(facts, detail_rows)` with
server-computed metrics, provider-safe previews and separate immutable details.
`run_generation(request_id, resolve_context, resolve_report)` never executes model
code or arbitrary tools. HTTP views are host-native and retain host JWT/CSRF rules.

Provider adapters are OpenAI, Anthropic, Gemini and OpenRouter. Model catalogs are
candidates; readiness is verified against a specific credential/model revision.
See [provider contracts](PROVIDERS.md) for official documentation references.

## Usage, cancellation and privacy

AI calls include interpretation, summaries and connection checks. Limits apply to
calls and token reservations by business local day/month. Unknown token counts
remain unknown, and potentially spent reservations are retained. Displayed usage
is application accounting, not an exact provider invoice or remaining balance.

Stop prevents a later summary from being published. An already-running provider
call may still consume tokens. Reopening saved reports costs no AI usage;
regeneration and explicit retries can cost additional usage. Network recovery
reuses the original idempotency key to avoid duplicate calls.

Reports preserve factual snapshots. Detail previews contain at most 100 rows;
up to 10,000 detail rows per table are persisted and paginated. Truncation is
explicit, and aggregates cover all qualifying records. Attendance reasons,
employee documents and contact details are excluded from provider input.

Disabling the business capability immediately rejects new API access and queued
work when authorization is rechecked. It does not delete reports or usage. Before
uninstalling the package, disable business capabilities, stop assistant jobs and
retain database/encryption-key backups. Package absence does not break unrelated
host routes; reinstalling restores access to retained data after authorization.

## Verification boundaries

Use PixelCore's focused integration tests with mocked provider calls and an
isolated test database. The standalone repository's policy permits type/static
checks but requires explicit user requests for suites/builds. No live provider
availability, production asset build or browser appearance is certified by mocked
tests. Do not run application builds or browser/visual checks without permission.

The standalone dashboard retains Instrument Sans from its established design brief;
the design detector's generic font warning does not authorize changing that
identity. The broad Premium audit also flags pre-existing form validation and
misidentifies authored shadcn Select wrappers as native controls. These are recorded
as static-audit limitations rather than claims of a clean product-wide audit.


## Shared native frontend

PixelCore development now loads the same dashboard and assistant components as
standalone Smokey. The Vue app retains only the loader, operation adapter, route
containers and toolbar trigger in module mode. It does not use an iframe. The
lower-right mascot and toolbar toggle share one request/draft with the full page.

Start the optional `docker-compose.smokey-ui.yml` service and use
`/workspace/smokey`; standalone login remains on port 5173. See
[exact local commands](SHARED-FRONTEND.md) and
[release / rollback configuration](SHARED-FRONTEND-RELEASES.md).
Production retains explicit legacy mode until the real build/browser acceptance
and final duplicate-code cleanup gates pass. No credentials or report data are
migrated for this frontend change.
