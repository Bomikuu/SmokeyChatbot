# Smokey business dashboard audit — 2026-10-27

## Scope and direction

Audit and implementation cover the canonical shared business React UI in
`dashboard/src/features/business`, standalone account/theme controls, and the
canonical dialog layer used by PixelCore's embedded Shadow DOM. Preserve the
white/cobalt Instrument Sans system, mascot, existing API contracts, permissions,
server-side keys, explicit provider requests, and shared generation controller.
Legacy PixelCore Vue compatibility pages and the website-chatbot dashboard are
outside this refinement. No production build or live paid-provider test was run.

## Findings and fixes

| Priority | Finding and impact | Resolution |
| --- | --- | --- |
| High | Overview gave setup links but little operational information. Owners could not quickly see saved reports, connections or usage. | Added real-data summary tiles, current quota meters, selected-provider identity and recent report links. Loading/unavailable/permission states remain distinct from zero. |
| High | Usage was table-only; limits and token use were difficult to compare. | Added period-specific call/input/output/incomplete-usage summaries, daily/monthly quota meters, proportional model bars and stacked recorded token composition. Kept exact tables and limit editing. |
| High | Inline connection editing competed with management; provider/model identifiers lacked context. | Add/edit uses a scoped modal with provider cards, discovered model cards, search, descriptions, dated rates, example cost and unavailable-rate fallback. Header/actions stay visible while the body scrolls. |
| Medium | Text-only provider/status labels slowed recognition and obscured the default connection. | Bundled provider marks, connected/verification/attention badges, and a separate default badge; retained Check/Edit/Default/Remove actions. |
| Medium | Ask Smokey suggestions were small undifferentiated controls with little guidance before submitting. | Icon suggestion cards explain supported reports, fill/focus the shared draft, show selection, and use bounded hover transitions. Composer has character count and Ctrl/Cmd+Enter with permission and IME guards. |
| Medium | Standalone account identity was plain email text; theme controls occupied the toolbar. | Sidebar footer now shows user icon, name/email, sign-out and labeled Light/Dark/System icon choices. Embedded hosts retain their account/footer ownership. |
| High | Keyboard focus could escape embedded dialogs because document.activeElement resolves to the shadow host. | A shared Shadow DOM focus bridge in Dialog, AlertDialog and Sheet uses the deepest active control, topmost modal scope, visible enabled controls and nested focus return. Standalone Radix behavior remains unchanged. |
| Medium | Required-field feedback needed a clear recovery path; unsaved keys could be discarded on dismissal. | Validation focuses/describes the invalid field and clears on correction. Dirty close asks for discard confirmation. Pending discovery/save blocks close and duplicate actions; errors retain the draft. |

No critical data-exposure issue was found in the touched workflow. Existing scoped
SDK requests, context fences, server-side keys, canonical shadcn portals, generation
recovery, and text status alongside mascot motion remain in use. This was a scoped
UI review, not a backend security audit.

## Verification

Focused checks from `dashboard`:

- `npm run typecheck` — passed.
- Prettier check on changed React, TypeScript and shared CSS files — passed.
- `node scripts/check-business-insights.mjs` — passed: exact-ID pricing, unknown
  rates, example arithmetic, incomplete usage, timezone quotas, over-limit
  percentages, badge states and chart semantics.
- `node scripts/check-assistant-render.mjs` — passed: six business sections,
  independent host rendering and shared draft.
- `node scripts/check-assistant-surfaces.mjs` — passed: owned Shadow DOM nodes,
  portals, theme and asset contracts. Browser checks separately verify keyboard use.
- PixelCore `npm run check:ui` — passed (canonical UI boundary clean).
- Impeccable detector on changed business/standalone UI — no findings emitted.

Browser checks used synthetic owner/business data and mocked API responses at
`http://localhost:5173/business-api/**`. No real keys, customer records or paid
provider requests. Desktop 1440×1040 and mobile 390×844 were inspected together,
then confirmed after the collected fixes. Artifacts and scripts are in PixelCore's
`output/playwright/smokey-polish/`.

Verified:

- Overview, usage graphs, provider marks, badges, model search/no-results,
  example prices, connection save and focus return.
