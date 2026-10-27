# Smokey shared frontend module design

Date: 2026-10-27 (Asia/Manila)
Status: shared source and local integration implemented; production packaging/browser cutover pending
Canonical repository: `/home/micxsz/projects/SmokeyChatbot`
Host repository: `/home/micxsz/projects/pixelcore-platform`
Execution preference carried forward: native implementation in the current session

## 1. Outcome and scope

Maintain the assistant dashboard once in Smokey and run it both as a standalone
application and as directly mounted JavaScript inside PixelCore. Preserve the
standalone login. PixelCore retains its login, business selection, main navigation
and theme. The integrated experience uses no iframe and duplicates no Smokey
feature screens in Vue.

The same runtime provides a floating mascot in the lower-right corner, a toolbar
chat toggle, a right-side chat drawer, the existing optional modal, and full
reports. These surfaces share one current request and one in-memory draft.
Future projects such as Medframe can supply an adapter without rewriting the UI;
implementing Medframe authentication or domain reports is outside this change.

Ordinary compatible UI changes are authored and released only from Smokey. The
initial integration changes both repositories. Changes to host data sources,
permission rules, API contracts, or deployment topology may still need host work.

## 2. Verified starting point

- Smokey `dashboard/src/features/business/BusinessApp.tsx` currently handles the
  PixelCore-backed standalone login/business selection; `BusinessWorkspace.tsx`
  combines dashboard navigation, generation, settings and overlays.
- `dashboard/src/api/business.ts` has PixelCore-specific URLs, a module-global
  access token and refresh state. These cannot be used as the generic module API.
- `dashboard/src/features/business/hooks.ts` owns a second generation controller;
  PixelCore separately owns `utils/smokeyRequestState.js` and `plugins/smokey.client.js`.
- PixelCore has ten feature components in `components/smokey` and seven route
  pages under `pages/workspace/smokey`. Its toolbar mounts `SmokeyAssistantPanel`.
- Smokey's theme provider changes `document.documentElement`; its stylesheet has
  global `:root`, `body`, label and control rules. Both require isolation in host mode.
- React shadcn Dialog/Sheet/Select/AlertDialog currently portal into the document.
  They require a shared container contract for injected mode.
- Backend provider encryption, requests, report snapshots and quotas already live
  in `SmokeyChatbot/python/smokey_assistant`. PixelCore owns authentication,
  `businesses/smokey_bridge.py`, domain queries and API views. Preserve this boundary.
- Standalone Vite currently serves port 5173, proxies `/business-api` to PixelCore
  port 8000, and isolates its refresh-cookie path. Legacy website UI is `/websites`
  with a separate Django service on port 8001. Neither workflow is replaced.

Graphify supplied existing business/membership/configuration relationships; its
356-node snapshot does not describe the newer Smokey UI. Current source was read
directly for those details. Jev received only generic architecture requirements;
its singleton-runtime judgment is advisory, not a security proof.

## 3. Repository ownership

| Responsibility | Owner |
|---|---|
| Dashboard, settings forms, report rendering, chat composer | Smokey dashboard source |
| Mascot assets/animation, floating launcher, drawer/modal | Smokey dashboard source |
| Shared controller, runtime lifecycle, adapter types | Smokey dashboard SDK |
| Standalone login/business picker/refresh cookie | Smokey standalone PixelCore adapter |
| Host login, memberships, selected business, main navigation | PixelCore |
| Host business queries and report authorization | PixelCore backend |
| Provider credentials, report persistence, generation engine | Existing installed Smokey Python package |
| Thin host loader, operation mapping and route shells | PixelCore |
| Releasable frontend assets and compatible-channel manifest | Smokey release directory/pipeline |

Do not move PixelCore's workforce/commerce models into Smokey. Do not repurpose
public website IDs, origins or the legacy server OpenAI key for private reports.
Do not recreate accounts, rotate encryption keys or migrate existing report data
as part of this frontend refactor.

## 4. Shared adapter contract, version 1

The public SDK declares these interfaces in `dashboard/src/sdk/contracts.ts`;
business DTOs move from `src/api/business.ts` to `src/types/assistant.ts`.

