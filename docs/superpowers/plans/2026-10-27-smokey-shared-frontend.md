# Smokey Shared Frontend Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maintain one Smokey dashboard and assistant interface for standalone use and direct integration into PixelCore, including a floating mascot and shared chat drawer.

**Architecture:** Extract a framework-independent adapter contract and a single React assistant runtime from the existing standalone business dashboard. PixelCore loads a trusted, versioned ESM release and supplies authentication, business context and navigation through a thin adapter; all feature UI stays in Smokey. Shadow DOM contains styles, and one persistent React tree/controller drives dashboard portals, the mascot and chat overlays.

**Tech Stack:** Existing React 19, TypeScript, Tailwind CSS v4, official generated shadcn/Radix, Vite 7; PixelCore Nuxt 3/Vue 3, Django 5.2 and the installed `smokey_assistant` package; Nginx/Compose for asset delivery.

**Spec:** [Shared frontend design](../specs/2026-10-27-smokey-shared-frontend-design.md)

**Execution:** The user's existing preference is native implementation in this session. The subsequent user instruction “proceed” authorized implementation. Shared source/local integration and permitted checks are complete; production cutover remains gated. Do not ask the user to choose an execution method again.

## Global Constraints

- The integrated experience uses no iframe and duplicates no Smokey feature screens in Vue.
- Ordinary compatible UI changes are authored and released only from Smokey.
- Retain 15-second request timeouts and 1.5-second sequential polling.
- No shared mutable transport/token singleton is used by injected runtimes.
- The backend remains the authority and rechecks every business operation.
- No automatic paid resubmission occurs on remount, refresh or module release changes.
- Shadow DOM is style containment, not a security boundary.
- Standalone retains Light/Dark/System selection; embedded mode follows the host's resolved light/dark theme.
- Default floating offsets: 24 px plus safe-area insets; below 640 px use 16 px; target at least 48 x 48 px.
- Existing modal settings remain valid; drawer is the default for new users, with a 28 rem desktop maximum and full viewport width below 640 px.
- Preserve existing accounts, encrypted connections, reports, quotas, Python migrations, legacy website management and unrelated local edits.
- Maintain arrow functions in Smokey JavaScript/TypeScript and the canonical shadcn layers in both repositories.
- No production build, standalone test suite, browser-based/visual inspection or paid provider call was authorized for routine implementation verification.
- PixelCore frontend changes require `npm run check:ui`. Documentation-only planning requires no application tests/builds.
- `/home/bomiku1/projects/dineEase-web` is protected and must not be modified.

## Review Focus

1. A slow business A response arrives after switching to business B: no A settings, report, asset or error may render in B. Pinned by Tasks 1 and 6.
2. The user closes chat, changes route, opens it from another trigger, or loses a creation response: preserve draft/current identity and never create a second paid job. Pinned by Tasks 1, 2 and 4.
3. A Shadow DOM dropdown or drawer opens while a host dialog exists: keyboard focus, scroll locks, dismiss and restoration must remain correct. Pinned structurally by Tasks 3/7; browser acceptance remains an explicit gated check.
4. A deployed manifest is malformed, unavailable, cached or incompatible: leave PixelCore usable, import no untrusted path, and never replace an active runtime mid-request. Pinned by Tasks 5 and 8.
5. A host disables Smokey, removes a membership or logs out while requests/uploads are pending: clear private local state, stop polling and reject stale callbacks without pretending the remote paid job was cancelled. Pinned by Tasks 1, 6 and 7.

---

## Working rules and file ownership

Use `/home/micxsz/projects/SmokeyChatbot` as **S** and
`/home/micxsz/projects/pixelcore-platform` as **P** below. All paths are relative to
the stated root. Read both AGENTS.md files and the spec before each execution
phase; use Jev with secret-free state and Graphify/direct source inspection in P.
The graph snapshot does not cover the new business UI.

