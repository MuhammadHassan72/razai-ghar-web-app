# Phase 3 verification — RAZAI GHAR bed customizer

Verified on 19 October 2026. `/create-your-bed` now provides the three-step interactive customizer against the existing device-persisted Commerce Engine. Phase 4 remains outside this change.

## Material-fidelity boundary

Section 3.3 requires approved photographs or renders with aligned camera/template metadata before a preview can claim exact product fidelity. The current catalog provides editorial reference photographs, with no approved aligned layer assets or genuine variant texture macros. Relabelling those photographs or a procedural pattern as accurate product photography would violate that requirement.

The delivered 2400 × 1800 stage is therefore explicitly labelled **QA illustration**. It uses the catalog's actual swatch HEX tokens and distinct symbolic weave/construction patterns. Missing genuine macros are explained in the texture inspector. Product references, contents, dimensions and exact selected SKU lists remain accessible. Commercial photographic fidelity remains dependent on approved merchant assets; this verification does not claim it has been achieved.

## Delivered implementation

| File or module | Behavior |
| --- | --- |
| `src/app/create-your-bed/page.tsx` | Branded metadata and Suspense boundary for the client customizer |
| `src/components/builder/BedBuilder.tsx` | Entry context, fit confirmation, three steps, reviewed size changes, reset/Undo, save, purchase, cart replacement and mobile actions |
| `BedPreviewStage.tsx` | Deterministic SVG stage with base 0, foundation 10, conditional flat fold 20, main top 30, throw 40, included sleeping cases 50 and five named cushion positions 60–64 |
| `SlotSelector.tsx` | Compatible product families, foundation/top types, fiber/weave shortcuts, named radio swatches, actual regional/cushion dimensions, explicit separate inserts, weighted-blanket facts and throw coverage |
| `BedItemList.tsx` | Exact text equivalent of selected/unresolved items, current prices, dimensions, contents, insert distinctions and product-reference links |
| `TextureInspector.tsx` | Selected material facts, fiber percentages, GSM, conditional TC, total weight and care; genuine approved texture media when available, otherwise a labelled construction diagram |
| `BundleQuote.tsx` | Engine quote state, 0%/5%/10% group progress, itemized allocations, sale/insert exclusions, shipping/tax states, expiry and refresh |
| `SaveLookDialog.tsx` | 60-character name, composition summary, update/copy choice and expected saved-look revision |
| `useBedEditor.ts` | Debounced quotes with stale-result rejection, revision-checked draft autosave, synchronous session recovery buffer, offline handling and a successful-add navigation marker |
| `src/lib/bed-builder.ts` | Pure entry, slot, fit, size-reconciliation, position and purchased-composition helpers |

Shared changes extend the strict TypeScript/Zod contracts with optional fit confirmation, explicit step intent and unresolved product/color/size choices. Existing stored selections remain readable. The shared dialog supports a full-screen bed view, and the navbar exposes its measured height for sticky offsets. Compact branding was adjusted to prevent a 320 px header overflow.

Receipt-to-builder links continue to work through a shared purchased-composition helper. New order bundle snapshots retain exact compositions; legacy standalone orders retain the documented first-foundation/top/throw and five-cushion limit.

## Domain and state guarantees

- Added the strictly validated `bed.quote` command. It evaluates a current quote without changing stored state, inventory, audit history, command receipts or aggregate revision.
- `cart.add_bundle`, `cart.replace_bundle` and `look.save` remain the sole shared-domain purchase/save authorities. Quote acceptance, inventory validation, largest-remainder allocation, non-stacking promotion comparison, revision checks and idempotency remain in the engine.
- New visitors must confirm the actual mattress fit. Open steps are distinct from configured or explicitly skipped steps. Current selected merchandise can be quoted while other steps remain open, but an add/replace command rejects open steps.
- Size changes propose only unique verified equivalents in the same product, color, fiber and weave. Replacements and price changes are reviewed before application. Choices without an equivalent remain unresolved and inspectable; purchase is blocked.
- Compatible inserts are separately named and priced. Repeated cushion covers aggregate commerce quantity while retaining five visual positions and individual insert links.
- Visibility inspection never edits merchandise. Reset reviews the draft contents first; Undo restores local composition without undoing a committed cart or saved look.
- Device draft saves use an expected revision. Competing edits produce a conflict with explicit load/keep choices. A session recovery buffer preserves the current local edit before the debounced engine save completes.
- Quote requests discard responses from older selections. Stale or expired quotes cannot enable purchase. The engine revalidates the accepted quote during the atomic command.
- Editing a cart bundle previews the entire resulting cart and the bundle's before/after tier and savings before confirmation. A successful unchanged addition switches to “View added bed bundle”; command retries retain their idempotency key.

