# Phase 1 verification

Verified on 18 October 2026. Phase 1 supplies the shared commerce foundation; the storefront, builder, account and Admin route interfaces are outside this file-level phase. The existing home page remains unchanged apart from the shared provider and QA notice.

## Architecture and operating boundary

The requested browser engine deliberately replaces the specification's backend authority for this QA phase. It persists one device-scoped customer, catalog, cart, orders and CMS state under `bedding-commerce:qa:v1`. It does not provide authentication, real payments, ERP accounting, multi-device persistence or secure staff authorization. Roles are explicit QA simulations, held in memory separately from the view switcher. No credentials or payment details are stored.

`src/lib/commerce-engine.ts` and `src/lib/commerce-contracts.ts` contain server-compatible domain functions and strict runtime schemas. `src/context/CommerceContext.tsx` supplies the client provider, `useCommerce`, persistence and synchronization. This separation follows the installed Next.js Server/Client Component guidance and React's external-store hydration contract. No mutable customer singleton exists on the server.

Browser writes acquire a Web Lock, reread the committed snapshot, validate the command, apply all changes to a private copy, check invariants, and persist before notifying subscribers. Revision conflicts reject stale edits. A failed validation or storage write cannot commit a partial order, stock adjustment or cart mutation. Native storage events synchronize tabs; same-document events synchronize additional providers. Foreground/online recovery rereads storage. Browsers without Web Locks expose read-only state. Invalid persisted data is preserved and reported, never silently replaced with seeds.

The persisted payload is bounded to 4,000,000 estimated UTF-16 bytes. `exportData()` supplies an export before starting another QA session. Schema version mismatches fail explicitly. Browser storage remains subject to the user's clearing and quota settings.

## Requested files

| File | Delivered behavior |
| --- | --- |
| `src/app/globals.css` | Tailwind v4 theme; every Section 2.1 HEX token; exact shadows; font aliases; focus, reduced-motion, forced-color and safe-area behavior |
| `src/app/layout.tsx` | Self-hosted Google fonts through `next/font/google`; Cormorant Garamond 500/600; Inter 400/500/600/700; provider and QA metadata |
| `src/types/commerce.ts` | All requested interfaces plus commands, inventory, fulfillment, undo, audit and persistence contracts; separate fiber/weave; canonical mm/kg and explicit inch display values |
| `src/lib/seed-data.ts` | 12 exact swatches, 16 products, 119 sellable variants, regional dimensions, 3 bed recipes, 5 varied order fixtures, saved looks, wishlist, profile, addresses, bed preferences, promotions and hero content |
| `src/context/CommerceContext.tsx` | Shared state and typed command dispatch, quote/simulation functions, persistence, synchronization, hydration, QA roles/view state and environment/error notices |

Zod 4.6.7 is pinned for strict schemas. `getCommerceJSONSchemas()` exports versioned command, state and quote JSON Schemas. Unknown fields and invalid scalar coercions are rejected.

## Domain verification

- One/two/three eligible groups receive 0%/5%/10%. Separate bundles qualify independently. Sale exclusions, five cushion positions, one foundation/main top/throw and compatible insert links are enforced. Inserts and repeated cushions do not create groups. Throw-only Top selections cannot acquire the complete-bed label.
- All monetary transport uses supported currency precision and safe integer minor units. BigInt intermediates avoid multiplication overflow. Discounts round half up once per bundle, then allocate by largest remainder with stable line-ID ties.
- The three-group example reconciles to 40,000 subtotal, 4,000 discount and 36,000 merchandise total. Removing cushions reconciles to 35,000 subtotal, 1,750 discount and 33,250 merchandise total.
- Promo comparison chooses one whole-cart candidate, includes shipping thresholds and configured tax, and prefers bundle pricing on ties. Shipping-only stacking requires explicit permission. Redemption limits include committed holds and release unpaid cancelled/expired claims.
- Quotes expire after five minutes or an earlier relevant policy, promotion or sale boundary. Checkout rechecks the entire accepted commercial projection and stock. It rejects forged or stale quotes and binds each cart revision to one checkout, including retries with different command keys.
- Orders keep independent payment, fulfillment and return states. QC, dispatch and delivery require evidence. Partial dispatch, delivery, cancellation and physical returns conserve quantities. Refunds cannot exceed captured funds and do not restock goods. QA capture/refund actions are explicitly named simulations.
- Order-time line, address and discount snapshots remain immutable when catalog, policy or address-book data changes. Unpaid stock holds expire after 15 minutes. New device seeds anchor sample orders to initialization time so their pending hold is usable immediately.
- Wishlist moves are atomic and offer ten-second undo. Reversal removes only the moved quantity; if cart or checkout revisions changed, the wishlist is restored and cart/order contents are retained with an explanatory result.
- Saved looks support drafts, rename, duplicate, delete, ten-second undo and Recently deleted restoration within 30 days. Unavailable selections remain inspectable.
- Product, promotion, policy and CMS drafts remain separate from live records. Publication checks revisions; policy publication checks both the live and draft versions. Product archival retains historical identities and stock lineage. CMS supports scheduling and audited rollback.
- Address and bed defaults are exclusive. Email changes require a future connected identity-verification service. Stock adjustments validate their revision, reason and evidence and cannot consume reserved units. `preview()` simulates commands without persistence.

## Check results

| Check | Result |
| --- | --- |
| `npm run build` | Passed; optimized Next.js build, TypeScript and CSS compilation, static generation |
| `npm run lint` | Passed with zero warnings and zero errors |
| `npm run test:commerce` | 20 tests passed, zero failures |
| `git diff --check` | Passed |
| Requested semantic color scan | Zero missing HEX values |
| Implementation marker scan | Zero TODO, FIXME or placeholder markers in the seven implementation files |
| Production HTTP smoke check | HTTP 200; provider and QA disclosure server-rendered |
| Browser smoke check | Production page loaded; zero captured browser warnings/errors |
| Six unique Unsplash fixture URLs | All returned HTTP 200 with image content types |
| `npm audit --omit=dev` | Zero reported production dependency vulnerabilities |

The tests exercise exact pricing examples, rounding conservation, sale exclusions, insert compatibility, shipping-aware promo comparison, strict input validation, idempotency, shortage rollback, multiple bundles, slot caps, reservation expiry, promo limits, undo, partial fulfillment, immutable snapshots, default addresses, inventory previews, catalog publication, CMS schedules/rollback, policy-edit conflicts, synchronized stores, storage failure and view/role separation.

All product facts, origin statements, prices, stock, feel assessments, fulfillment evidence and technical-sheet references are explicitly synthetic QA fixtures. They are not verified supplier claims. The reachable Unsplash images are labelled editorial references, not exact variant photographs or compositing assets. Actual merchant data and media approvals are required for commercial publication.

## Version baseline and references

Node 22.17.0; Next.js 16.4.2; React/React DOM 19.3.0; Tailwind CSS and its Turbopack integration 4.3.3; TypeScript 5.9.3; Zod 4.6.7. Frappe/ERPNext are not installed or connected in this phase.

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js font optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Tailwind custom shadows](https://tailwindcss.com/docs/box-shadow)
- [Zod strict object schemas](https://zod.dev/api)

Future ERP integration must replace local authority with authenticated, owner-scoped Frappe commands using Document controllers, supported stock/payment workflows, durable transactions and after-commit events. The shared domain contracts and deterministic calculations can be reused, but browser state must not become a trusted payment, role or inventory input.