Both checkouts already contain substantial uncommitted work. Inventory existing
staged and unstaged files before editing; never reset, broadly stage, or commit
another task's edits. Each task is a reviewable checkpoint; commit only explicit
owned paths when a commit is appropriate, never `git add .`. Native execution
should stay in the existing user-authorized checkout unless isolation is needed.

Focused validation scripts in S use existing Vite/TypeScript plus Node assertions;
they exercise contracts and asynchronous behavior, not mirrored button markup or
a new general test runner. Add `check:assistant` to run only these scripts. P may
add targeted Node and Django tests under its existing verification policy. Any
build/browser commands later in this plan are conditional release gates, not
authorization to run them now.

## Task 1: Define the contract and extract a scoped assistant client/controller

**Files**
- Create S `dashboard/src/types/assistant.ts`, `dashboard/src/sdk/contracts.ts`, `dashboard/src/sdk/errors.ts`.
- Create S `dashboard/src/sdk/client.ts`, `dashboard/src/sdk/requestController.ts`.
- Modify S `dashboard/src/api/business.ts`, `dashboard/src/features/business/hooks.ts`.
- Create S `dashboard/scripts/check-assistant-contract.mjs`, `check-assistant-runtime.mjs`.
- Modify S `dashboard/package.json` with `check:assistant` for the focused checks.

**Interfaces**
- Consumes: the complete version-1 interfaces and operation list in spec §4.
- Produces: `createAssistantClient(adapter: SmokeyHostAdapter, getContext: () => SmokeyContext): AssistantClient`. Its `request<T>(operation, params?, body?, options?)` takes an operation from the spec, typed operation parameters/body, and `{ idempotencyKey?, signal? }`; `start(prompt, plan, idempotencyKey)`, `poll(generationId)` and `stop(generationId)` return the existing Generation DTO. Each dispatch captures its identity; wrapper methods must delegate through this one request boundary.
- Produces: `createRequestController(client: AssistantClient): RequestController` with `getSnapshot`, `subscribe`, `setDraft`, `submit(prompt, plan?)`, `recover`, `stop`, `reset(context)` and `destroy`.
- `RequestSnapshot` contains draft, generation data, interrupted message, busy state and the original request identity/idempotency key. Only `stop` asks the server to cancel.
- Produces: `SmokeyAdapterError` with code/message/status/retryable and distinct `STALE_CONTEXT` / `ABORTED` handling.

- [x] **Step 1:** Write focused assertions with a controllable fake adapter: a delayed A response after `reset(B)` is discarded; `destroy()` prevents publication and clears timers/assets; one generation polls sequentially at 1500 ms; recover after a lost creation response sends the same idempotency key; Stop during an uncertain creation resolves/cancels that same request. Reject a second submission while one is unresolved.
- [x] **Step 2:** Run `node scripts/check-assistant-contract.mjs` and `node scripts/check-assistant-runtime.mjs` from S/dashboard; record the expected missing-contract/controller failure before extraction.
- [x] **Step 3:** Move shared DTOs out of PixelCore-specific `business.ts`; implement the spec's exact types, normalized errors and client. Move state from hook-local storage to the imperative controller. Keep polling/read failure separate from server terminal failure; treat ambiguous POST failures as recoverable without a new key. Bound prompt size to the existing 4000-character API contract.
- [x] **Step 4:** Add negative assertions for forbidden/unknown operations, binary and void responses, explicit cancellation failure, theme-only context updates preserving state, and permission/identity changes clearing state. Ensure there is no embedded auth refresh, bare URL request, provider credential logging or persistent prompt storage.
- [x] **Step 5:** Run the two focused scripts and `npm run typecheck`; pass means the contract cases hold and no TypeScript error remains. Review this extraction independently before touching host integration.

## Task 2: Make the React dashboard consume the shared runtime

