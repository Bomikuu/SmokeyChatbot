# Shared Smokey business UI contract

Scope: `dashboard/src/features/business` and the standalone theme control. The
shared React UI owns both PixelCore's injected Shadow DOM and standalone Smokey.
The legacy PixelCore Vue pages are an explicitly selected compatibility mode.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Authored shadcn Select through BusinessSelect | dashboard/src/components/ui/select.tsx | Business selection and appearance settings | Existing surface contract check and browser keyboard inspection |
| Date | Native date through shared shadcn Input | dashboard/src/components/ui/input.tsx | Native platform geometry/locale accepted; business timezone stated | Usage range validation and timezone quota checks |
| Form | Field, Input, Textarea, useBusinessAction | dashboard/src/components/common/Field.tsx | Connection editor with first-error focus and linked errors | check-business-insights.mjs plus scoped browser flow |
| Dialog | shadcn Dialog and AlertDialog with scoped portal | dashboard/src/components/ui/dialog.tsx | Add/edit, dirty-discard, destructive confirmation | Save, cancel, Escape, focus return, pending and failure browser checks |
| Table | BusinessDataTable with shadcn Table | dashboard/src/features/business/BusinessControls.tsx | Scrollable supporting detail | Render contract check |
| Charts | BusinessInsights and usageMetrics | dashboard/src/features/business/BusinessInsights.tsx | Quota meters, proportional model bars, stacked recorded tokens | check-business-insights.mjs |
| Toast | Persistent Notice/BusinessFeedback | dashboard/src/components/common/Notice.tsx | Inline errors and success messages | Retry and validation browser checks |
| Scrollbar | Semantic shared CSS | dashboard/src/styles/shared.css | Overflow geometry local to a surface | Desktop/mobile overflow inspection |
| CRUD | Scoped SDK client and existing generation controller | dashboard/src/sdk/client.ts | Connection add/edit/remove; explicit paid connection check | Existing runtime/render checks and mocked connection save |

All actions use shadcn Button. Provider cards use pressed-button semantics, retain
keyboard focus, and reset unsaved key/catalog state when the provider changes.
Editing retains the existing provider; changing provider requires a new connection.
The first successful connection check fills an empty default selection. Later checks
preserve an existing default, and a check completed against an outdated connection
revision cannot select it. The composer explains the default requirement directly;
both full-page and compact surfaces use the same submission gate. Migration
`0004_verified_default` repairs a missing default only for a tenant with exactly one
ready connection whose model is permitted.
API keys stay in component memory only, are masked initially, and clear on close
or save. No provider request is made for selecting a suggestion or opening a modal.
A verification action explicitly makes a potentially paid provider request.

The connection editor keeps its header and actions visible; the body scrolls.
Closing a dirty editor requires discard confirmation. Pending discovery/save blocks
close and duplicate submission. The opening control regains focus on close.
Business/actor changes unmount the feature and the SDK rejects stale responses.

Usage charts use aggregate server data, never a fabricated timeline. Missing usage
is labeled incomplete and excluded from recorded token totals. Quota values include
reservations and uncertain calls and always use the current business date/month,
independent of a historical reporting range. An unavailable resource shows an error
or placeholder rather than zero. Near-limit status is stated in text as well as color.

Pricing is a dated, exact-model-ID reference with official source links. It is not
an invoice, fixed cost per prompt, or a claim that a model is currently available.
The example assumes 1,000 input and 500 output tokens per single call; generating a
report can involve multiple calls. No OpenRouter model inherits direct-provider
rates, and unknown IDs show unavailable pricing. Provider discovery and verification
remain authoritative for actual availability and structured output support.

The shared ThemeProvider remains the only standalone theme owner. The sidebar
footer offers Light, Dark and System with labels on icon controls. Embedded Smokey
inherits its host's theme and account footer; feature components do not import
standalone theme or authentication state.

Shadow DOM modal focus is bridged by `src/sdk/shadowFocus.ts` through the canonical
Dialog, AlertDialog and Sheet content refs. The topmost scope owns forward/reverse
Tab and programmatic focus, allows the same surface's portalled Select, and restores
the deep active control for nested dialogs. Standalone document surfaces keep
Radix's behavior. A browser check covers the actual SDK-mounted surface.

## Manual dollar credits

`ProviderConnection.credits_usd` is nullable, a decimal USD total with two decimal
places. Owners/admins can set positive amounts or null to stop tracking via the
existing connection PATCH. A credit-only change preserves connection verification,
revision, default selection and in-flight generations. It does not buy credit or
add spending enforcement. Migration: `0003_connection_credits`.

Connection reads include scoped lifetime `usage_by_model` grouped by snapshot
connection ID/provider/model, including previously selected models and uncertain
calls. The list computes all groups in one query, rather than one query per card.
The frontend estimates only priced recorded tokens with exact-ID reference rates.
If any usage cannot be priced, the amount is a lower bound, the bar is marked
incomplete, and remaining-credit numbers are withheld. Old hosts without a
`credits_usd` property do not expose write controls. Saving, clearing, failure
recovery and focused permission/isolation tests cover this boundary.

The connection list refreshes every 30 seconds only while visible, idle and outside
connection/credit editors. Leaving the screen removes the timer/listener. Shared
SDK context fences still reject stale responses. No balance API or provider call
is made by this refresh.

## Header and surface density

`BusinessPageHeader` owns the standalone/inline SDK breadcrumb. PixelCore passes
`pageHeader: "host"`; its WorkspaceShell renders the section breadcrumb and
summary, while the shared page omits that heading. The option defaults to inline
for other hosts. The content page has one responsive gutter and no outer centered
width cap. Compact overlay conversations omit suggestion descriptions; full-page
conversations retain them. This remains one controller and one draft.

Mascot choice cards reuse BusinessMascot for actual appearance, hide decorative
preview announcements, and show a placeholder when no private asset exists. Private
assets remain authenticated blobs, and replacement uploads refresh the previews.

The Shadow DOM stylesheet initializes per-element Tailwind variables in its base
layer. Browser verification checks a real 1px solid card border and a budget dialog
fully within the mobile viewport; the document stylesheet does not import this
fallback.

## Conversation and report refinements — 2026-10-27

`requestController` retains 30 ordered turns shared by all chat surfaces. Tab-only
storage keeps prompts and request/report references, not provider keys, report facts
or summaries. It is scoped by the existing access identity, cleared on access
changes/logout/session expiry, and restored without starting paid calls. Explicit
recovery retains idempotency. Browser storage failure falls back to memory.

Report dashboards use uniform icon tiles, immutable saved sales/attendance series
and payment-status shares. Older reports require explicit regeneration for charts.
Product transaction snapshots retain names/SKU/quantities/prices/media references;
fixed-size image fallbacks handle absent, invalid and failed URLs. Table searches
cover all stored rows, with 20/50/100 paging forwarded by both host adapters.
CSV exports explicitly cover the displayed page and escape spreadsheet formulas.
Focused checks: controller/session restoration, contract paths, report rendering/CSV,
scoped report API/aggregates, host adapter queries and UI boundary. Browser fixtures
use synthetic data and do not call AI providers.
