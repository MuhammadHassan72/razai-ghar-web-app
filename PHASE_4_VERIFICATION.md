# Phase 4 verification — RAZAI GHAR

Verified on 19 October 2026 in the existing workspace.

## 1. Critique and deployment boundary

The workspace is an explicitly labelled, device-only QA commerce environment. A browser role simulator cannot provide production authentication or protect private records from the device owner. No identity provider, ERPNext server, payment processor, carrier API or consented attribution service is configured. Authentication/recovery pages expose the disconnected dependency without collecting passwords, sending fictitious email or claiming a verified session. Finance capture/refund actions are clearly labelled QA simulations; they never transfer money. Bundle conversion is reported as unavailable rather than invented from fixture traffic.

## 2. Architecture

The account and Admin panels share CommerceProvider and the existing validated commerce-engine commands. Mutations retain revision checks, stable command idempotency, Web Locks serialization, immutable accepted-order snapshots and cross-tab notifications. Draft edits remain separate from publication. Product changes reach the Storefront and Builder after publication; order actions update the same projection shown in My Sanctuary.

Installed Next.js 16.4.2 App Router guidance was read from node_modules/next/dist/docs before implementation. Interactive route handlers sit behind Suspense, including the account/Admin catch-all routes. The storefront shell excludes its navbar/footer on Admin routes. Existing RAZAI GHAR image, wordmark, fonts and storefront tokens are retained.

An external Frappe integration remains a separate deployment dependency: scoped server sessions and authenticated controller-backed commands must replace device QA authority when that integration is configured. This phase does not claim to implement an ERP server or an identity provider.

## 3. Production implementation in the QA adapter

### Authentication and customer account

- Sign-in, registration, recovery, reset and verification routes; explicit Guest / Customer / Admin demo transitions; allowlisted internal return targets; persistent cart and builder draft are retained.
- My Sanctuary desktop 224px navigation and mobile disclosure, overview, named default-bed summary, saved-look and wishlist previews, snapshot freshness and refresh action.
- Order search, date/status filters and pagination, immutable line/address/discount details, timestamped five-milestone tracker, QC hold explanation, separate parcel quantities, payment/return activity, and buy-again review.
- Atomic buy-again rejects stock shortages, stale carts and concurrent reviewed-price changes without partially adding a batch.
- Composite saved-look previews and dimensions; Builder entry, duplicate, rename with expected revision, 10-second undo deletion, 30-day Recently Deleted restoration, and fresh-quote atomic purchase.
- Variant/product wishlist entries, required Quick Options, move-to-cart and timed undo.
- Profile, independent marketing consent preferences, named beds with mm/inch measurements, exclusive default bed, and address CRUD with atomic shipping/billing defaults. Email changes remain identity-verification dependent.

### Admin and back office

- 240px dark sidebar, 64px desktop header, white tables/cards, Inter/tabular numerals, responsive navigation, section-level QA role guards and engine-enforced mutation permissions.
- Executive reporting dates/timezones/currency; Total Revenue labelled Net merchandise revenue, captures/refunds, separate Payment-Pending queue, Active Orders, unavailable attribution disclosure, category allocations and low-stock alerts; fulfillment queue and data freshness.
- Revenue uses dated financial amounts and original discounted line/category snapshots. Shipping/tax are excluded. A single historical full QA capture can be reconstructed from its existing capture event and immutable total; unknown financial history is flagged and excluded.
- Search/filter/paginated catalog; create from an explicitly disclosed QA template; seven-tab editor covering overview, fiber composition, separate weave/construction, assessed feel, GSM/TC/mass, variants/pricing/sales, stock workflows, named HEX swatches, media/rights, care/fit and SEO/publishing.
- Draft saving, Preview, publication, archive and validated deletion restricted to never-published drafts. Existing stock identities and historical order references are preserved. New variants publish with zero stock until reconciled. Concurrent catalog revisions preserve unsaved edits and require reload.
- Inventory balances, available stock, warehouse/low-stock filters, reason/evidence-based count adjustments, threshold changes and validation/confirmation. Reservations cannot be consumed by an adjustment.
- Order queue filters, 720px inspection drawer, full detail URLs, legal next actions, QC evidence, selected-quantity dispatch/cancellation/returns, carrier/tracking/delivery references, refund preview/confirmation and audited QA financial events. Physical return receipts and refunds remain separate operations.
- Promo creation, enable/disable publication, category/usage/date constraints, full typed record editing and exact current-cart simulation; versioned bundle-policy editing and representative recipe simulation; hero/CTA/media/announcement/featured-product drafts, mobile/desktop content preview, publication/archive and rollback.

## Verification results

| Check | Result |
|---|---|
| npm run build | PASS — optimized production build, TypeScript and CSS compilation; 44 prerender targets generated; dynamic account/Admin/detail handlers included |
| npm run lint | PASS — zero errors and zero warnings |
| npm run test:commerce | PASS — 41 tests, zero failures/skips |
| HTTP route checks | PASS — 31 checked URLs returned HTTP 200 |
| Source markers | No TODO/FIXME, coming-soon or unimplemented feature markers found in src |
| git diff --check | PASS — only existing Windows LF/CRLF informational warnings |

The nine added domain checks cover atomic buy-again rollback and price races, role/revision/range checks for swatches and stock thresholds, unpublished-only deletion and zero-stock publication, competing refunds with immutable snapshots, event/date/category revenue reporting, atomic featured-content versions, safe redirects/currency precision, and truthful legacy capture reconstruction.

Browser verification covered the warm account dashboard, intact 5-unit guest cart across auth/demo navigation, staff guard, Admin dashboard, seven editor tabs, unchanged product draft/save/publication, and legal QC/refund actions in order inspection. The unchanged QA catalog record used for the save/publish check was republished with the same title, pricing, materials and inventory; audit revisions were retained. Existing customer data was not cleared.

## Artifacts and preview

- artifacts/phase4-commerce-tests.log — final test output.
- artifacts/phase4-route-checks.json — checked URL/status matrix.
- artifacts/phase4-auth.png — authentication dependency and demo screen.
- artifacts/phase4-admin.png — final Admin dashboard preview.
- artifacts/phase4-account.png — final My Sanctuary preview.

The production preview is left running at http://localhost:3100. Open /sign-in to switch demo sessions, /account for My Sanctuary, and /admin for the back office. QA roles deliberately reset on a full page reload; cart, builder and commerce data persist on this device.