**Files**
- Create S `dashboard/src/sdk/runtimeStore.ts`, `dashboard/src/sdk/RuntimeProvider.tsx`.
- Create S `dashboard/src/features/business/BusinessDashboard.tsx`, `DashboardNavigation.tsx`.
- Create S `dashboard/src/hosts/pixelcore/standaloneAdapter.ts`, `operations.ts`.
- Modify S `dashboard/src/features/business/{BusinessApp,BusinessWorkspace,BusinessConversation,BusinessConnections,BusinessAppearance,BusinessUsage,BusinessReports,BusinessFeedback}.tsx` and `dashboard/src/features/business/hooks.ts`.
- Modify S `dashboard/src/api/business.ts`, `dashboard/src/App.tsx` only for standalone orchestration.
- Extend S `dashboard/scripts/check-assistant-runtime.mjs` and create `check-assistant-render.mjs`.

**Interfaces**
- Consumes: Task 1 client/controller/types.
- Produces: `createAssistantRuntime(adapter, initialContext): AssistantRuntimeStore`, the single owner of context, route, client, controller, settings and private asset lifecycle. The store exposes `getSnapshot()`, `subscribe(listener): () => void`, `updateContext(context)`, `setRoute(route)`, `refreshSettings(): Promise<void>`, `getClient()`, `getController()` and `destroy()`. Its snapshot contains context, route, settings, loading and normalized error; Task 5 adds the DOM surface handle without creating another store.
- Produces: `AssistantRuntimeProvider({ runtime, children })` and `useAssistantRuntime()`.
- Produces: `BusinessDashboard({ route, chrome: 'standalone' | 'host' })` and one `DashboardNavigation` driven by the shared section list.
- Produces: `createPixelCoreStandaloneAdapter(sessionTransport, sourceOrigin): SmokeyHostAdapter`; standalone authentication/refresh remains in the shell transport, never the generic UI.

- [x] **Step 1:** Add a focused two-subscriber check: dashboard and drawer observe the same request/draft and creating/detaching a dashboard surface does not submit or reset it. A fake host with a non-PixelCore host ID can render the generic dashboard without importing PixelCore auth.
- [ ] **Step 2:** Run those checks to establish failure under the current hook-local implementation.
- [x] **Step 3:** Split the oversized workspace into standalone chrome and shared business feature surface. Inject the client/runtime into every feature component. Remove hardcoded `/business-api`, `VITE_PIXELCORE_URL`, `/workspace/...` and token/event globals from shared components; keep those in the standalone adapter or route resolver.
- [x] **Step 4:** Move composer draft state into the controller and route navigation into `adapter.navigate`. Use `resolveSourceLink` for semantic source anchors. Keep provider credentials in form memory only, clearing them on save, tenant change and unmount. Filter suggestions/report kinds using the host capability list; unsupported data must be described as unavailable, never fabricated. Preserve model discovery, connection checks/default selection, custom assets, usage filters/limits, immutable report details and regeneration's explicit report plan.
- [x] **Step 5:** Add focused server-render checks for all six sections and disabled/manager configurations. Run `npm run check:assistant` and `npm run typecheck`. Confirm `/websites` still selects the legacy owner app and standalone refresh cookies retain their existing isolated path.

## Task 3: Isolate styles, theme and overlay ownership

**Files**
- Create S `dashboard/src/sdk/OverlayProvider.tsx`, `surface.ts`, `assets.ts`.
- Create S `dashboard/src/styles/assistant.css`, `document.css`; modify `dashboard/src/index.css` to compose standalone document styles.
- Modify S `dashboard/src/features/theme/ThemeProvider.tsx` and `dashboard/src/features/business/BusinessFeedback.tsx`.
- Modify S `dashboard/src/components/ui/{dialog,sheet,select,alert-dialog}.tsx` through a shared portal-container context.
- Extend S `dashboard/scripts/check-assistant-render.mjs`; create `check-assistant-surfaces.mjs`.