```ts
type SmokeyPermission = 'configure' | 'generate' | 'view_reports' | 'delete_reports';
type SmokeySection = 'overview' | 'assistant' | 'reports' | 'connections' | 'appearance' | 'usage';
type SmokeyRoute = { section: SmokeySection; reportId?: string };
type SmokeyIdentity = {
  hostId: string; organizationId: string; actorId: string; revision: number;
};
type SmokeyContext = {
  identity: SmokeyIdentity;
  organization: { name: string; timezone: string };
  installed: boolean; enabled: boolean;
  permissions: readonly SmokeyPermission[];
  reportKinds: readonly string[];
  theme: 'light' | 'dark';
};
type SmokeyOperation =
  | 'integration.get' | 'module.enable'
  | 'settings.get' | 'settings.update'
  | 'connections.list' | 'connections.create' | 'connections.update'
  | 'connections.delete' | 'connections.models' | 'connections.check'
  | 'models.discover' | 'generations.create' | 'generations.get'
  | 'generations.cancel' | 'reports.list' | 'reports.get'
  | 'reports.rows' | 'reports.delete' | 'usage.get'
  | 'asset.get' | 'asset.upload';
type SmokeyRequest = {
  operation: SmokeyOperation;
  identity: Readonly<SmokeyIdentity>;
  params?: Readonly<Record<string, string | number>>;
  body?: unknown; idempotencyKey?: string; signal?: AbortSignal;
};
interface SmokeyHostAdapter {
  contractVersion: { major: 1; minor: number };
  request<T>(request: SmokeyRequest): Promise<T>;
  navigate(route: SmokeyRoute): void;
  resolveSourceLink(source: { href: string; label: string }): string | null;
}
interface SmokeyRuntime {
  attachDashboard(container: HTMLElement, route: SmokeyRoute): void;
  detachDashboard(): void;
  setRoute(route: SmokeyRoute): void;
  updateContext(context: SmokeyContext): void;
  openAssistant(trigger?: HTMLElement): void;
  closeAssistant(): void;
  toggleAssistant(trigger?: HTMLElement): void;
  setHostOverlayActive(active: boolean): void;
  destroy(): void;
}
```

Public entry: `mountSmokey({ owner, adapter, context, assetsBaseUrl, onEvent })`.
`owner` is a host-owned empty runtime container outside route content. `onEvent`
accepts a discriminated union for `ready`, `assistant-open`, `assistant-close`,
`route-requested`, `module-enabled`, `session-expired`, and sanitized `error`.
Events must not include provider keys, tokens, prompts or report contents.
The module exports `contractVersion` and `sdkVersion`; the loader checks both.

Requests carry an identity snapshot captured at dispatch. The host adapter checks
that host ID, organization, actor and revision still match before dispatch and
after completion. It constructs URLs from its own allowlisted operation map;
the module cannot supply an arbitrary URL, tenant path, provider endpoint or
Authorization header. Validate UUID parameters and table keys before interpolation.
The backend remains the authority and rechecks every business operation.

Use normalized errors `{ code, message, status, retryable }`; abort and stale-
context outcomes are distinct. JSON, Blob, FormData and void responses are all
supported. Retain 15-second request timeouts and 1.5-second sequential polling.
Timeouts on generation creation retain the original idempotency key. Do not
silently repeat paid connection checks or other uncertain mutations.

Host mode never calls the standalone login/refresh endpoints or modifies host
cookies/storage. Standalone builds this adapter around its current in-memory
access token and isolated HttpOnly refresh-cookie transport. No shared mutable
transport/token singleton is used by injected runtimes.

## 5. Runtime lifecycle and scope

Create one active assistant runtime per authenticated host workspace, outside
route lifecycles. Its single controller owns the draft, submitted prompt,
idempotency key, generation ID, progress, preview and transport-recovery state.
Full page, floating launcher, drawer and modal consume that controller.

Use one React tree for a mounted module. React portals render dashboard content
into the route's owned container while the workspace runtime and overlays persist.
Detaching a page does not destroy the controller. Standalone uses the same runtime
provider/controller inside its existing React tree, rather than mounting nested
roots or loading a second React runtime into its own application.

`updateContext` clears draft, private assets, errors, report data and request state
when identity/revision or access changes. Abort outstanding frontend requests and
fence every late response. Stop polling and revoke object URLs on reset/destroy.
Theme-only updates preserve the request and draft. Changing identity or closing
an overlay does not implicitly cancel a server job; Stop is an explicit action.
No automatic paid resubmission occurs on remount, refresh or module release changes.
After a full reload, completed work remains in Reports; this first release does
not persist a transcript or unsent draft to browser storage.

Permission/module changes hide controls immediately and still rely on server
checks. Staff/device/public contexts never mount private assistant UI. An installed
but disabled module can show onboarding to eligible members; enabling remains an
owner/admin action. A missing backend package produces an installation state,
not a broken host workspace.

