# RAZAI GHAR — Complete Feature & Operations Guide

Master user manual, staff operating guide and developer handover for Phases 1–4. Checked against the implemented source on **19 October 2026**.

## Contents

1. [Project overview and operating boundary](#1-project-overview-and-operating-boundary)
2. [Technology, architecture and source map](#2-technology-architecture-and-source-map)
3. [Local setup, checks and Vercel deployment](#3-local-setup-checks-and-vercel-deployment)
4. [Complete route map](#4-complete-route-map)
5. [Guest, Customer and Admin demo sessions](#5-guest-customer-and-admin-demo-sessions)
6. [Public storefront and product discovery](#6-public-storefront-and-product-discovery)
7. [Cart, promotions, checkout and receipts](#7-cart-promotions-checkout-and-receipts)
8. [Create Your Own Bed customizer](#8-create-your-own-bed-customizer)
9. [My Sanctuary customer dashboard](#9-my-sanctuary-customer-dashboard)
10. [Admin catalog and inventory operations](#10-admin-catalog-and-inventory-operations)
11. [Admin orders, fulfillment, returns and refunds](#11-admin-orders-fulfillment-returns-and-refunds)
12. [Admin promotions, bundle policy and homepage CMS](#12-admin-promotions-bundle-policy-and-homepage-cms)
13. [Executive analytics and operational monitoring](#13-executive-analytics-and-operational-monitoring)
14. [Seed catalog, sizes, swatches and sample orders](#14-seed-catalog-sizes-swatches-and-sample-orders)
15. [Persistence, recovery and troubleshooting](#15-persistence-recovery-and-troubleshooting)
16. [Acceptance walkthrough and commercial integration handover](#16-acceptance-walkthrough-and-commercial-integration-handover)
17. [Repository and documentation maintenance](#17-repository-and-documentation-maintenance)

## 1. Project overview and operating boundary

RAZAI GHAR is a luxury bedding application combining an editorial storefront, a three-step bed customizer, the **My Sanctuary** customer dashboard and a staff **Admin CMS**. All panels operate against one shared Commerce Engine, so catalog publication, cart changes, inventory adjustments, saved looks, orders and content updates use the same rules and data.

The implemented adapter is a **device-only QA environment**. It works locally and as a Next.js deployment without requiring ERPNext. Its initial data includes 16 product families, 119 variants, 12 colors, three curated bed recipes, five sample orders, three saved looks, three wishlist entries, a customer profile, a default address and a named bed. Returning browsers retain their changes, so their counts may differ from this initial seed.

### What the application actually does

- Calculates current prices, bundle tiers, non-stacking promo comparisons, shipping qualification and market-configured tax.
- Validates dimensions, insert compatibility, stock, quantities, ownership scope and expected revisions.
- Atomically persists cart changes, pending orders and inventory reservations on this device.
- Tracks distinct payment, fulfillment and physical-return states with immutable order snapshots.
- Supports catalog/CMS drafts, explicit publication, audit history, undo and cross-tab synchronization.

### What is intentionally disconnected

| Dependency | Current behavior |
| --- | --- |
| Identity service | Demo sessions only; no password collection, real registration, verification email or recovery email |
| Payment provider | Checkout creates a pending QA order; Finance actions simulate capture/refund without moving funds |
| ERPNext/Frappe | No installed or connected ERP server; no shared warehouse ledger or accounting integration |
| Carrier API | Staff manually enter carrier, tracking and delivery evidence; no automatic carrier polling |
| Qualified builder analytics | No verified attribution collection; bundle conversion is shown as unavailable |
| Commercial product evidence | Fiber origins, GSM, thread counts, feel assessments, prices and stock are synthetic QA fixtures |
| Exact photographic previews/reviews | Unsplash images are editorial references; no exact supplier-approved layer assets or verified reviews are fabricated |

The QA Role Simulator is not secure authorization. A browser owner can inspect or alter browser storage. Do not enter real customer, payment or credential data during demonstrations. Deploying this adapter on Vercel does not turn it into an authenticated, multi-customer commerce backend.

## 2. Technology, architecture and source map

### Pinned stack

| Component | Implemented baseline |
| --- | --- |
| Framework | Next.js **16.4.2**, App Router, Turbopack, Cache Components and partial prefetching |
| UI runtime | React / React DOM **19.3.0** |
| Language | TypeScript **5.9.3** |
| Styling | Tailwind CSS v4, pinned **4.3.3**, with `@tailwindcss/turbopack` |
| Contracts | Zod **4.6.7**, strict runtime command/state/quote schemas |
| Icons | `lucide-react` **1.59.0** |
| Tested local Node | **22.17.0**; use Node 22.x to match the tested major |
| Persistence | `localStorage` key **`bedding-commerce:qa:v1`** |
| Coordination | Web Locks, storage events and same-document commit notifications |
| Typography | Cormorant Garamond 500/600; Inter 400/500/600/700 via `next/font/google` |

### How a change reaches every panel

1. A component reads `useCommerce()` and prepares a typed command.
2. `useCommerceAction()` guards duplicate submissions and retains an idempotency key for retries of the same intent.
3. The store acquires a Web Lock and rereads the committed snapshot.
4. The engine validates the strict command and permissions, expected revisions and domain rules.
5. It applies changes to a private working copy and validates the resulting state.
6. Only a successful persistence write commits that copy. Subscribers are then notified.
7. Mounted storefront, account, builder and Admin consumers render the committed state. Same-origin tabs receive the update too.

No component owns a second pricing calculator. Monetary transport uses integer minor units plus currency/precision. BigInt intermediates protect multiplication, discounts round half up once, and largest-remainder allocation distributes exact minor units with stable line-ID tie breaks.

| Source | Responsibility |
| --- | --- |
| `src/types/commerce.ts` | Money, catalog, dimensions, selection, quote, cart, order, profile, policy, CMS and command types |
| `src/lib/commerce-contracts.ts` | Strict Zod schemas and exported versioned JSON Schemas |
| `src/lib/commerce-engine.ts` | Pure, server-compatible calculations, validation and atomic command application |
| `src/context/CommerceContext.tsx` | Client store/provider, hydration, persistence, QA roles, clock and live subscriptions |
| `src/context/StorefrontContext.tsx` | Shared dialogs, cart/Quick Options overlays, notifications and mutation feedback |
| `src/lib/seed-data.ts` | Deterministic initial QA fixtures and sample orders generated through the engine |
| `src/lib/storefront.ts` | Catalog filters, feel links, dimension formatting, images, prices and availability helpers |
| `src/lib/bed-builder.ts` | Builder entry contexts, slots, fit, size reconciliation and purchased compositions |
| `src/lib/backoffice.ts` | Reporting, reorder review, safe return targets and exact money-input helpers |
| `src/components/` | Reusable layout, catalog, product, builder, cart, checkout, account and Admin interfaces |
| `tests/commerce.test.mjs` | Node test runner and TypeScript-to-test compilation for domain/store verification |
| `src/app/globals.css` | Exact warm/admin theme tokens, tactile styles, focus and responsive behavior |
| `public/Razai ghar logo.jpeg` | Official logo used by the shared `BrandLogo` component |

The storefront uses `#F7F3ED` canvas, `#FFFCF7` surfaces and `#31483D` primary controls. Admin uses `#F3F5F7` canvas, white surfaces, `#16212B` navigation and Inter with tabular numerals. The Admin shell omits the storefront navbar/footer; checkout has a focused branded header.

## 3. Local setup, checks and Vercel deployment

### 3.1 Install and run

From the repository root, with Node 22.x and npm installed:

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. To use the preview port used in phase verification:

```powershell
npm run dev -- --port 3100
```

For a production-mode preview:

```powershell
npm run build
npm run start -- --port 3100
```

Stop a foreground server with `Ctrl+C`. Use one server for a chosen port. Do not run a production build while a server is actively depending on the same `.next` output; stop it, build, then restart. The same-origin storage scope includes the port: `localhost:3000` and `localhost:3100` have separate QA data.

### 3.2 Verification commands

```powershell
npm run build
npm run lint
npm run test:commerce
```

Run the commerce tests after the build, rather than concurrently with it: the test harness writes compiled test modules under `.next/commerce-tests`. The Phase 4 baseline passed build/TypeScript/CSS compilation, lint with zero warnings/errors, and **41 commerce tests**. It also generated 44 prerender targets and checked 31 URLs with HTTP 200 responses. The phase reports record historical checks; they are not a substitute for rerunning checks after later changes.

`next/font/google` obtains fonts during a build and serves the resulting assets with the application. A build environment needs access to the configured font source; runtime product images use the approved `images.unsplash.com` host. See [Next.js font optimization](https://nextjs.org/docs/app/api-reference/components/font).

### 3.3 Deploy the existing repository on Vercel

1. Sign in to Vercel and choose **Add New / New Project**.
2. Connect the GitHub account that can read `MuhammadHassan72/razai-ghar-web-app`, then import that repository.
3. Select the repository root as the project root. Set the framework preset to **Next.js**.
4. Keep the framework-managed output directory. Do not configure this application as a plain static export or serve only `public/`.
5. Use the repository's `npm run build` script. Keep npm/lockfile detection, or set installation to `npm ci` for reproducible lockfile installation; install development dependencies because TypeScript and Tailwind participate in the build.
6. Select **Node.js 22.x** in Build and Deployment settings to match the tested major. `package.json` currently has no `engines.node` override.
7. This QA adapter requires no ERP, payment or identity secrets. Deploy, inspect build logs, then test the resulting HTTPS URL.
8. Set `main` as the intended production branch and inspect the Git deployment configuration. Use separate preview deployments for review.

These steps follow Vercel's [Git import flow](https://vercel.com/docs/git), [framework/build settings](https://vercel.com/docs/builds/configure-a-build) and [Node version settings](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Vercel manages Next.js deployment behavior through its [Next.js integration](https://vercel.com/docs/frameworks/full-stack/nextjs).

On the deployed site, visit `/sign-in`, enter the Admin demo, publish a draft change and open My Sanctuary in another tab at the **same origin** to check synchronization. A new Vercel hostname, another browser/device, or cleared storage starts with its own seed. Publishing CMS changes in your browser does not deploy shared merchant content to all visitors. Metadata remains QA/no-index oriented; genuine public indexing and backend authority require a commercial launch change.

## 4. Complete route map

Paths below are relative to the active origin. Bracketed values are real record identifiers, not text to enter literally. Customer and Admin sub-routes use client-driven catch-all handlers; unsupported sections display an unavailable-section message rather than implementing extra workflows.

### 4.1 Public and authentication routes

| URL | Purpose and entry behavior |
| --- | --- |
| `/` | Editorial hero, feel shortcuts, categories, featured collection, Shop This Bed recipes, fabric comparison and review disclosure |
| `/shop` | Complete published catalog with URL-backed filters, sort and pagination |
| `/shop/sheets` | Sheets category: sheet sets and fitted-sheet-only products |
| `/shop/duvet-covers` | Duvet covers, with separate insert disclosures |
| `/shop/blankets-throws` | Blankets, weighted blankets and foot-of-bed throws |
| `/shop/cushions` | Decorative cushion covers and actual shape/dimension choices |
| `/shop/inserts` | Separately sold pillow/cushion and duvet inserts |
| `/shop/[category]` | The category route pattern used by the five category URLs above |
| `/search?q=linen` | Search results using the same catalog facets and sort behavior |
| `/products/[slug]` | Product gallery, variant selection, price/availability, feel, contents, care and compatibility |
| `/create-your-bed` | Durable draft or fresh three-step bed customizer |
| `/cart` | Full-page cart using the same logic as the cart drawer |
| `/checkout` | Guest/account Contact → Delivery → Review & payment; commits pending QA orders |
| `/orders/confirmation/[token]` | Stored QA receipt, real reservation countdown, order details and save-purchased-look actions; current tokens are order IDs, not signed authentication credentials |
| `/guides/fabrics` | Shareable fiber/weave/construction comparison guide |
| `/guides/sizes` | Interactive regional dimensions and fitted-pocket calculator |
| `/sign-in` | Demo session entry, safe return navigation and disconnected identity-service state |
| `/register` | Registration-oriented screen with demo entry; does not create a real identity |
| `/forgot-password` | Recovery screen; no recovery email is sent by the disconnected adapter |
| `/reset-password` | Reset-oriented dependency screen; no password or reset token is processed |
| `/verify-email` | Verification-oriented dependency screen; no email ownership is verified |
| `/icon.jpeg` | Branded application icon asset served by the App Router |

Examples of actual product URLs are `/products/atelier-percale`, `/products/rivage-linen`, `/products/cloud-sherpa` and `/products/velour-cushion`. Section 14 lists all 16 seeded product slugs.

### 4.2 Customer routes

| URL | Purpose |
| --- | --- |
| `/account` | My Sanctuary overview, greeting, current order, looks, wishlist and default bed |
| `/account/orders` | Own-device order search, fulfillment/date filters and pagination |
| `/account/orders/[id]` | Immutable order detail, tracker, shipments, activity, receipt and Buy again |
| `/account/looks` | Saved looks, composition previews, edits, fresh purchase and Recently Deleted |
| `/account/wishlist` | Saved product/variant entries, Quick Options, Move to cart and Undo |
| `/account/profile` | Profile, units/locale/consent and named mattress preferences |
| `/account/addresses` | Address creation/edit/deletion and default shipping/billing management |
| `/account?tab=orders` | Retained legacy shortcut to the orders view |
| `/account?tab=looks` | Retained legacy shortcut to saved looks |
| `/account?tab=wishlist` | Retained legacy shortcut to wishlist |

`/account/orders/qa-1-5` is the seeded Processing-order detail. A Guest visiting an account route receives a sign-in/demo entry screen. All fixture records belong to the single QA customer scope; selecting staff does not create another customer.

### 4.3 Admin routes

| URL | Purpose |
| --- | --- |
| `/admin` | Executive overview and operational queues |
| `/admin/products` | Search/filter/paginated catalog and draft list |
| `/admin/products/new` | Choose a QA template, create a new editable product family and variants |
| `/admin/products/[id]` | Seven-tab product editor, Preview, Save draft, Publish, archive/deletion |
| `/admin/orders` | Fulfillment/payment queue tabs and 720px inspection drawer |
| `/admin/orders/[id]` | Direct order inspection URL with the same legal-action workflow |
| `/admin/inventory` | Warehouse balances, stock reconciliation and reorder thresholds |
| `/admin/inventory?low=1` | Inventory opened with the low-stock filter selected |
| `/admin/promotions` | Promo-code drafts/publication, quote simulation and bundle-policy versions |
| `/admin/content` | Homepage/announcement drafts, preview, featured products and rollback |
| `/admin/analytics` | Executive KPI reporting with date, timezone and currency controls |
| `/admin/settings` | Integration dependency status and recent audit activity |

The staff guard and section permissions apply before the section renders. Existing products use product IDs matching their seeded slugs; newly created records use generated IDs, while their public URLs use the entered slug.

### 4.4 Builder entry links and shareable filters

| Query | Example | Effect |
| --- | --- | --- |
| `recipe` | `/create-your-bed?recipe=quiet-morning` | Load the named Shop This Bed recipe |
| `sku` | `/create-your-bed?sku=ATELIER-PERCALE-CHALK-SHEET-SET-QUEEN` | Load an exact SKU into its supported bed slot |
| `look` | `/create-your-bed?look=look-qa-1` | Open the saved look with revision-aware saving |
| `bundle` | `/create-your-bed?bundle=[bundle-id]` | Edit an existing cart bundle with atomic replacement |
| `order` | `/create-your-bed?order=qa-1-5` | Build from a stored purchased composition |
| `returnTo` | `/sign-in?returnTo=/checkout` | Use an allowlisted internal destination after Customer demo entry |

Use one builder entry context at a time. Conflicting or missing recipe/SKU/look/bundle/order references produce an explanation; no unrelated product is silently substituted. An insert SKU alone cannot establish a cover composition: choose its compatible cover first. Account/Admin IDs and new QA records generally make sense only in the browser scope that contains those records.

## 5. Guest, Customer and Admin demo sessions

### 5.1 Fastest entry through `/sign-in`

1. Open `/sign-in`.
2. Choose **Continue as guest** to browse `/` with Guest behavior.
3. Choose **Continue as demo customer** for `/account`, or the supported `returnTo` destination. A customer return target under `/admin` is redirected to `/account`.
4. Choose **Explore Admin as demo staff** to select `administrator` and open `/admin`.

No real account or server session is created. The email field and **Check identity service** action explain the missing identity dependency; they do not send mail or validate credentials. Cart contents and the builder draft remain in the same device store through these transitions.

### 5.2 Navbar View Switcher / QA Role Simulator

1. From a storefront/account page, click the account icon, labelled **Account and view switcher**. On mobile, open navigation and choose **Account & view switcher**.
2. In **Your space**, choose Storefront or My Sanctuary.
3. In the **QA role simulator** dropdown, select the role to test.
4. After selecting a staff role, **Admin CMS** becomes available. Choose it to enter the back office.

The Guest button in this menu is explicitly labelled **Enter QA customer session** when opening My Sanctuary; it switches the demo role to Customer. Other view navigation does not independently grant staff permissions. Selecting Guest returns to the storefront. From My Sanctuary, **Leave customer demo** also selects Guest without clearing merchandise or drafts.

### 5.3 Reload and role scope

- QA role/view state is held in memory. A full reload resets the role to the implementation's initial **Customer** role, not an authenticated session.
- Client-side navigation normally preserves the selected role.
- Reloading `/admin` can therefore show the staff guard. Select a staff role in its simulator, or return to `/sign-in`.
- Cart, catalog, orders, content, looks and durable builder data remain in local storage. Resetting a role does not reseed commerce data.

### 5.4 Staff permissions

| Role | Admin sections visible | Principal mutation scope |
| --- | --- | --- |
| `administrator` | Every section | All supported QA commerce/CMS operations |
| `catalog_editor` | Products and Inventory | Catalog/swatches/drafts/publication/archive; no physical stock override or refunds |
| `inventory_manager` | Products and Inventory | Stock adjustments and thresholds; product editor is read-only |
| `fulfillment_operator` | Orders | Legal processing, QC, shipment, delivery, cancellation and physical return actions |
| `finance` | Overview, Orders and Analytics | QA capture/refund; cannot substitute for fulfillment evidence |
| `marketing_manager` | Promotions and Content | Promo, policy and content drafts; final promo/policy/content publication requires Administrator |
| `customer` / `guest` | No staff sections | Storefront/customer behavior, with Guest account-entry guard |

The Admin header simulator makes role testing convenient. Unauthorized mutations are also rejected by the engine; hiding controls is not the only check. These are QA permissions within one device, not production identity or data-isolation guarantees.

## 6. Public storefront and product discovery

### 6.1 Header, search and home page

The desktop primary header is 72px high; the mobile primary header is 64px. The announcement is a separate, wrap-safe CMS-controlled area. The official logo and wordmark appear in desktop/mobile navigation, footer, focused checkout and receipts.

- **Bedding mega-menu:** category links, fiber versus weave guidance and two editorial previews. Use keyboard focus/activation to open it; dialogs/disclosures support Escape and return focus on close.
- **Search:** suggestions update after a 200ms debounce. Use arrow keys to navigate results and Enter to select/submit. Full results at `/search` retain catalog filters.
- **Size guide:** open the guide modal or visit `/guides/sizes`.
- **Wishlist badge:** counts saved entries, not units inside a set.
- **Cart badge:** counts sale units. One sheet set is one sale unit, even though it includes multiple components.
- **Editorial home:** hero CTA/copy, featured products and announcement read published CMS state. Numbered Shop This Bed hotspots correspond to the listed recipe items. **Customize this look** loads the recipe into the builder.
- **Reviews:** the interface explains the absence of verified reviews; fixture reviews are not presented as verified purchases.

### 6.2 Feel Shortcuts

| Shortcut | Actual `/shop` query | Meaning |
| --- | --- | --- |
| Light & airy | `?breathability=7-10&warmth=1-4` | Higher breathability with lighter warmth |
| Crisp & cool | `?weave=Percale&warmth=1-4` | Percale surface and lighter warmth |
| Soft & draping | `?softness=7-10&drape=1` | Higher softness plus Sateen or French Linen |
| Warm & cozy | `?warmth=7-10` | Higher warmth scores |

Scores are relative QA assessments with method disclosures, not clinical or universally comparable laboratory ratings. Null/unassessed values do not masquerade as measured scores.

### 6.3 Filtering, sorting and Quick Options

Use the desktop **Refine your layers** sidebar or the mobile filter drawer. Available facets include category, product role/subtype, actual regional dimensions, minimum width/length in mm, minimum fitted-pocket depth, fiber, weave, construction, color family, warmth/breathability/softness bands, price and in-stock status. Bands are generally 1–3, 4–6 and 7–10; home shortcuts may supply a narrower explicit range.

**Fiber is the material** (Egyptian Cotton, French Linen, Cotton, Merino Wool). **Weave/construction is how it is made** (Percale, Sateen, Waffle, Chunky Knit, fleece). A cotton fabric can have different weaves; selecting Egyptian Cotton does not implicitly select Sateen.

Selections appear as removable chips. Clear one chip or reset all filters. Filters are stored in the URL, so links can be copied. Multiple choices within a facet are alternatives; different facets combine. Size/color/stock/price constraints must match the same sellable variant, preventing a product with an in-stock red Twin and sold-out blue King from falsely matching an in-stock blue King request.

Sort options include featured, price low/high and newest. Results are paginated. Cards display current variant prices, appropriate GSM/TC facts and named color radios with 44px hit targets. Selecting a swatch updates the card variant/image/price state; editorial imagery is still a reference and may be shared between colors.

**Quick Options** opens a drawer for the required size/variant. Confirm color, actual dimensions and available stock. Add is disabled until required options resolve. A product-only wishlist entry uses this same drawer before moving to cart.

Useful parameter names include `category`, `role`, `size`, `min_width`, `min_length`, `depth`, `fiber`, `weave`, `construction`, `color`, `warmth`, `breathability`, `softness`, `min_price`, `max_price`, `stock=1`, `drape=1`, `q`, `sort` and `page`. Prices in storefront filters use displayed major units; dimension bounds use mm. Let the UI generate canonical size IDs and encoded labels.

### 6.4 Product detail page

1. Inspect the main/room images, zoom, available texture information and contents diagram in the seven-column desktop gallery.
2. In the five-column purchase panel, confirm title, price, selected color, size/dimensions, pocket depth, quantity and stock.
3. Read the exact included parts. **Duvet cover** and **cushion cover** do not imply an insert. Inserts are separate priced SKUs unless the contents explicitly include one.
4. Compare **Softness**, **Warmth** and **Breathability**, each on ten steps, with the method/assessment notes.
5. Use fabric, dimensions/contents and care/delivery tabs. TC is threads per square inch where meaningful; GSM and total weighted-blanket kg are separate measurements.
6. Add the exact variant, save it to wishlist, or choose **Build around this** to enter the builder using its SKU.
7. Inspect Compatible Items for related merchandise and dimension-matched inserts.

The gallery does not relabel a room photograph as a verified fabric macro. Where true approved texture photography is missing, it explains that limitation. An archived product may retain historical information while purchasing is disabled.

### 6.5 Fabric and size guides

The fabric guide distinguishes Egyptian Cotton and French Linen fibers from Percale/Sateen weaves and Chunky Knit/Sherpa/Waffle constructions. Use it to compare surface, feel and care context; use the actual product record for its particular composition and assessment.

For pocket fit:

1. Choose the market/mattress reference: US Twin, Queen or King.
2. Select inches or millimetres. Unit switching converts the entered measurements.
3. Measure mattress width, length and full depth including any topper.
4. Read the fit result against the actual fitted size and its measurement tolerance/pocket depth.

A deeper pocket does not correct the wrong width or length. Seeded fitted pockets are 16in / 406.4mm; the default 12in mattress depth fits that pocket, whereas an 18in mattress depth does not. Width/length must be positive and no more than 5,000mm; depth must be positive and no more than 1,000mm.

## 7. Cart, promotions, checkout and receipts

### 7.1 Cart drawer and durable cart

The cart icon opens a 480px drawer; `/cart` provides a durable full page. Both use the same cart component and engine logic.

- Expand a named bed bundle to inspect its real sale lines, separately selected inserts, tier badge and savings.
- Use **Edit look** to change that exact bundle in the builder. Replacement preserves its bundle identity.
- Standalone items remain separate and do not silently become bundle group members.
- Quantity/removal actions show relevant discount or shipping consequences. Unavailable lines can still be removed to repair a cart.
- Removing/reducing a bundled line updates the composition and tier. Slot limits cannot be bypassed by arbitrary quantity increases.

**Matching Cushion Upsell** selects an actual available, compatible cushion. **Add to [named bed bundle]** fills an eligible empty cushion slot in that bundle; **Add as a separate item** stays standalone. The target is explicit, and a full five-cushion bundle cannot receive a sixth slot.

### 7.2 Free-shipping progress

```text
T = configured free-shipping threshold
Q = shipping-eligible merchandise after the winning merchandise discount
Remaining = max(0, T - Q)
Progress = min(100, 100 × Q / T) when T is positive
```

The US QA threshold is **$350** of discounted qualifying merchandise. Ground shipping is **$15** below the threshold; fixture tax is **0%**. These are configured test policies, not actual shipping promises or a tax determination.

Example: $400 merchandise minus a $40 bundle discount leaves $360 qualifying merchandise and unlocks shipping. If qualifying merchandise is $330, $20 remains. A shipping promo can waive the shipping charge without making merchandise reach the progress threshold. Shipping/tax remain estimates until a supported destination is supplied; an unconfirmed zero shipping amount is not an unconditional free-shipping promise.

### 7.3 All pre-seeded promo codes

| Code | Benefit | Important distinction |
| --- | --- | --- |
| `REST8` | 8% off eligible merchandise | Competes with bundle pricing; does not add another 8% to a 10% bed tier |
| `LINEN30` | $30 fixed discount against eligible merchandise, capped by eligible value | The name does **not** restrict it to linen; the seeded eligible-category list is empty, meaning all categories |
| `SHIPQUIET` | Waives the configured ground shipping charge when eligible | Seeded stacking is `none`; it competes with the bundle candidate rather than automatically stacking |

All three start published and enabled, with these shared seed rules:

- Valid from `2026-01-01T00:00:00.000Z` until the exclusive end `2099-12-31T23:59:59.000Z`; timezone metadata is UTC.
- US market, web channel, USD; minimum **$100 eligible merchandise subtotal before discount**.
- No excluded variants or restricted categories; sale merchandise is excluded.
- No additional maximum-discount cap; global usage limit 1,000 and per-customer limit 5.
- No stacking. The engine supports explicitly configured shipping-with-bundle stacking, but none of these seeds enables it.

Enter a code in the drawer or full cart and apply it. Feedback distinguishes unavailable, inactive/expired, ineligible, usage-limit and better-alternative states. Only one whole-cart candidate wins: compare final payable including shipping/tax effects. **Bundle wins a tie.** A valid code may remain unchosen because it is less valuable than the bundle discount. Configure a destination to compare actual shipping benefits.

Checkout claims promo usage with the order/stock transaction. Unpaid cancelled or expired holds release their usage claim; a financial refund is not automatically a new unused redemption. Existing browser/Admin changes can alter all these rules, so inspect the current published record when a seed code behaves differently.

### 7.4 Checkout and reservation timing

1. Open checkout with a repairable, available cart.
2. **Contact:** enter the name/email needed for the QA order. Guest checkout does not silently replace the stored customer profile.
3. **Delivery:** choose or enter a supported address and shipping method. Address line 2 is optional. US addresses require a two-letter state and valid ZIP format. Saved-address defaults and order-time snapshots remain separate.
4. **Review & payment:** inspect exact lines, discounts, destination, shipping, tax and the no-charge QA explanation. Completed contact/delivery sections can be edited.
5. If prices, policy, cart or stock changed, choose **Refresh price & availability**, review again and acknowledge the updated test order.
6. Select **Create pending QA order**. The engine validates the accepted quote and cart revision and commits one order with all required stock reservations. Duplicate retries do not create duplicate orders.

The **15-minute hold begins after the complete pending order commits**, not when an item is added to cart or when checkout opens. No card data is requested. Payment stays Pending until an authorized QA Finance capture.

The receipt counts down the stored reservation deadline, warns with two minutes remaining and does not reset the timer on reload. At expiry, unpaid reservations are released and the order reflects the expiry/cancellation outcome. Refresh/rebuild the cart at current price and stock for a new attempt; do not treat an expired order as paid.

### 7.5 Receipt and purchased compositions

The receipt shows the brand, reference, payment/fulfillment status, immutable sale lines and allocations, destination, totals and hold state. **Save purchased look** stores a reusable composition. **Open in Builder** can use the order entry link to inspect or adapt the purchased selection.

New bundle orders retain their original bundle compositions. A legacy standalone order is projected into the supported bed slots: first applicable foundation/main top/throw and up to five cushions. This is not an unlimited reconstruction of every possible standalone line; inserts require their compatible cover relationship.

## 8. Create Your Own Bed customizer

### 8.1 Entry, layout and draft behavior

Start from the navbar, a home recipe, an exact PDP SKU, a saved look, a purchased order or a cart bundle's Edit look link. With no explicit entry link, the builder resumes its device draft.

Desktop uses a 12-column grid with a seven-column sticky preview, five-column selector and 32px gap. Tablet supports 6/6 or stacked flow. Mobile uses a compact 4:3 stage, expandable item summary, sticky bottom price/action area and full-screen **View bed** with its own close action.

Confirm the actual mattress fit. Steps can be **open**, **configured** or explicitly **skipped**. Current selections can be quoted while another step is open, but atomic add/update requires every step to be configured or deliberately skipped. Advancing the visual step alone does not declare a missing item valid.

Draft autosave uses revisions; a session recovery buffer protects a recent local edit before debounced persistence finishes. A competing edit presents a conflict/load/keep decision. Do not resolve it by assuming the last rendered tab owns the latest revision.

### 8.2 Step 1 — Foundation

1. Choose market and bed size, and confirm mm/inch dimensions and measured pocket fit.
2. Select **Sheet Set** or **Fitted-Sheet-Only**.
3. Use Egyptian cotton/French linen or Crisp percale/Smooth sateen shortcuts to narrow available products.
4. Choose an exact named color radio and compatible size/variant.
5. Read included components. A seeded sheet set includes a fitted sheet, flat sheet and sleeping pillowcases; a fitted-only unit does not acquire those extras.
6. If no foundation is wanted, choose **Skip step** explicitly.

Included sleeping pillowcases are part of the foundation sale unit. They do not count as decorative cushions or separate bundle groups; no sleeping insert is implied by a case.

### 8.3 Step 2 — Top layer and optional throw

Choose one main duvet cover or blanket. Available fixtures include Percale/Sateen/linen duvet covers, Merino Chunky Knit, Sherpa Fleece, Waffle and a weighted blanket.

- For a duvet cover, use the separately priced **compatible duvet insert** option if wanted. The selected insert must match actual cover dimensions.
- For a weighted blanket, read total kg mass and usage/care limitations. GSM and total mass are different facts; the illustration is not medical suitability advice.
- Add **None** or one optional foot-of-bed throw. Its coverage disclosure matters: a throw is not automatically a bed-covering main top.
- Explicitly Skip step if no top/throw is wanted. Skipping removes that step's draft merchandise and attached inserts; it is different from a preview visibility toggle.

### 8.4 Step 3 — Decorative cushions

Configure up to five named positions individually. Choose available cover material/color and actual dimensions: 18×18in square, 20×20in square, 26×26in Euro or 14×22in lumbar. Choose **Cover only** or **Cover + Compatible Pillow Insert** for each position.

Rear square cushions render before front/lumbar positions. Clicking an editable cushion or its position control selects that slot. Repeated identical covers may aggregate into one commerce line with a quantity, while each visual position and insert link remains distinct. Five covers are still one qualifying Cushions group. Skip unused positions or the whole step explicitly.

### 8.5 Preview layers and inspection controls

The deterministic coordinate stage is **2400×1800**, aspect ratio 4:3.

| Render order | Visual layer | Merchandise rule |
| --- | --- | --- |
| 0 | Room, base frame, headboard and mattress context | Marked styling only; not a purchased bed frame/mattress |
| 10 | Fitted foundation | Exact selected foundation variant reference and named swatch |
| 20 | Flat-sheet fold | Visible only for a selected sheet set whose contents include a flat sheet |
| 30 | Main top | Distinct symbolic surface/drape patterns for the selected weave/construction |
| 40 | Optional throw at the foot | One selected throw, with coverage disclosed |
| 50 | Included sleeping pillows/cases | Driven by set contents; case/insert distinctions remain explicit |
| 60–64 | Five decorative cushion positions | Fixed positions and stable rear/front ordering |

Use **Show foundation**, **Show top layer** and **Show all** for inspection only. Hidden preview layers remain in the merchandise list, quote and eventual cart. **Zoom texture** opens fiber/GSM/TC/mass/care facts and approved texture media when available, otherwise an explicitly labelled construction diagram. **View bed** provides the mobile full-screen view. A text-equivalent item/dimension list accompanies the stage.

The stage is labelled **QA illustration**. It uses actual seed HEX colors and symbolic textures; no supplier-approved aligned product layers or genuine macros are implied. **Reset** first reviews what will be cleared; local **Undo** restores the previous composition. Undoing a reset does not reverse an already committed cart or saved-look command.

### 8.6 Queen-to-King compatibility protection

When changing size mid-build, review the proposed changes before applying them. The builder preserves choices that have a unique verified equivalent with the **same product, color, fiber and weave** in the new size. It also resolves any compatible attached insert dimensions.

Example: Quiet morning Queen uses a $200 foundation and $150 duvet cover. A same-color King equivalent can become $240 and $190, while its $50 decorative cover remains. The illustrated three-group subtotal becomes $480, the 10% saving $48 and merchandise $432.

If that exact color has no verified King equivalent, the slot remains unresolved with its original intent visible; the builder does not silently choose another color. Resolve the slot or skip it before purchase. The size-change summary exposes replacements, retained choices, missing alternatives and price effects.

### 8.7 Bundle tier mathematics

| Distinct eligible groups in one bundle | Initial tier |
| --- | --- |
| One | 0% |
| Two | 5% |
| Three | 10% |

The groups are **Foundation**, **Top layer** and **Decorative Cushions**. A selected optional throw belongs to Top; it does not create a fourth group. Separately selected inserts and included sleeping cases do not qualify a new group. Sale lines are excluded by the initial policy and cannot on their own create an eligible group.

Apply the selected rate to eligible current merchandise amounts, not shipping/tax or ineligible sale lines. Each bundle qualifies independently; standalone items and another bundle cannot complete its missing group. Slot limits are one foundation, one main top, one throw, five cushion covers and at most one selected compatible insert per cover. The live quote shows exclusions and exact line allocations.

```text
Three groups: $400.00 subtotal − $40.00 discount = $360.00 merchandise
Remove cushions: $350.00 subtotal − $17.50 discount = $332.50 merchandise
```

The quote expires after five minutes or an earlier relevant sale/promotion/policy boundary. Refresh after expiry or commercial changes. Old asynchronous quote results cannot replace a newer selection quote; the atomic commit validates the quote again.

### 8.8 Save, add and edit a bundle

**Save This Bed Look:** enter a name of at most 60 characters and inspect the composition summary. When opened from an existing saved look, choose update or save a separate copy. Updates use the expected saved-look revision. Saving a look is not reserving stock or locking prices.

The main purchase CTA says **Add Complete Bed Bundle to Cart** only when there is a valid foundation, bed-covering main top and at least one decorative cushion. Otherwise it says **Add selected items to cart**. A throw-only top does not make a complete bed. Blocking fit, unresolved choices, open steps, unavailable stock or stale quotes must be resolved first.

Successful addition commits all selected merchandise together and opens the Cart Drawer. A failure commits none of that bundle. The successful-add state provides a way to view the added bundle rather than accidentally re-adding unchanged merchandise.

When editing an existing cart bundle, the CTA is **Update bed bundle in cart**. Review its before/after tier, savings and resulting whole-cart quote, then confirm. `cart.replace_bundle` replaces that exact composition atomically while preserving its identity; it does not append another bundle. Exiting without confirming leaves the committed cart bundle unchanged.

### 8.9 Seeded Shop This Bed recipes

| Recipe | Builder URL | Composition |
| --- | --- | --- |
| Quiet morning | `/create-your-bed?recipe=quiet-morning` | Chalk Atelier percale sheet set, Chalk Atelier duvet cover, Sage 18in Rivage cushion cover |
| Linen retreat | `/create-your-bed?recipe=linen-retreat` | Oat Rivage linen sheet set, Oat Rivage duvet cover, Clay lumbar Rivage cushion cover |
| Winter layering | `/create-your-bed?recipe=winter-layering` | Chalk Heirloom sateen sheet set, Oat Alpine Merino blanket, Mushroom Euro Dune cushion cover |

These recipes initially use Queen references. Optional throws/inserts are selected separately unless present in the actual loaded composition. Editorial recipe descriptions/photos are inspiration; the selected line list is the purchase authority.

## 9. My Sanctuary customer dashboard

The warm customer shell uses a 224px desktop side navigation and a mobile disclosure menu. It includes snapshot revision/freshness, **Refresh data**, a greeting, active-order preview, looks/wishlist previews and the default named-bed summary. It does not invent loyalty balances or measured customer KPIs.

### 9.1 Orders and five milestones

Open **Orders**, search a reference, filter fulfillment and placed-date range, then select **View order**. Dates in the list filter use UTC dates; displayed event times use the viewer's environment/locale and expose precise timestamps. Lists paginate at 20 orders.

```text
Order Placed → Processing → Quality Check → Shipped → Delivered
```

The tracker uses actual recorded QA events, not decorative completed steps. Payment status is independent: Order Placed does not mean Paid. QC holds show their reason and inspection reference. A parcel reaching Shipped or Delivered does not complete unshipped quantities: inspect separate shipment cards, tracking references and each line's shipped/delivered/cancelled/returned counts.

Order detail preserves the purchased SKU, color, dimensions, included parts, unit/net amounts, discount allocations, policy version and order-time address. Later catalog/address edits do not rewrite the receipt. Activity, cancellation, physical-return and financial-refund information remain distinguishable.

**Buy again** opens a review of today's prices and stock against original quantities. Changed prices are marked; unavailable lines are retained in the review but excluded from the proposed purchase. Confirmed available lines are added atomically as **standalone sale lines**, with current cart pricing and promotions. This does not reconstruct the original bundle discount automatically. A stale cart, new shortage or changed reviewed unit price rejects the entire addition; review again before retrying.

### 9.2 Saved Bed Looks

Open **Saved bed looks** to inspect a composite QA stage, size/dimensions, selected-layer count and last update.

| Action | Result |
| --- | --- |
| Open in Builder / Edit composition | Load that look's composition with availability/fit review |
| Duplicate | Create a separate look; original remains unchanged |
| Rename | Save a name up to 60 characters using the expected revision |
| Delete | Move to Recently Deleted, with a ten-second Undo banner |
| Recently Deleted → Restore | Recover a deleted look during its 30-day restore window |
| Buy this look | Create a fresh quote and review today's lines, stock, savings, warnings and expiry before atomic bundle addition |

If a look changed in another tab, close/reopen or load the current version rather than overwriting newer data. Missing/archived selections remain inspectable and require resolution in the builder. A saved price is not a guaranteed future purchase price.

Undo is time-bounded; Recently Deleted is the longer recovery path. Expired archive records may be purged during subsequent engine maintenance/mutations. There is no unrelated bulk-delete action in this interface.

### 9.3 Wishlist

Wishlist entries may identify a whole product or one exact variant. **Move to cart** uses the stored variant; **Choose options & move** opens Quick Options for product-only entries. Unavailable entries remain visible and cannot be moved until resolved.

The ten-second **Undo move** reverses only the moved quantity where it is safe. If subsequent cart changes or checkout make reversal unsafe, the wishlist entry is restored while newer cart/order contents are retained with an explanation. Undo never cancels an accepted order. A separate **Remove from wishlist** action removes an entry without claiming restock-alert subscription functionality.

### 9.4 Profile, named beds and addresses

**Profile & beds:** edit display name, optional international-format phone, locale, preferred units and independent email/SMS marketing consent. Preferences are stored locally; no marketing message is sent. Email is read-only because verified email changes require the disconnected identity service.

**Named beds:** add/edit/delete a bed with a name up to 40 characters, configured market/regional size, measured width/length/depth, metric/imperial entry, feel preference, exposed fiber/color-family preferences and a default flag. Inch entry converts using 25.4mm per inch; storage remains canonical mm. Setting one default clears another default atomically. Stored measurements aid later selection but do not override a product's fit constraints.

**Addresses:** add a label, recipient, street, optional second line, city, region, postal code, configured country and optional international phone. US state/ZIP validation applies. Shipping and billing defaults are independent exclusive flags; saving one default updates the previous default in the same transaction. Deleting an address does not delete or rewrite historical order delivery snapshots.

## 10. Admin catalog and inventory operations

Choose an authorized staff role before opening Admin. Use **Products & variants** to search title/SKU, filter publication/category/fiber and inspect variants, current base-price range, available stock and modified time. Lists paginate at 25 products. A published product may also have unpublished draft changes.

### 10.1 Add a new product — complete workflow

1. Open `/admin/products/new` with Administrator or Catalog Editor.
2. Choose an existing **QA product family template** close to the desired role. Click **Create editable draft**. This copies disclosed fixture metadata and creates new product/variant/stock identities; it does not copy physical inventory balances.
3. Enter a distinct title and lowercase hyphenated public slug. Review every tab below, including all copied evidence/media/contents.
4. For each variant, set its unique SKU, named color, actual canonical size, sale unit, integer price, compatibility and active state. Remove unpublished duplicates or disable historical variants rather than changing their stock identity.
5. Click **Save draft**. Address all strict validation errors; a complete draft is required.
6. Use **Preview** and review the merchandise/variant facts. A draft alone does not change the published storefront or builder.
7. Click **Publish**. Publication promotes the reviewed family and variants atomically. New variants have **zero on-hand stock** and a default reorder threshold until reconciled.
8. Select Inventory Manager or Administrator and perform a validated physical stock adjustment. Now test the published, active, compatible, in-stock variant through storefront Quick Options and the builder.

If another tab changes the product, the editor preserves the local unsaved composition, shows the revision conflict and requires **Reload latest** before saving over that record. Navigation away from a dirty product editor asks whether unsaved edits should be abandoned.

### 10.2 Seven-tab editor reference

| Tab | What staff configure/check |
| --- | --- |
| Overview | Title, slug, category, sellable role, plain-text description, insert inclusion and exact included parts/quantities/disclosures |
| Materials & feel | Fiber percentages/origin/evidence, separate weave/construction, GSM, meaningful TC, weighted kg, 1–10 assessments or Not assessed, per-axis notes, method, rubric, date, evidence and QA disclosures |
| Variants & pricing | Unique SKU, named color, actual dimensions/pocket, sale UOM, base price, scheduled sale, enabled/bundle/shipping flags, verified bed sizes, compatible inserts and media bindings |
| Inventory | Read-only catalog context plus separate role-authorized stock reconciliation; no direct balance overwrite |
| Media & preview | Approved-host image URL, descriptive alt, rights/source reference, kind and pixel dimensions; add/remove media and review assignments |
| Care & fit | Wash temperature or not applicable, drying, bleaching, ironing, limitations and references to actual per-variant fit data |
| SEO & publishing | SEO title up to 70 characters, description up to 180, public slug, publication state, archive or unpublished-only deletion |

Fiber rows must sum to **100%**. Egyptian Cotton is a fiber, not a weave; Percale is a weave, not a composition row. Variants inherit the family's chosen fibers and weave when saved. TC is not meaningful for knitted, fleece or weighted construction and must be absent there. Weighted construction needs total kg mass. An assessment may be explicitly Not assessed rather than a fabricated score.

Variant dimensions must use a size record for the selected product role. A duvet insert must match a duvet cover's actual dimensions; a cushion insert must match its cover. Existing inventory/warehouse identities cannot be replaced through product editing.

Admin prices use **minor units**, clearly labelled with currency/precision. With USD precision 2, `20000` means `$200.00`, not `$20,000`. A scheduled sale must be below base price with coherent start/end dates and reference price. Dates in the forms are labelled UTC.

### 10.3 Named HEX swatches

In **Variants & pricing**, click **Create named color swatch**. Enter a unique 2–40 character name, a six-digit `#RRGGBB` HEX via text/color picker and a color family. Save, then select it for the relevant variants and save/publish the product draft. A swatch record alone does not create a sellable size/color combination. Displayed colors include a physical-swatch/screen-variation disclosure.

### 10.4 Publish, archive and delete semantics

**Save draft** and **Publish** are distinct actions. Draft prices/materials/media are not live. Publish validates the full family and advances revisions; current quotes may need refreshing. The Storefront and Builder read the same published products/variants, but availability and verified role/size compatibility still determine which options can be purchased.

**Archive product** withdraws it from public purchasing and disables variants while retaining stock identities and order history. Published/historical products are not hard-deleted. **Permanently delete unpublished draft** is available only for a never-published draft, requires impact validation and confirmation, and has no trash recovery. Preserve drafts you may need before using that action.

### 10.5 Warehouse stock reconciliation

1. Open **Inventory**, or the product's Inventory tab, with Inventory Manager/Administrator.
2. Search SKU/product, select warehouse and optionally enable **Low stock only**.
3. Read **On hand**, **Reserved**, **Available = On hand − Reserved**, threshold and revision.
4. Choose **Reconcile** and **Physical count adjustment**.
5. Enter the signed change in sale units, a reason and count-sheet/evidence reference. Example: counted 22 versus 20 on hand means `+2`, not a new balance of `22` in the delta field.
6. Review projected on-hand/available values, choose **Validate adjustment**, then **Commit inventory change**.

An adjustment must change stock and cannot reduce on-hand below reserved quantities. A competing revision or invalid count commits nothing. Adjustments are audited and synchronize to storefront availability and builder purchase checks. Stock is not reserved merely because a customer has a cart.

To edit an alert threshold, select the **Reorder threshold** workflow, enter a nonnegative integer and reason, validate and confirm. Low stock is based on enabled SKU/warehouse availability at or below threshold; incoming stock is not counted as available stock.

## 11. Admin orders, fulfillment, returns and refunds

Open **Orders & fulfillment** with Administrator, Fulfillment Operator or Finance. Search reference/customer and use queue tabs: **All**, **Payment pending**, **Ready to process**, **Quality check**, **Ready to ship**, **Exceptions**, **Completed**. Lists paginate at 25 orders. Operational tabs reflect current state; not every paid-looking order is ready for every action.

Select **Inspect** for a 720px desktop drawer with its own close control; mobile fits the viewport. **Open full order URL** gives a direct inspection route. The drawer includes immutable order detail, timeline, quantities, shipping address, shipments and legal next actions. Action selection is a list of permitted transitions, not an arbitrary status editor.

### 11.1 Normal processing path

| Stage/action | Required inputs and operating rule |
| --- | --- |
| QA Capture (Finance/Admin) | Pending, unexpired stock hold; evidence/reconciliation reference. Explicit simulation captures the immutable QA total; no real payment occurs |
| Processing | Paid, accepted unfulfilled quantities reserved in the assigned warehouse; warehouse and reason |
| Start QC | Processing or QC hold; inspection reference, responsible operator and completed checklist entries, one per line |
| QC Pass | Current Quality Check; recorded outcome/reason. Enables dispatch only when other payment/stock conditions also hold |
| QC Hold | Current Quality Check; reason explaining the hold. Customer tracker exposes the hold and inspection reference |
| Shipped | Prior passed QC, eligible paid/reserved quantities; choose exact line quantities, carrier, service, tracking reference, delivery-note reference and dispatch evidence |
| Delivered | Select one outstanding shipment and enter actual/manual delivery evidence; only its quantities become delivered |

For each operation, fill evidence, choose **Validate & review action**, inspect effects and **Confirm**. Validation does not itself commit. The final command checks the expected order revision again. A stale competing action fails cleanly and requires review of the latest order.

To demonstrate live updates, keep `/account/orders/[id]` open in another tab at the same origin. Commit an allowed staff transition and inspect its new timestamp/status in My Sanctuary. Do not promise cross-device synchronization; the device adapter coordinates same-origin tabs.

### 11.2 Split shipments, cancellation and returns

**Split shipment:** dispatch only selected eligible quantities. Remaining units stay unshipped/reserved as appropriate. The aggregate can become Partially shipped or Partially delivered; separate parcel cards retain their own carrier/tracking and delivery timestamps.

**Cancellation:** select eligible unfulfilled quantities and enter a reason. Review released reservations and the payment consequence. Captured money is not automatically refunded; shipped goods are not cancelled as if they never left the warehouse. Remaining accepted quantities retain their own workflow.

**Receive return:** only eligible delivered, not-yet-returned quantities can be received. Enter the physical receipt reference, reason and warehouse; check saleable/restock only when the physical units should return to available stock. Returned quantities and inventory update independently of a monetary refund. Do not restock simply because Finance posted a refund.

### 11.3 Refund workflow

1. Select Finance or Administrator and inspect the order.
2. Choose the explicitly labelled **QA simulation · Refund** action.
3. Read remaining refundable captured funds, original total and net merchandise. Amounts retain original discount allocations; retained items are not repriced using today's catalog tiers.
4. Enter the refund amount in displayed currency, reason and evidence reference.
5. Validate, inspect the confirmation amount and financial/stock consequences, then confirm.

Refund amount must be positive and no more than captured funds minus already recorded refunds. Concurrent operators cannot each refund against the same stale order revision. The QA engine records dated financial events and changes payment state to Partially refunded or Refunded. It does not call a provider, transfer money or automatically receive/restock a return.

Real provider refunds would additionally require durable operation claims, unknown-outcome reconciliation and provider idempotency; those are outside the disconnected QA adapter. An expired Pending order cannot be captured by changing a UI status string.

## 12. Admin promotions, bundle policy and homepage CMS

### 12.1 Create, simulate and publish a promo

1. Use Marketing Manager/Administrator and open **Promotions & bundles**.
2. Click **Create promo code**. Enter name, unique normalized uppercase code and percentage/fixed/shipping benefit.
3. Configure minimum eligible subtotal, optional maximum discount, UTC validity, global/per-customer usage limits, enabled state, category eligibility and sale treatment.
4. Use **Advanced typed record** for complete fields such as timezone, market/channel restrictions, excluded variant IDs and permitted stacking. **Apply record to form** parses/validates JSON; it is not publication.
5. **Simulate with current cart** shows the actual engine candidate, winning payable, warnings and line allocations. Put representative merchandise in the QA cart before simulating an empty basket.
6. **Save promo draft** persists a draft without changing live pricing.
7. Select Administrator, review, then **Publish draft**. Use **Disable live promotion** to archive an active live code. To re-enable/change it, edit enabled state in a new saved draft and publish it.

Percentage fields use basis points where labelled: `800` = 8%. Fixed monetary controls use currency minor units. Validate coherent dates, currency, limits and exclusions. Only an explicitly configured shipping benefit may request shipping-with-bundle stacking; ordinary merchandise percent/fixed codes cannot silently stack.

### 12.2 Bundle policy editing and simulation

In the policy panel, inspect live version and draft version. Edit the three group percentages (initially 0/5/10), enabled flag and sale-item treatment. The complete typed record also exposes effective dates, eligible groups, excluded SKUs, maximum discount, slot limits and refund policy reference.

Choose a representative recipe and **Simulate draft tiers** to inspect exact merchandise allocations and savings. Tiers must be nondecreasing, percentage bounds valid and slot limits supported. **Save policy draft** does not change the live policy. An Administrator uses **Publish policy version** after review. Both live and draft versions are checked to prevent a stale publish. New quotes use the published version; accepted orders retain their original policy snapshot and allocations.

### 12.3 Homepage hero, featured products and announcement

1. Open **Homepage CMS** as Marketing Manager/Administrator.
2. Edit the existing hero or announcement record. Headline limit is 80 characters, supporting copy 180, CTA label 28 and announcement 120.
3. Set primary/secondary CTA labels and safe internal routes. Arbitrary HTML or unsafe redirects are rejected.
4. Review desktop/mobile image URL, alt text and existing media/rights data. Use the complete typed record for focal points, locale, priority and other supported fields.
5. Select published Featured Products. Click order is display order; deselect/reselect to change ordering. This references products rather than copying their data.
6. Set UTC start/end schedule. Use **Preview content** at 390px and 1440px; this local preview is not a signed externally shared draft URL.
7. **Save content draft**, then use Administrator **Publish draft**. Saving does not modify the public hero, announcement or featured list.
8. Use **Archive live content** to withdraw it. **Restore published r…** promotes an available previous published version as a new audited revision.

Publication revalidates featured references. Scheduled content must be published and active for its locale/page/placement; a future start can explain why a newly published banner is not visible yet. Same-device panels/tabs update from the committed CMS state. Changes are not written back to `seed-data.ts` or shared across visitors without a future backend.

## 13. Executive analytics and operational monitoring

Administrator and Finance can open Overview/Analytics. Default reporting is the last 30 complete reporting days. Choose reporting dates, timezone and one currency. Operational queues are current snapshots; revenue uses financial event dates. Read the displayed revision/freshness and **Refresh data** before acting on stale information.

| KPI/report | Implemented meaning |
| --- | --- |
| Total Revenue | Subtitle **Net merchandise revenue**: dated merchandise capture allocations minus dated merchandise refunds; excludes shipping/tax and uses original line discounts |
| Active Orders | Paid/financially accepted nonterminal orders with accepted unfulfilled quantities; the Payment-Pending queue is shown separately |
| Bundle Conversion Rate | **Unavailable** because qualified sessions and verified seven-day paid attribution are disconnected; QA/staff traffic must not be counted as real conversion |
| Category Breakdown | Net merchandise allocations by immutable order-time category, with value/share; later catalog recategorization does not rewrite history |
| Low-Stock Alerts | Enabled, published SKU/warehouse balances with available quantity at or below reorder threshold |

The interface also shows gross merchandise captures, merchandise refunds and fulfillment queue counts. It never adds unlike currencies. Category share is unavailable when net revenue cannot support a meaningful positive denominator. A physical return affects revenue after its financial refund, not merely because a return receipt exists.

Older device records may lack explicit financial amounts. One historical full QA capture can be derived from its single existing capture event and immutable order total because the QA capture command always captures the full total. Unknown refund/date history is flagged and excluded; the dashboard does not invent event amounts/timestamps. This operational report is not an ERP general-ledger revenue statement.

**Settings & integrations** reports disconnected services/storage state and the most recent 30 audit entries with action, role, reason and revision change. It does not expose a working ERP credential-configuration wizard.

## 14. Seed catalog, sizes, swatches and sample orders

### 14.1 Initial catalog: 16 products / 119 variants

Each public product URL is `/products/` plus the slug. Materials and assessments below are QA fixtures, not supplier certification.

| Slug | Product | Role | Fiber / weave |
| --- | --- | --- | --- |
| `atelier-percale` | Atelier Egyptian Cotton Percale Sheet Set | `sheet_set` | Egyptian Cotton / Percale |
| `heirloom-sateen` | Heirloom Egyptian Cotton Sateen Sheet Set | `sheet_set` | Egyptian Cotton / Sateen |
| `rivage-linen` | Rivage French Linen Sheet Set | `sheet_set` | French Linen / Plain Weave |
| `essential-fitted` | Essential Organic Cotton Fitted Sheet | `fitted_sheet` | Organic Cotton / Percale |
| `atelier-duvet` | Atelier Percale Duvet Cover | `duvet_cover` | Egyptian Cotton / Percale |
| `rivage-duvet` | Rivage French Linen Duvet Cover | `duvet_cover` | French Linen / Plain Weave |
| `heirloom-duvet` | Heirloom Sateen Duvet Cover | `duvet_cover` | Egyptian Cotton / Sateen |
| `alpine-knit` | Alpine Merino Chunky Knit Blanket | `blanket` | Merino Wool / Chunky Knit |
| `cloud-sherpa` | Cloud Recycled Sherpa Fleece Blanket | `blanket` | Recycled Polyester / Sherpa Fleece |
| `honeycomb-waffle` | Honeycomb Cotton Waffle Blanket | `blanket` | Cotton / Waffle |
| `grounded-weighted` | Grounded Cotton Weighted Blanket | `blanket` | Cotton / Plain Weave; weighted construction |
| `highland-throw` | Highland Cashmere Throw | `throw` | Cashmere / Twill |
| `rivage-cushion` | Rivage Linen Cushion Cover | `cushion_cover` | French Linen / Plain Weave |
| `velour-cushion` | Dune Cotton Textured Cushion Cover | `cushion_cover` | Cotton / Twill; slug retained despite product title |
| `down-pillow` | European Down & Feather Cushion Insert | `pillow_insert` | 20% European Down / 80% Feather; Plain Weave metadata |
| `allseason-duvet` | All Season European Down Duvet Insert | `duvet_insert` | 80% European Down / 20% Feather; Plain Weave metadata |

Cloud Sherpa **Sand** variants have seeded sale prices: Twin $95 versus $115 base, Queen $125 versus $145, King $165 versus $185. Other colors do not automatically share that sale. Current UI prices can differ after Admin publication.

### 14.2 Canonical dimensions

| Mattress/cover | Inches | Canonical mm, rounded for reading |
| --- | --- | --- |
| US Twin mattress | 39 × 75 | 990.6 × 1,905 |
| US Queen mattress | 60 × 80 | 1,524 × 2,032 |
| US King mattress | 76 × 80 | 1,930.4 × 2,032 |
| 18in square cushion cover | 18 × 18 | 457.2 × 457.2 |
| 20in square cushion cover | 20 × 20 | 508 × 508 |
| Euro cushion cover | 26 × 26 | 660.4 × 660.4 |
| Lumbar cushion cover | 14 × 22 | 355.6 × 558.8 |

Fitted pockets are 16in / 406.4mm in the seed. Duvet/blanket coverage sizes are product-role size records, not mattress dimensions; read the actual chosen SKU. `SizeSpec` stores mm, explicit inch displays and a measurement tolerance. Total mass uses kg. Named regional labels never replace actual dimensions.

### 14.3 Twelve named fabric swatches

| Color | HEX | Family |
| --- | --- | --- |
| Chalk | `#F2EEE6` | White |
| Oat | `#D9CBB6` | Beige |
| Flax | `#B7A58A` | Beige |
| Sand | `#C8B49B` | Tan |
| Mushroom | `#9A8C80` | Taupe |
| Clay | `#B77B64` | Terracotta |
| Rosewater | `#D9B6AD` | Pink |
| Sage | `#A2AB94` | Green |
| Olive | `#737B5C` | Green |
| Mist | `#A9BABD` | Blue |
| Slate | `#596A75` | Blue |
| Charcoal | `#3B3B38` | Gray |

Not every product supports every swatch/size. Selecting an unavailable combination must be resolved using an actual variant, not inferred from the palette.

### 14.4 Five initial order fixtures

| Reference | ID | Initial payment | Initial fulfillment | Suggested demonstration |
| --- | --- | --- | --- | --- |
| QA-000001 | `qa-0-5` | Pending | Placed | Actual 15-minute hold, permitted QA capture before expiry, expiry release |
| QA-000002 | `qa-1-5` | Paid | Processing | Start QC and inspect tracker update |
| QA-000003 | `qa-2-5` | Paid | Quality Check | QC Pass/Hold, then permitted dispatch |
| QA-000004 | `qa-3-5` | Paid | Shipped | Shipment evidence and authorized Delivered action |
| QA-000005 | `qa-4-8` | Paid | Delivered | Physical return and separate Finance refund demonstration |

Fresh browser initialization anchors these fixtures to its initialization time so the first Pending hold is initially usable. The deterministic test fixture time is `2026-10-18T07:00:00.000Z`. Returning browser state is not re-created: the first hold may already have expired, orders may have advanced and staff test changes remain.

The QA customer is Avery Morgan, `avery@example.test`; the shipping address is explicitly marked not to ship. The default named bed is Primary bedroom, US Queen, measured depth 12in / 304.8mm. Initial saved looks correspond to the three recipes.

## 15. Persistence, recovery and troubleshooting

### 15.1 Scope and synchronization

The durable store is one JSON snapshot under `bedding-commerce:qa:v1`, with strict schema/revision validation and a 4,000,000 estimated UTF-16-byte limit. Builder recovery/purchase markers and checkout draft fields also use session storage. UI role/view changes are not credentials.

Tabs must use the same browser profile and origin, including protocol/host/port. A localhost tab, a Vercel preview hostname and a custom production domain are separate stores. Private windows, another device or cleared storage do not share inventory/orders. A browser-side CMS publication does not modify Git or redeploy the seed.

When Web Locks are unavailable, persistence becomes read-only rather than pretending to serialize writes. A failed validation/storage write cannot partially commit the state. Malformed/unsupported stored data is preserved and reported, not silently overwritten by fresh seeds. Foreground/online refresh rereads current data.

### 15.2 Common operational issues

| Symptom | Check / recovery |
| --- | --- |
| Admin access disappears after reload | QA roles reset to Customer; explicitly select an authorized staff role again |
| New product absent from shop | Save a valid draft, Publish, verify published/active variants and clear catalog filters |
| Product absent from builder | Check its role, selected market/bed size, exact compatibility, variant dimensions and availability |
| New product shows zero stock | New stock identities start at zero; use audited inventory reconciliation after publication |
| Saved draft seems not live | Draft isolation is intentional; publishing is a separate action |
| CMS published but not visible | Check start/end schedule, locale/page/placement, current origin, publication state and product references |
| Promo accepted but no extra discount | Compare whole-cart candidates; no automatic stacking, sale exclusions and tie preference may retain the bundle |
| Shipping changed after a discount/removal | Qualification uses discounted shipping-eligible merchandise, not original subtotal |
| Add/update disabled in builder | Confirm fit, resolve or explicitly skip every step, resolve slots/inserts and refresh stale quote |
| Size change loses an exact option | Review unresolved same-color slot; select a real compatible alternative or skip; no silent substitution |
| Checkout rejects old price/stock | Refresh and re-acknowledge the current quote; do not reuse an expired accepted quote |
| Payment-pending order cannot process | An unexpired QA hold may be captured by Finance/Admin; expired holds require a fresh attempt |
| Shipped/Delivered action unavailable | Inspect payment, QC outcome, eligible quantities and outstanding shipments; arbitrary status jumps are forbidden |
| Refund does not increase stock | Receive the physical return separately with the correct warehouse/restock disposition |
| Undo no longer available | Ten-second window elapsed; use Recently Deleted for recoverable looks within 30 days |
| A record changed in another tab | Refresh/reload that record and review its new revision; preserve local edits rather than force-overwriting |
| Image fails | Use the image retry UI, check approved HTTPS Unsplash URL and network; missing texture macros are a disclosed asset dependency |
| State is read-only or storage fails | Read the environment message; use a supported secure-context browser, allow storage, free quota, then Retry storage/Refresh data |
| Builds cannot obtain fonts | Check build-time network access to Google font assets; runtime fonts are self-hosted build assets |
| Unexpected seeded totals/counts | Your origin has persisted QA edits or expired holds; inspect records rather than expecting fresh-seed counts |

### 15.3 Backup or reset disposable QA data

There is no public account migration/import or one-click reset console. For a deliberate developer QA reset, first stop edits and copy/export the local-storage snapshot (the store also exposes `exportData()` to application integrations). Browser developer tools can copy the exact key's value. Keep a backup before deleting data.

Only for a disposable test scope, manually remove that origin's `bedding-commerce:qa:v1` key and the relevant builder/checkout session buffers, then reload to initialize a new fixture state. This removes that origin's persisted cart, orders, catalog/CMS changes and saved customer data; it is different from signing out. Do not use this as a repair shortcut for unknown or valuable records. Browser clearing and private-session termination can also remove local QA data.

## 16. Acceptance walkthrough and commercial integration handover

### 16.1 End-to-end demonstration

1. Start the app, open `/sign-in`, select Guest and browse `/shop`. Filter French Linen separately from weave/construction.
2. Open a product, select a named swatch, use Quick Options with actual Queen dimensions and add one sale unit.
3. Load Quiet morning from Home or its recipe URL. Confirm fit, inspect all three groups and the initial 10% quote.
4. Toggle foundation/top inspection without changing merchandise. Change Queen to King and review exact-color compatibility and price effects.
5. Save a named look, add it atomically, open Cart and use Edit look to replace the same bundle. Inspect free-shipping and promo comparisons.
6. Complete Guest QA checkout, verify Pending payment and the stored 15-minute countdown; inspect the receipt/save-purchased-look action.
7. Enter Customer demo and inspect orders, split quantities, saved looks, wishlist, preferences and addresses.
8. Enter Admin demo. Save a product draft, verify live data remains unchanged, Publish and reconcile stock for a new SKU.
9. Keep the matching customer order open in another same-origin tab. Commit legal fulfillment/QC evidence and observe its tracker update.
10. Simulate/promote a promo or policy draft; preview/publish homepage copy and inspect audit/freshness. Leave representative test changes clearly labelled.

The test suite separately covers exact minor-unit allocation, tier exclusions, promo/shipping comparison, quote expiry, idempotency, last-unit concurrent checkout, atomic stock/default changes, undo, split fulfillment, snapshots, draft publication, revision conflicts, safe redirects, financial reporting and buy-again price races. Browser/layout checks complement these tests; they are not a full assistive-technology certification, physical-device audit, field performance measurement or supplier-material certification.

### 16.2 Moving beyond the QA adapter

Keep the reusable types, schemas, domain calculations and UI contracts, but replace browser authority with authenticated, owner-scoped server commands before real commerce. The specification recommends a custom Frappe application over ERPNext for catalog/stock/accounting/fulfillment authority, verified identity sessions and authenticated realtime events.

Implement invariants in Document controllers (`validate`, `on_submit`, `on_cancel`) and use supported document/stock/payment workflows and transactions. Publish notifications/integration work after commit; enqueue long/external work. Add durable idempotency/outbox records, payment/provider reconciliation, reservation race handling and evidence-bound shipment/return/refund integrations. Do not trust client roles, stored prices or local inventory as server authority. See the detailed architecture in Sections 6.6–6.10 of `Premium Bedding UI UX Master Specification.md`.

Approved merchant facts, genuine product/texture/layer media, real review records, tax/shipping policies, consented attribution and measured accessibility/performance remain separate launch inputs. The existing dependency screens and QA disclosures should change only when their replacements actually operate.

## 17. Repository and documentation maintenance

The repository keeps source, tests, npm lockfile, public assets, specification, phase reports and this guide. `.gitignore` excludes `node_modules/`, `.next/`, `artifacts/`, build outputs, environment files, Vercel local metadata and TypeScript build caches. Temporary screenshots/logs referenced by historical phase reports may exist only in the original workspace; they are intentionally not required to build a fresh clone.

Primary handover files:

- `RAZAI_GHAR_COMPLETE_GUIDE.md` — this operating manual.
- `Premium Bedding UI UX Master Specification.md` — product/design/domain specification; not every future external integration is installed.
- `PHASE_1_VERIFICATION.md` through `PHASE_4_VERIFICATION.md` — phase-specific delivered behavior, boundaries and historical verification results.
- `README.md` — repository entry information; use this guide for the complete feature/operations reference.
- `AGENTS.md` — local engineering instructions, including reading the installed Next.js guides before framework changes.

Repository destination: [MuhammadHassan72/razai-ghar-web-app](https://github.com/MuhammadHassan72/razai-ghar-web-app).

After later feature or policy changes, update this guide from the implemented code and published defaults, rerun build/lint/commerce tests, and record actual results. Avoid turning draft designs, fixture facts or disconnected integrations into claims of live functionality.