**Interfaces**
- Consumes: Task 2 runtime and resolved context theme.
- Produces: `createSmokeySurface(host: HTMLElement, stylesheetUrl: string): SmokeySurface` with shadow root, content and portal containers, theme update and idempotent destroy.
- Produces: `OverlayProvider({ container, children })`; canonical portal primitives consume its container instead of defaulting to `document.body` in module mode.
- Produces: `resolveAssistantAsset(relativePath, assetsBaseUrl): string` and an embedded controlled-theme provider which never changes document theme/storage.

- [x] **Step 1:** Write focused assertions that module CSS has no document-wide body/html/control selector effect, URLs resolve under the configured asset base, two owned surfaces receive their own portal/theme containers, and destroy removes only owned styles/nodes. This is structural evidence, not keyboard evidence.
- [x] **Step 2:** Implement the shared surface and stylesheet split. Convert module root tokens to `:host`/owned roots; include local font/sprite assets. Preserve existing standalone white/cobalt typography and theme behavior. Define one scrollbar/caret/selection baseline inside the module.
- [x] **Step 3:** Extend existing shadcn wrappers once for custom portal containers. Keep overlays in the shared React tree; do not create per-feature document-body portals or global style resets. Restore scroll/focus cleanup on teardown, including host-overlay suppression.
- [x] **Step 4:** Run the focused surface/render scripts and `npm run typecheck`. Verify the changed UI with the scoped Impeccable detector once at the end of UI work. Retain the existing visual identity rather than treating a generic font warning as permission to redesign.
- [ ] **Step 5 — deferred browser gate:** Only after an explicit browser-verification request, check Tab/Shift+Tab, Escape, outside clicks, Select inside drawer, nested delete confirmation, scroll locks and focus restoration in light/dark/reduced-motion/mobile conditions. A failure blocks release acceptance; do not certify this from static checks.

## Task 4: Add the floating mascot and unified chat surfaces

**Files**
- Create S `dashboard/src/features/assistant/FloatingLauncher.tsx`, `AssistantSurface.tsx`, `AssistantControls.tsx`.
- Modify S `dashboard/src/features/business/BusinessConversation.tsx`, `BusinessAppearance.tsx`, `BusinessWorkspace.tsx`, `BusinessFeedback.tsx` to consume the shared surface/controller.
- Extend S `dashboard/scripts/check-assistant-runtime.mjs`, `check-assistant-render.mjs`.

**Interfaces**
- Consumes: runtime/provider from Task 2 and surfaces/overlay context from Task 3.
- Produces: one `AssistantControls` instance for floating launcher and drawer/modal; controlled `open/close/toggle` actions preserve controller state.
- Produces: runtime events for open/close, plus an assistant-page focus request when a full composer is already visible.

- [x] **Step 1:** Add assertions: mascot and toolbar target one controller; closing preserves unsent draft/current generation; switching from full page to overlay keeps the request; reopening issues no POST; host-overlay suppression hides controls without cancelling work; business reset clears both views.
- [x] **Step 2:** Implement the lower-right launcher with 24 px desktop / 16 px below 640 px plus safe-area offsets and at least a 48 px target. Use the selected mascot/static asset/standard fallback and truthful status text. Respect reduced motion and host bottom toolbar offsets. Do not add roaming/dragging.
- [x] **Step 3:** Implement the 28 rem maximum right drawer, full width below 640 px, with the existing saved modal alternative. Hide the launcher while open. Give triggers the spec's names/aria-expanded association; close restores the original connected trigger or the registered toolbar fallback. The full Assistant page receives focus rather than opening a duplicate chat.
- [x] **Step 4:** Run focused controller/render checks and typecheck. Record mobile geometry and keyboard behavior as awaiting the Task 3 browser gate until explicitly authorized. Do not make a paid provider call to demonstrate loading.

## Task 5: Expose a mountable entry and a safe versioned release loader

