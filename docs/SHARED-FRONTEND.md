# Shared business assistant frontend

Implementation status (2026-10-27): shared source and local module delivery are
implemented. Production packaging and browser acceptance remain pending. PixelCore
retains a temporary legacy mode until those cutover gates pass.

Smokey owns the React dashboard, report views, AI connection forms, appearance,
usage, mascot and chat surfaces. Standalone and host mode use the same feature
components and one request controller per active workspace. PixelCore supplies
its login, current business, permissions, navigation and resolved theme through a
small adapter. There is no iframe.

## Local development

Keep the sibling repository names `SmokeyChatbot` and `pixelcore-platform`, or adapt
the Compose source mounts. PixelCore's backend/worker/beat and encryption setup
are prerequisites; see [installation](PIXELCORE-INTEGRATION.md).

Standalone dashboard, from `SmokeyChatbot/dashboard`:

```bash
npm ci
npm run dev
```

Open [Smokey](http://localhost:5173). Its independent login uses the existing
PixelCore business account. `/business-api/` proxies the backend, including an
isolated refresh-cookie path. Website chatbot management remains at `/websites`
and uses its separate backend on port 8001.

From `pixelcore-platform`, start the optional module service:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.smokey-ui.yml up -d --no-build smokey-ui
```

The default image is Node 24. `SMOKEY_UI_NODE_IMAGE` can select an existing compatible
Node runtime image. The service installs locked development dependencies into a
separate volume and serves port 5174 on the internal network. It does not replace
PixelCore's frontend service. Recreate that service after changing its environment
or adding the initial proxy configuration:

```bash
docker compose up -d --no-build --force-recreate frontend nginx
```

PixelCore's development override defaults to `module` / `development`. An explicit
root environment setting overrides it. Open
[PixelCore Smokey](http://localhost/workspace/smokey). The seven existing Smokey
routes now attach the same React runtime to an owned Shadow DOM container. The
lower-right mascot and toolbar **Ask Smokey** button operate its shared drawer or
saved modal preference. Closing preserves the draft/request; Stop requests server
cancellation. Business/account/permission changes clear private local state.

The runtime's dev entry is `/smokey-assets/dev/src/sdk/devEntry.ts`; it is a module,
not a separate dashboard login page. Nginx proxies it to the optional service, and
Nuxt bridges that same path for direct port 3001 access. HMR uses the Nginx
WebSocket endpoint on port 80. Source UI edits normally update both running
experiences; changing dependencies/configuration can require a service restart.

Stop only the optional module service:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.smokey-ui.yml stop smokey-ui
```

An absent module service produces a retryable Smokey error while PixelCore remains
available. There is no automatic second chat mounted as a fallback.

## Host boundary

`dashboard/src/sdk/contracts.ts` defines adapter/API version 1.0. The module calls
21 named operations rather than supplying HTTP URLs or authorization headers.
Every request captures `{hostId, organizationId, actorId, revision}`. Host adapters
check that identity before dispatch and after completion; the runtime also fences
capability changes and aborts pending work. Backends must enforce permissions and
scope every request independently. Never pass provider keys or access tokens to
`mountSmokey` or put them in public environment variables.

The persistent owner lives outside route content. `attachDashboard` / `detachDashboard`
only change dashboard placement. `destroy` is idempotent and clears polling,
requests, private assets and owned nodes. One runtime owns a single current
request/draft; this is not persistent multi-conversation history. Reloading does
not resubmit a paid job. Lost creation responses recover with the original
idempotency key; other uncertain mutations require an explicit decision.

Standalone transport lives in `hosts/pixelcore/standaloneAdapter.ts`. PixelCore's
Vue app has its own thin transport adapter in `utils/smokeyHostAdapter.js`.
`hosts/example/memoryAdapter.ts` demonstrates an unrelated host without real data.
Medframe can implement the contract and server-side domain resolver later; its
actual authentication, records and reports are not included here.

## Styling and trust

`styles/shared.css` is the single source for both dashboards’ theme tokens,
control rules and mascot motion. Document and module wrappers provide their own
root baseline. In embedded mode, Tailwind/shadcn styles and canonical overlay
portals stay inside owned Shadow DOM
surfaces. Embedded light/dark follows PixelCore; standalone retains Light/Dark/System.
Floating offsets include safe-area insets and an optional host bottom offset.
Hosts should suppress Smokey while their own modal is open; PixelCore observes
canonical open dialog elements for this purpose.

Shadow DOM contains styles; the script has the host page's privileges. Serve only
trusted releases. Production needs same-origin script, style, image and font
assets; private mascot previews require `img-src blob:`. Allow the UI's inline
style attributes under the host CSP (for example `style-src-attr 'unsafe-inline'`).
Development additionally needs Vite's inline stylesheet/refresh support and its
WebSocket connection. A stricter nonce-based policy needs a corresponding host/SDK
extension before deployment. The real keyboard, portal, font and focus behavior
across Shadow DOM still needs the explicitly gated browser acceptance pass.

See [release and rollback](SHARED-FRONTEND-RELEASES.md),
[verification](SHARED-FRONTEND-VERIFICATION.md), and the
[approved plan](superpowers/plans/2026-10-27-smokey-shared-frontend.md).