## 6. Floating launcher and chat behavior

- Show the selected Smokey/custom/standard mascot at the lower right, on eligible
  authenticated dashboard/workspace pages only. No launcher on public site,
  customer, POS/device, employee/staff-only or login pages.
- Default offsets are 24 px right and bottom plus applicable safe-area insets;
  below 640 px use 16 px. A host may add a nonnegative bottom offset for a mobile
  toolbar. The clickable target is at least 48 x 48 px.
- The mascot is stationary; no dragging or roaming is introduced here. Small
  searching/generating motion respects reduced-motion preferences and has text.
- Accessible name: `Open Smokey chat`; toolbar toggle switches between `Open Smokey
  chat` and `Close Smokey chat`, with `aria-expanded` and drawer association.
- Mascot click and toolbar toggle operate on the same state. Hide the floating
  mascot while chat is open; restore it on close. The toolbar remains the second
  entry point. Searching continues to be indicated when chat is closed.
- Default presentation is the existing right drawer: 28 rem maximum width on
  desktop, full viewport width below 640 px, bounded by 100dvh and safe-area padding.
  Honor an already-saved modal choice without overwriting it; it shares the same
  controller. Appearance keeps both options, with drawer as the new-user default.
- Preserve unsent text, progress and results across open/close and route changes
  within the same business. Do not open a second chat beside the full Assistant
  page: focus that composer instead when it is visible.
- Escape/close dismiss the surface; Stop cancels publication through the existing
  API. Restore focus to a still-connected trigger, or the toolbar fallback.
- Suppress the launcher and close chat while a host modal is active; preserve its
  session. The small host adapter tracks only canonical host overlays. Never leave
  nested background scroll locks or inert/aria-hidden attributes after closing.

The dashboard is white-first and preserves the existing Instrument Sans/cobalt
identity. Embedded mode follows PixelCore's resolved light/dark theme and does not
overwrite its preference. Standalone retains Light/Dark/System selection. Custom
mascot assets are authenticated Blobs, never public URL credentials.

## 7. CSS, portals and integration boundaries

Use Shadow DOM for module-owned dashboard and floating/overlay surfaces. Attach
an untransformed runtime host as a direct child of the host-provided body-level
container; do not trap fixed elements inside the dashboard's scrolling area.
Provide shared style/asset and portal-container contexts to every owned surface.

Extract reusable tokens/reset/utilities from `index.css`; standalone document
styles remain a separate entry. Module CSS targets `:host`/owned root selectors,
not the host document's html/body/labels/controls. Load the same stylesheet into
each owned shadow root. Resolve fonts, sprite sheets and CSS relative to the
release, not hardcoded `/office-cat-sprite.webp` or a PixelCore domain.

Extend the existing shadcn Select/Dialog/Sheet/AlertDialog primitives through one
`OverlayProvider`: every portal defaults to its module-owned container. Theme
classes/tokens exist in each surface. Preserve composed keyboard events, readable
labels, outside-click behavior, focus trapping/restoration and background scroll.
Shadow DOM is style containment, not a security boundary; remote module code has
host-page privileges and must be a trusted first-party release.

Radix focus/scroll behavior across shadow roots is an explicit release acceptance
gate. Type checks cannot prove it. Do not claim keyboard/visual readiness or
silently switch to an unscoped document-body portal if a browser check fails.
Any required component-level compatibility fix stays in Smokey's shared layer.

## 8. PixelCore adapter and route migration

Add an authenticated host-owned descriptor at
`GET /api/businesses/<uuid>/smokey-integration/`, available even when the optional
Python package is absent. For active owner/admin/manager memberships return
`{ installed, enabled, hostApiVersion: { major: 1, minor: 0 }, permissions, reportKinds }`.
A missing package returns installed=false without importing optional models;
unauthenticated, staff, device and other-business access is denied. No secrets,
report data or model keys are included. Existing report endpoints remain unchanged.

The Nuxt plugin loads one runtime on eligible workspace routes using `useApiClient`
and the authenticated business store. It handles business/logout/module changes,
resolved theme, source navigation and host overlay coordination. On a module-enabled
event refresh the business store; derive fresh context before loading settings.

Keep the seven existing `/workspace/smokey/...` URLs and authentication middleware.
Each becomes a thin shared `SmokeyModulePage` route adapter. Back/forward, direct
report URLs and section navigation call `setRoute` without creating another runtime.
Maintain a single protocol event path: UI navigation asks the adapter to navigate,
then Nuxt's route watcher supplies the accepted route back to the runtime.