**Files**
- Create S `dashboard/src/sdk/{index,mount,loader,manifest}.ts`, `dashboard/src/sdk/contracts.schema.json`.
- Create S `dashboard/vite.module.config.ts`, `module-dev.html`, `dashboard/src/sdk/devEntry.ts`.
- Create S `dashboard/scripts/check-assistant-loader.mjs`, `check-assistant-dev-entry.mjs`, `package-assistant-release.mjs`.
- Modify S `dashboard/package.json` with `dev:module`, `build:module`, `release:module` and the focused check entry.
- Create S `releases/ui/.gitkeep`; ignore generated release payloads while retaining the placeholder.

**Interfaces**
- Consumes: public types/normalized errors, shared runtime, surfaces/assets.
- Produces: `mountSmokey(options: MountSmokeyOptions): SmokeyRuntime` with every method defined in spec §4. `onEvent` is typed and excludes secrets/content.
- Produces: `loadSmokeyRelease(manifestUrl, { adapterVersion, hostApiVersion, signal }): Promise<SmokeyModule>` with schema/path/compatibility checks before native ESM import and export validation after it.
- Produces: the exact schemaVersion 1 manifest in spec §9, immutable hash-named module/CSS/assets, and compatible `stable-v1.json` promotion metadata.

- [x] **Step 1:** Write focused loader cases: reject wrong major or insufficient minor, malformed shape, cross-origin/protocol-relative/path-escaping entry/CSS/assets, missing entry exports, bad MIME and failed fetch/import; allow only the configured `/smokey-assets/releases/` subtree. Duplicate concurrent loads deduplicate code loading, not runtime/context ownership. Retry remains possible after an initial network failure.
- [x] **Step 2:** Implement one persistent module React tree and portal-based attach/detach. Keep the root outside route containers. Guard duplicate mounts for the same owner; reject attaching into nonempty/unowned containers. `destroy()` is idempotent and clears nodes, listeners, requests, assets and timers without touching unrelated DOM.
- [x] **Step 3:** Configure a dedicated dev server on port 5174/base `/smokey-assets/dev/`. Supply Vite client and the React Refresh preamble explicitly once before evaluating transformed React components; it cannot rely on standalone index.html. Standalone remains on 5173. Add an explicit dev loader path that cannot become the production manifest fallback.
- [x] **Step 4:** Configure production module output to include React/ReactDOM and all UI dependencies, with no external bare imports. Keep CSS/fonts/images/chunks relative to the immutable release. Implement atomic manifest promotion only after the complete release directory exists; retain the previous version. Importing a release never hot-swaps an existing runtime.
- [x] **Step 5:** Run the focused loader/dev-entry contract checks and `npm run typecheck`; inspect configuration/output expectations without running a production build.
- [ ] **Step 6 — deferred packaging gate:** Only after an explicit build/release request, run `npm run build:module` and the local packaging command for version `1.0.0` into a temporary release destination. Assert the manifest, relative URLs, no bare imports and MIME expectations against real output. No remote publishing or channel promotion is implied by a build request.

## Task 6: Implement PixelCore's host descriptor and adapter

**Files**
- Create P `pixelcore-backend/businesses/smokey_integration.py`, `test_smokey_integration.py`.
- Modify P `pixelcore-backend/businesses/urls.py` for the always-registered descriptor.
- Create P `pixelcore-frontend/utils/smokeyHostAdapter.js`, `smokeyHostAdapter.test.mjs`.
- Create S `dashboard/src/hosts/example/memoryAdapter.ts` and extend focused contract checks for a second host.

