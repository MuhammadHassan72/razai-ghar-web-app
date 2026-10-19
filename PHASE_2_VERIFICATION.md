# Phase 2 verification

Verified on 18 October 2026 in the existing workspace. Phase 2 replaces the starter page with the public bedding storefront and connects every purchase action to the shared commerce engine. No external ERP, identity service or payment provider is connected.

## Delivered surfaces

| Surface | Implementation |
| --- | --- |
| Shared shell | CMS announcement and editorial hero, desktop/mobile navigation, keyboard-accessible category disclosure, fiber/weave guidance, editorial previews, 200 ms debounced search combobox with arrow-key navigation, size modal, sale-unit cart count, wishlist count, view switcher and explicit QA role simulator |
| Home | Four working feel filters, four category tiles, featured products, interactive numbered bed recipes, recipe preload into the builder, fabric comparison and an honest verified-review empty state |
| Catalog and search | Category/subtype, regional size, dimensions, fitted depth, fiber, weave, construction, color family, relative feel, price and stock facets; URL state, removable chips, sorting, pagination, live color swatches and required-size Quick Options |
| Product details | Responsive 7/5 gallery and purchase layout, zoom, room imagery, dimensions/contents diagram, explicit cover/insert disclosures, regional dimensions and pocket depth, availability, three 10-step feel meters, assessment disclosure, care tabs, compatible items and exact-SKU builder entry |
| Cart | One shared implementation for the 480 px drawer and durable cart route; expandable bed groups, tier savings, edit-look navigation, line controls with discount/shipping-loss previews, contextual named-bundle cushion addition, standalone addition, exact free-shipping progress and explicit promo feedback |
| Checkout and receipt | Guest/account contact, validated delivery, editable review, quote-change handling, duplicate-submit protection, atomic pending-order creation, immutable receipt, actual 15-minute hold countdown, two-minute warning, expiry recovery and save-purchased-look action |
| Guides | Shareable fabric guide separating fibers from constructions; interactive US Twin/Queen/King dimensions, metric/inch conversion and pocket-depth fit checks |
| Linked destinations | Functional recipe/SKU/cart-edit bed builder, My Sanctuary order/look/wishlist entry and guarded Admin CMS entry with draft/publication controls. These support Phase 2 navigation and shared-state verification. |

All requested Phase 2 files are present. Supporting components live under `src/components`, storefront state under `src/context/StorefrontContext.tsx`, and catalog/filter helpers under `src/lib/storefront.ts`.

## Architecture and transaction integrity

- Components consume `useCommerce`; monetary calculations, tiers, promotions, stock and order creation remain in `src/lib/commerce-engine.ts`.
- The existing 16 products, 119 variants and 12 swatches are retained. Fiber and weave remain separate, and dimensions are canonical millimetres with explicit inch displays.
- Added strict `cart.add_to_bundle` and `cart.replace_bundle` commands. Named upsells target one exact bundle, respect slot caps, and validate the entire mutation before commit.
- Guest checkout snapshots inline contact and delivery details without silently changing the profile or address book. New order bundle snapshots preserve purchased compositions for later saving.
- A cart can be repaired by removing unavailable lines. Increases and checkout still enforce purchase availability.
- The external-store subscription now occurs within each `useCommerce` consumer. Server snapshots remain stable through deferred hydration even when browser storage already contains different CMS/cart data.
- Browser commits retain Web Locks, revision checks, idempotency, validate-before-persist behavior and cross-tab synchronization. View switching never grants a QA role.
- Holds begin only after the complete pending order commits. The receipt counts down the actual stored deadline; the application does not invent a reservation while merchandise merely sits in a cart.

## Automated results

| Check | Result |
| --- | --- |
| `npm run build` | Passed; optimized production build, TypeScript and CSS compilation; 37 generated pages |
| `npm run lint` | Passed; zero errors and zero warnings |
| `npm run test:commerce` | 24 passed; zero failures, skipped tests or cancellations |
| Production HTTP route checks | 32/32 returned HTTP 200 and the application main landmark, including all 16 seeded product pages |
| Invalid category | Not-found content and `noindex` confirmed; final warmed request returned HTTP 404. Next.js may keep HTTP 200 when a not-found result occurs after streaming begins, as documented in the installed framework guide. |
| Fresh production browser session | Zero captured console errors or warnings across the inspected storefront, catalog, Quick Options and size guide |
| `git diff --check` | Passed |
| Source marker scan | No TODO, FIXME or placeholder markers in `src` |

The commerce tests cover tier examples and largest-remainder conservation, shipping-aware non-stacking promo comparison, strict contracts, stale-quote rejection, rollback, idempotency, named-bundle changes, guest snapshots, correlated SKU facets, broken-cart repair, reservation expiry, concurrent last-unit checkout, synchronization, storage failures and role/view separation.

## Browser evidence

- Search for linen returned the matching products; keyboard navigation opened the selected product.
- Selecting Queen and adding one linen sheet set produced one sale unit. Applying REST8 changed merchandise from $310.00 to $285.20. Delivery added $15.00, producing a $300.20 pending QA order with captured amount $0.00.
- Guest order QA-000006 committed once, displayed its running stock hold and allowed the purchased bed to be saved.
- The Quiet morning recipe added three sale units atomically: $400.00 subtotal, $40.00 bundle saving and $360.00 total with free shipping.
- Removing the cushion previewed the two-group tier: $17.50 savings, $332.50 merchandise, $15.00 shipping and $347.50 total. Shipping progress showed $17.50 remaining.
- Adding the named matching cushion back to Quiet morning restored three groups, the 10% tier and free shipping.
- Removing a catalog size filter restored the three percale products. Selecting Sage transferred that named color into Quick Options. Add to cart stayed disabled until a size was chosen; Queen then showed $200.00, 1,524 × 2,032 mm and a 406.4 mm pocket.
- The size guide accepted the default 12-inch depth and rejected an 18-inch depth for the 16-inch fitted pocket.
- Mobile layouts were inspected at 390 px and 320 px widths; header wrapping and hero sizing were corrected.

Evidence files: `artifacts/phase-2-storefront.png`, `artifacts/phase-2-mobile.png` and `artifacts/phase-2-route-checks.json`. Browser verification used the local fixture store; the pending QA order, saved look and test cart may remain in that localhost browser scope. No real charge or external communication occurred.

## Operating boundary

This is a complete local/Vercel-compatible QA storefront against the requested device-persisted engine. Browser storage is not secure authorization, shared multi-device inventory, ERP accounting or a payment authority. A production commerce launch requires authenticated backend transactions and connected payment reconciliation.

Catalog facts and assessments remain explicitly synthetic. Unsplash photographs are editorial references, not exact SKU/color or texture evidence. Where true macro photography is absent, the gallery explains that absence rather than labelling a room photograph as a verified texture macro. The contents diagram is generated from the selected product data. No verified reviews are seeded or fabricated. Marketing publication must supply approved merchant facts, exact assets and genuine review records.

Build, lint and browser smoke checks do not establish field Core Web Vitals or full assistive-technology certification. Measured performance budgets and a wider accessibility audit remain launch checks. The owned local preview server is stopped after verification; start the application with the normal project scripts when needed.