Replace toolbar `SmokeyAssistantPanel` with a thin shared shadcn Button toggle.
The floating mascot and actual chat controls are rendered only by Smokey. PixelCore
keeps its main sidebar/header; embedded mode omits standalone login/business
selection and its redundant app shell. During migration a host feature switch
selects legacy or module implementation; they never mount together. Remove the
legacy Vue feature screens/controller after the cutover checks pass; retain routes
and backend integration. Preserve unrelated edits in WorkspaceShell/theme/auth.

## 9. Versioned delivery and updates

Ship a compiled browser ESM release from Smokey with React/ReactDOM and runtime
UI dependencies included; no unresolvable bare imports or host React dependency.
All chunks, CSS, fonts and mascot assets belong to the same immutable release.
The standalone Vite app imports the same source rather than the deployed bundle.

Serve assets under PixelCore's same-origin `/smokey-assets/` route. The public
channel manifest is `/smokey-assets/channels/stable-v1.json`:

```json
{
  "schemaVersion": 1,
  "release": "1.0.0",
  "adapter": { "major": 1, "minMinor": 0 },
  "hostApi": { "major": 1, "minMinor": 0 },
  "entry": "../releases/1.0.0/smokey.CONTENTHASH.mjs",
  "stylesheet": "../releases/1.0.0/smokey.CONTENTHASH.css",
  "assets": "../releases/1.0.0/assets/"
}
```

The loader resolves URLs relative to the manifest, confines all paths to the
configured same-origin `/smokey-assets/releases/` subtree, validates schema and
major/minor compatibility before importing, checks entry exports afterwards, and
fails without mounting on mismatch. The channel manifest is revalidated; immutable
release files use long-lived cache headers. Provide correct JavaScript/CSS MIME
and nosniff headers. Do not add eval, wildcard code origins, or provider credentials
to CSP/config. Native dynamic import is used; do not promise SRI enforcement that
it does not provide. Release publishing is a trusted deployment operation.

Publish a complete version directory before atomically promoting the channel
manifest. Keep the preceding compatible release for rollback. New workspace loads
or refreshes discover the new compatible version; do not hot-swap code during an
active session. A breaking adapter/backend major requires coordinated host work.

Development uses a separate module Vite entry on port 5174 with base
`/smokey-assets/dev/` and a Docker dev service/proxy; standalone stays on 5173.
Handle the React Refresh preamble/Vite client explicitly because PixelCore does
not load Smokey's index.html. Development artifacts are never a production URL.

Production Nginx reads release artifacts from a read-only mount of
`../SmokeyChatbot/releases/ui`; compatible UI releases update that directory and
the manifest without rebuilding PixelCore's frontend. A separately hosted asset
service/CDN can replace that mount later through the same-origin proxy contract.
This is not automatic deployment from a Git edit or a production hot reload.

## 10. Acceptance, validation and limits

A complete migration means one dashboard source, no iframe, both launch controls,
shared request/draft state, preserved standalone login, unchanged stored data and
host permissions, working deep links, isolated CSS/theme, and a repeatable compatible
release/rollback contract. A second in-memory mock host proves UI portability;
Medframe's real data integration remains a separate task.

Mandatory negative cases: delayed response from a previous business/actor, logout
while a paid call is pending, duplicate mount/toggle/creation, lost creation response,
failed cancel, forbidden operation/URL, private asset after a switch, malformed or
incompatible manifest, missing module service, conflicting host modal, and stale
release cache. Failure must preserve the host and must not cause an automatic AI call.

Planning is documentation only. During implementation follow each repository's
AGENTS.md: focused type/static/automated checks; PixelCore `npm run check:ui` after
frontend edits. No production build, standalone test suite, browser-based/visual
inspection or paid provider call is authorized by this planning request. Record
unexecuted release/browser acceptance gates honestly. Production packaging and
cross-browser focus/mobile verification require an explicit later request before
they are executed; do not mark those gates passed based on type checks.

## Technical references

- React roots: https://react.dev/reference/react-dom/client/createRoot
- Shared context through portals: https://react.dev/reference/react-dom/createPortal
- Shadow DOM: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- Radix portal container: https://www.radix-ui.com/primitives/docs/components/dialog#custom-portal-container
- Vite backend development/preamble: https://vite.dev/guide/backend-integration
- Vite library packaging: https://vite.dev/guide/build.html#library-mode

This design supersedes only the duplicated frontend/native-Vue-dashboard decision
in the 2026-10-26 assistant spec. Its backend privacy, provider, report and usage
contracts remain authoritative.