**Interfaces**
- Consumes: spec operation map and Task 1 common DTO/error contract; existing host `useApiClient`/business/auth stores and existing Smokey endpoints.
- Produces: authenticated `GET businesses/<uuid>/smokey-integration/` with installed/enabled/hostApiVersion/permissions/reportKinds, safe when the Python package is absent.
- Produces: `createPixelCoreSmokeyAdapter({ apiFetch, currentContext, navigate, sourceOrigin }): SmokeyHostAdapter`. Its operation switch maps only the names in spec §4 to the captured business and existing endpoints; generation creation alone forwards Idempotency-Key. JSON/FormData/Blob/204 responses and normalized errors retain their meaning.

- [x] **Step 1:** Add targeted backend cases for package present/absent, enabled/disabled, manager configuration restrictions, nonmember/staff/device denial, unauthenticated denial and another-business isolation. No descriptor import should require optional package models when absent.
- [x] **Step 2:** Add Node adapter assertions for every operation/method/path, UUID/table-key validation, forbidden URL/header injection, unsafe source links (`javascript:` and protocol-relative URLs), 204 and Blob, identity/revision change before/after dispatch, and no automatic retry of an uncertain paid check.
- [x] **Step 3:** Implement the descriptor without a database migration, exposing only actual active membership/capability metadata. Implement the thin adapter over the host auth client; do not share tokens with the module or add a platform-wide credential fallback. A context mismatch aborts or rejects with `STALE_CONTEXT`.
- [x] **Step 4:** Implement the in-memory example adapter with an unrelated host ID, tenant identifiers and source-link resolver. It demonstrates an integration contract, not Medframe authorization or real data access. No fabricated examples appear as live customer reports.
- [x] **Step 5:** Run `node --test utils/smokeyHostAdapter.test.mjs` from P frontend. From P, run `docker compose exec -T backend python manage.py test businesses.test_smokey_integration --settings=pixelcore_backend.smokey_test_settings --noinput` using the existing isolated test database configuration. Expected: all targeted access/mapping checks pass without using production data or provider calls. Run S focused contract checks against the example adapter.

## Task 7: Replace PixelCore's duplicated UI with the persistent module runtime

**Files**
- Modify P `pixelcore-frontend/plugins/smokey.client.js`, `composables/useSmokeyAssistant.js`.
- Create P `pixelcore-frontend/components/smokey/SmokeyModulePage.vue`, `SmokeyChatToggle.vue`.
- Modify P `pixelcore-frontend/components/workspace/WorkspaceShell.vue`, preserving unrelated search/theme/quick-action edits.
- Modify the existing seven P `pixelcore-frontend/pages/workspace/smokey/` pages to use the same route wrapper.
- Modify P `pixelcore-frontend/nuxt.config.js`, `.env.example` for explicit module source/rollout configuration.
- Create P `pixelcore-frontend/utils/smokeyModuleLifecycle.js`, `smokeyModuleLifecycle.test.mjs`.

**Interfaces**
- Consumes: Task 5 loader/runtime, Task 6 descriptor/adapter, host theme and route stores.
- Produces: app-scoped `useSmokeyAssistant()` exposing load/error/readiness and `toggleAssistant`, `attachDashboard`, `detachDashboard`, `setRoute`, plus trigger registration. It no longer owns a second generation controller.
- Produces: a shadcn toolbar Button only; launcher/chat/dashboard UI come from the shared module. Nuxt route wrappers own only their empty container, load/error feedback and route binding.

- [x] **Step 1:** Write focused lifecycle checks: only one runtime exists across all seven routes; attach/detach never destroys it; back/forward and direct report IDs round-trip once; report navigation does not loop; account/business/module changes synchronously invalidate earlier state; logout destroys it before another account mounts.
- [x] **Step 2:** Wire auth/business/theme watchers and identity revision snapshots. Mount only in authenticated workspace/settings areas for eligible memberships. Theme changes update context without resetting the controller. Handle enable events by refreshing business state before reading settings. Keep public/device/employee-only surfaces unaffected.
- [x] **Step 3:** Replace feature pages with `SmokeyModulePage`. Use a source/config-controlled `legacy|module` migration switch, never render both. Replace `SmokeyAssistantPanel` with `SmokeyChatToggle` and coordinate host canonical overlays, toolbar fallback focus and mobile bottom offsets through the module runtime. Keep existing user login/business selection in PixelCore.
- [x] **Step 4:** Add failure assertions for missing assets/service, incompatible module, permission loss, an upload completing after switch, a stale private Blob, and a host modal opening during chat. Failure shows a persistent retryable module error and leaves the main workspace usable; do not silently mount a second legacy chat as fallback.
- [x] **Step 5:** Run the two targeted Node files, `npm run check:ui`, S typecheck/focused checks, and `git diff --check`. Read each changed Vue script/template and compile through the existing check. Do not run a frontend build or open a browser as routine verification.

