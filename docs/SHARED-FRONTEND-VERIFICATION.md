# Shared frontend verification — 2026-10-27

Status: implementation and permitted local/static checks complete. **Production
cutover is pending.** The real release build/package, browser acceptance and final
legacy deletion are explicitly gated in Tasks 3, 5 and 9 of the approved plan.

## Passed

| Check | Evidence / limit |
|---|---|
| Standalone `npm run typecheck` | React/SDK and both Vite configurations typecheck |
| `npm run check:assistant` | Six focused scripts: identity/timeout fencing, one-controller recovery/cancellation, six shared sections and two subscribers, loader contracts, owned surfaces, synthetic delivery |
| PixelCore Node checks | 10 tests across `smokeyHostAdapter.test.mjs`, `smokeyModuleLifecycle.test.mjs`, `smokeyModuleLoader.test.mjs`; all operations, private Blob/upload fences, route round trips, load retry, pending logout and overlay suppression |
| Descriptor PostgreSQL tests | 7 passed in isolated `test_smokey_assistant`, then test database destroyed; installed/absent, enabled/disabled, role/membership/device/anonymous and business isolation |
| PixelCore `npm run check:ui` | Passed; Vue templates compile and shared primitive boundary is clean |
| Development HTTP graph | 39 source modules transformed; 22 dependency/font routes available; this is HTTP compilation evidence, not browser execution |
| Standalone HTTP session | Login, isolated refresh/logout, descriptor and enabled settings/report reads for two existing memberships; no paid provider requests |
| PixelCore asset proxy | JavaScript/CSS-inline/sprite routes available through Nginx; eight repeated direct Nuxt requests passed after proxy restart/fix; HEAD preserves 200/404 and missing releases avoid immutable caching |
| Compose and Nginx | Default and optional three-file development compositions validate; Nginx syntax check passed; optional upstream resolves at request time |
| Release mechanism | Temporary synthetic fixture packaged immutable versions; duplicate rejected, previous channel retained; fixture files removed afterwards |
| Release configuration | SDK entry exports explicitly preserved; dependencies bundled by configuration; actual artifact is still unbuilt |
| Whitespace | `git diff --check` clean in both repositories |

The focused scripts use existing Node/Vite/TypeScript and a minimal DOM ownership
fixture. No general standalone test runner was added or run. Surface assertions
prove ownership/theme/portal wiring; they do not simulate keyboard focus or layout.

A fresh independent reviewer found a repeated-Stop cancellation deadlock and a
Vite default that could discard public SDK exports. Both were fixed and reviewed
again. The new Stop regression was observed failing before the fix and passing
afterward. `preserveEntrySignatures: "strict"` is now checked without building.

The scoped Impeccable detector flagged the established Instrument Sans font
(two locations initially, one after shared-style consolidation). The approved
white/cobalt identity was preserved. No rendered visual quality or keyboard certification is claimed.

## Runtime / data effects

Local `smokey-ui` development service was started using an existing Node-compatible
frontend image, without an image/application build. PixelCore frontend/Nginx were
recreated or reloaded for the initial integration; backend/worker/beat were not
recreated for this frontend migration. Standalone remains on port 5173. No account,
provider credential, encryption key, quota, saved report or schema migration was
changed by this migration. HTTP auth checks created and logged out only their own
temporary session. Existing unrelated dirty work remains uncommitted.

## Pending acceptance

- Explicitly requested real `build:module`, packaging into a temporary destination,
  actual export/relative dependency/font/MIME/cache inspection, and standalone
  production artifact validation. No real channel has been promoted.
- Explicitly requested browser pass: desktop/mobile safe-area geometry, dark/light,
  reduced motion, Tab/Shift+Tab, Escape/outside clicks, Select and nested delete
  dialogs, host-modal suppression, scroll-lock cleanup, trigger/full-page focus,
  report/source deep links and upgrade/rollback with mocked provider transport.
- After successful cutover approval, delete the temporary PixelCore legacy routes,
  ten duplicate feature components, obsolete controller/helpers/assets and the
  `legacy|module` switch. Until then production retains explicit legacy mode.
- Real Medframe auth/data adapter and backend reports are separate host work.

The initial migration changes both repositories. Ordinary compatible UI releases
are then authored in Smokey; production still requires asset deployment and a page
reload to pick up a new version. See [setup](SHARED-FRONTEND.md) and
[releases/rollback](SHARED-FRONTEND-RELEASES.md).