## Automated checks

| Check | Final result |
| --- | --- |
| `npm run build` | Passed; optimized Next.js build, TypeScript and CSS compilation; 37 generated pages |
| `npm run lint` | Passed; zero warnings and zero errors |
| `npm run test:commerce` | 32 passed; zero failures, skipped tests or cancellations |
| Production HTTP smoke tests | 9/9 passed, including recipe, SKU, saved-look, cart-bundle and purchased-order entry URLs |
| Fresh production browser | Current $400.00 / $40.00 / $360.00 recipe quote displayed; zero captured console errors or warnings |
| `git diff --check` | Passed |
| Implementation marker scan | No TODO, FIXME or placeholder markers in `src` |

The eight added tests cover read-only quoting and fit confirmation; open-step purchase protection; same-color size/insert reconciliation; unresolved same-color alternatives; entry-context validation; five-cushion aggregation and idempotency; exact render order and inspection invariance; and saved-look revision safety with expired-quote rejection. The original 24 commerce tests continue to pass.

## Browser verification

The Quiet morning recipe loaded three exact sale units and a 10% quote. Changing the foundation swatch updated the selected fabric immediately; “Show foundation” left the merchandise and total intact. Queen-to-King review proposed $200.00 → $240.00 for the same-color foundation and $150.00 → $190.00 for the top, retained the cushion, and then quoted $480.00 subtotal, $48.00 saving and $432.00 total.

The reviewed King look saved as “Phase 3 · Sage King QA” at revision 1 and was reachable through its real My Sanctuary link. Its update dialog exposed the expected revision and separate-copy option. Adding it opened the cart with three additional units as one named bundle. Editing that exact bundle and explicitly skipping cushions changed its tier to 5%: $430.00 subtotal, $21.50 saving and $408.50 selection total. The resulting whole-cart review showed $830.00 subtotal, $61.50 savings and $768.50 total. Confirmation retained the bundle identity and reduced the cart count from six to five sale units.

Reset showed the contents to be cleared, then emptied only the local draft. Undo restored its two selected King items while the cart retained five units. A swatch change survived reload in the durable device draft. Full-screen View bed, its own close control, focus restoration, material inspection and the genuine-macro-unavailable explanation were exercised.

These interactions changed local QA data only. The browser may retain the new saved look and test bundle. No payment or external order was created.

## Responsive results

The actual application was loaded in one same-origin iframe resized through all five widths; iframe height was 1000 px. Measurements compare page scroll width with the document client width, accounting for its scrollbar. This was a layout check, not the throttled performance lab profile.

| Viewport width | Horizontal overflow | Stage ratio | Layout | Header row | Mobile action bar |
| --- | --- | --- | --- | --- | --- |
| 320 px | None | 1.3333 | Stacked | 64 px | Visible |
| 390 px | None | 1.3333 | Stacked | 64 px | Visible |
| 768 px | None | 1.3333 | 6/6; both panes 336 px | 64 px | Hidden |
| 1024 px | None | 1.3334 | 7/5; sticky preview | 72 px | Hidden |
| 1440 px | None | 1.3334 | 7/5; sticky preview | 72 px | Hidden |

The preview falls back to normal flow when its measured content cannot fit below the header. Mobile adds bottom safe-area space so the action bar does not obscure the last controls. The temporary responsive harness was removed after verification.

Evidence: `artifacts/phase-3-customizer.png`, `artifacts/phase-3-responsive-checks.json` and `artifacts/phase-3-route-checks.json`.

## Remaining commercial integration boundary

The requested local engine remains a QA authority scoped to one browser/device. This does not introduce secure authentication, real payments, ERP inventory or multi-device persistence. Those require authenticated backend transactions; browser role simulation and stored prices must never be trusted by a future server. Exact approved visual assets, a broader assistive-technology audit, 200% zoom review, physical-device testing and measured performance budgets remain commercial launch checks. No field Core Web Vitals or product-material accuracy claim is made.

The production preview remains available on port 3100 for the previously requested local website viewing.