## Task 8: Deliver assets independently and document rollback

**Files**
- Modify P `docker-compose.yml`, `nginx/conf.d/default.conf`; create `docker-compose.smokey-ui.yml` for the dev-only module service.
- Modify S `dashboard/vite.module.config.ts`, `dashboard/scripts/package-assistant-release.mjs` where required by actual delivery paths.
- Create S `docs/SHARED-FRONTEND.md`, `docs/SHARED-FRONTEND-RELEASES.md`.
- Update S `README.md`, `docs/PIXELCORE-INTEGRATION.md`; update P `docs/smokey-assistant.md` and deployment examples.

**Interfaces**
- Consumes: Task 5 versioned output and Task 7 loader configuration.
- Produces: same-origin `/smokey-assets/dev/` proxy in development and `/smokey-assets/channels/` / `/smokey-assets/releases/` static delivery from read-only `/smokey-ui` in production.
- Dev service uses Node 24, its own named node_modules volume, the S/dashboard source mount and port 5174. Production reads S/releases/ui; it never runs Vite.

- [x] **Step 1:** Add focused deployment-contract assertions: normalized manifest-relative URLs remain under releases; JS/CSS MIME and nosniff are correct; channel manifests revalidate and immutable version paths cache; an unavailable optional dev upstream cannot prevent Nginx serving unrelated routes.
- [x] **Step 2:** Configure the dev service/proxy with dynamic optional-upstream resolution rather than a mandatory startup-time DNS dependency. Account for WebSocket/HMR base paths. Mount release assets read-only for production; no runtime npm install/download is part of production loading.
- [x] **Step 3:** Document exact local start/stop commands, standalone and module URLs, CSP/asset requirements, compatible release promotion, keeping the previous artifact, rollback and browser cache behavior. A Git edit is not a deployment; existing sessions keep their loaded version. Explain how a host later supplies a Medframe adapter without promising its domain reports are implemented.
- [x] **Step 4:** Run `docker compose config --quiet` for the current/default and explicit dev override compositions, plus the focused delivery-contract checks. This validates configuration without starting/recreating services or building images. Real packaging/MIME/cache HTTP verification uses the Task 5 explicitly authorized release gate.

## Task 9: Cut over once, remove duplicated screens, record acceptance

**Files**
- Remove after successful cutover: P's ten legacy feature components (`SmokeyAppearanceForm`, `SmokeyConversation`, `SmokeyThemeSelect`, `SmokeyConnectionForm`, `SmokeyAssistantPanel`, `SmokeyReportTable`, `SmokeyReportView`, `SmokeyDashboardFrame`, `SmokeyUsage`, `SmokeyMascotStatus`).
- Remove after reference checks: P `composables/useSmokeyResource.js`, `utils/smokeyAssistant.js`, `utils/smokeyRequestState.js`, `utils/smokeySettings.js` and only their obsolete checks/assets. Keep new wrappers/toggle/adapter and all backend files.
- Create S `docs/SHARED-FRONTEND-VERIFICATION.md`; update S `DESIGN.md` ownership map and P `docs/smokey-assistant-verification.md` with links/results.