- First-error focus/ARIA and correction; discovery failure/retry; pending close
  protection; dirty cancel/Keep editing/Discard; visible desktop/mobile actions.
- Usage errors do not imply zero activity; retry restores charts.
- Suggestions fill/focus without generating; Ctrl+Enter submits exactly one
  synthetic request. Both themes, reduced motion and no narrow page overflow.
- Actual SDK-mounted Shadow DOM: provider cards/assets, forward/reverse Tab,
  attempted outside focus redirection, nested confirmation focus, return focus,
  validation recovery and live theme changes with the dialog open.
- Contrast spot-checks identified muted copy on selected accent cards below 4.5:1;
  selected provider/suggestion copy now uses the stronger semantic foreground tint.

## Static audit exception

`docs/smokey-premium-audit.json`, configured by `docs/smokey-premium-ui.json`,
reports **one verified false positive**, not a clean strict exit:
`ownership.native-select-conflict` at `BusinessControls.tsx:51`. The scanner
case-folds React `<Select>` to native `<select>`. This component imports the
canonical authored shadcn/Radix Select from `@/components/ui/select`; it is not a
browser-native select. The ownership contract remains truthful.

An initial unscoped scan also flagged pre-existing website-dashboard forms and
Radix action/close wrappers. Those screens were outside the requested business UI
scope and were not rewritten to satisfy a text detector.

## Deliberate limitations

Rates are reference standard text API prices checked on 2026-10-27, matched to
explicit IDs and linked to official OpenAI, Anthropic and Google pages in
`providerCatalog.ts`. The example assumes one call with 1,000 input + 500 output
tokens, not a fixed cost per prompt/report. Generation can involve multiple calls
and reasoning tokens; provider terms/rates can change. Unknown IDs and OpenRouter
models do not inherit guessed direct-provider rates. Provider discovery and
verification remain authoritative for availability.

Charts use server aggregates and reserved quota accounting. No daily trend or
provider-invoice history is invented from the last 100 calls. Native date fields
retain platform geometry/locale and state the business timezone. The standalone
mobile shell retains its existing horizontally scrolling section navigation.

## Follow-up refinement: credits, density and headers

Implemented the requested manual USD-credit tracking, transform-animated usage
bars, full-width page gutters, compact overlay suggestions, mascot appearance
cards/live preview, and header breadcrumbs/descriptions in standalone and PixelCore.
Credit-only edits preserve verified status/revision. Lifetime usage is grouped in
one scoped query and includes earlier models. Incomplete estimates withhold a
remaining balance. Older hosts without the field receive no unsupported writes.

Additional verification:

- Three targeted Django API tests passed: decimal validation/owner permission,
  persistence without invalidating verification/revision, and lifetime grouping
  with unknown tokens and cross-tenant isolation. Grouping uses one query.
- Migration `0003_connection_credits` applied locally; scoped migration drift check
  reported no changes.
- TypeScript, focused insights/render/surface checks, Prettier, PixelCore `check:ui`,
  and six host loader/lifecycle checks passed.
- Synthetic browser checks at 1920×1080 and 390×844 verified saved credit amounts,
  validation/failure recovery, 42px compact suggestions versus descriptive page
  cards, three appearance choices and live preview/save, reduced-motion animation,
  full-width 24px desktop gutters, and no page overflow. A controlled browser clock
  verified a connection refresh after 30 seconds.
- Actual PixelCore embedding verified a single header heading, the header
  description, section route updates, budget save and Shadow DOM focus containment.
- Embedded utility defaults were missing because Shadow DOM styles do not register
  Tailwind's @property defaults. The scoped fallback restores borders/spacing and
  centering; computed checks confirmed a 1px solid card border and a credit dialog
  completely inside the 390×844 viewport.

Artifacts: PixelCore `output/playwright/smokey-refinement/`. No builds or live paid
provider calls were run. Financial figures in previews were synthetic. Real bars
use estimates from recorded calls, not provider invoices or actual balances.

The Premium strict report still has the documented authored-Select false positive.
The follow-up Impeccable scan, now including shared CSS, also reported the incumbent
Instrument Sans choice and an existing width transition on the older quota charts.
The approved typeface is retained; the new credit animation uses transform only.
These are existing style advisories, not new credit-flow defects.