**Interfaces**
- Consumes: all task deliverables, passing focused/static checks and explicit release/browser gate results when those activities are authorized.
- Produces: module-only host UI ownership with versioned-release rollback, no permanent duplicate UI or second controller.

- [ ] **Step 1:** Run a static reference search proving only the new runtime owns requests/launcher/drawer and no removed helper is imported outside Smokey. Verify all seven legacy URLs still resolve through wrappers. Inventory original dirty changes before any deletion.
- [x] **Step 2:** Exercise approved focused checks for readonly/admin roles, closed/open/full-page transitions, uncertain create/cancel, late callbacks, disabled/missing package, both host adapters, and manifest rollback selection. Verify records/keys/accounts and backend schemas were not changed by the migration.
- [ ] **Step 3 — deferred acceptance:** After explicit authorization, use the built artifact in actual standalone and PixelCore pages to check keyboard/focus, responsive lower-right placement, safe areas, light/dark, source/report deep links, full-page composer focus, host-dialog conflicts and compatible upgrade/rollback. Use mocked provider transport; paid calls need their own explicit request. Record any unexecuted gate as pending.
- [ ] **Step 4:** After successful cutover approval, remove the listed duplicate UI/controller code and migration switch. Rollback changes the compatible release pointer; it does not preserve an indefinitely maintained second dashboard implementation.
- [x] **Step 5:** Run applicable focused Node/Django checks, S typecheck, P `npm run check:ui`, scoped Impeccable detector and whitespace checks once after the last change. Record exact results/limitations and link the integration/release guides. Do not declare production/browser readiness with outstanding gates.

## Definition of done and handoff

The code migration is reviewable when Tasks 1–8 pass the permitted focused/static
checks and both applications select the same dashboard source. It is ready for
production cutover only after the explicitly gated packaging/browser checks and
Task 9 removal pass. These are separate recorded statuses, not an excuse to mark
unverified integration complete.

The existing native execution preference is retained. Review this plan and its
spec before implementation. Planning has not changed application code, restarted
services, modified credentials, built artifacts or run application tests.

## Planning self-review record

- Spec coverage: contract/client (Task 1), shared standalone screens (Task 2),
  theme/portals (Task 3), floating/chat UX (Task 4), lifecycle/release loader
  (Task 5), host authority/second adapter (Task 6), routes/single runtime (Task 7),
  delivery/rollback (Task 8), removal and acceptance (Task 9).
- All nine tasks identify owned files, consumed/produced interfaces and checkable
  checkbox steps. The five Review Focus cases are assigned to owning checks.
- Document links, code-fence pairing, placeholder scan and whitespace checks passed.
- Runtime API names match the spec; native execution preference is retained.
- Build, browser/visual, standalone-suite, paid-call and production-promotion gates
  remain explicit. No application verification was run for documentation-only work.


## Native implementation record — 2026-10-27

Tasks 1–8 are implemented with the permitted focused/static evidence recorded in
[verification](../../SHARED-FRONTEND-VERIFICATION.md). Task 2's historical
pre-extraction failing render check was not recorded; the final six-section,
two-subscriber, disabled/manager checks pass. Native execution used one fresh
whole-change reviewer at the end, per the user's retained execution preference.
Both findings were corrected and reviewed again.

Task 8 verification is structural/synthetic plus live development HTTP checks;
real release MIME/cache/bundle acceptance remains part of Task 5's build gate.
The initial optional development service and frontend/Nginx restart/reload were
necessary for the user-requested working local integration; no build was run.

Task 9 Step 1 remains incomplete because legacy references are deliberately still
present behind the explicit migration switch. Module-mode route wrappers use the
shared runtime; final deletion and module-only reference proof follow the gated
release/browser cutover. Task 9 Step 2/5 checks are the permitted subset documented
in verification, not production acceptance. No real release was promoted and no
paid provider call was made. Existing credentials, records and unrelated edits
were preserved. Changes remain uncommitted for review.
