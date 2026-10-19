# Premium Bedding UI/UX Master Specification & Full-Stack Frontend Handoff Document

Prepared for GPT-6 Sol implementation • Specification version 1.0 • 18 October 2026

Build a premium bedding commerce experience that helps people choose the right fabric, confirm fit, compose a coordinated bed, and buy with a clear understanding of price and contents. The storefront, My Sanctuary customer dashboard, and Admin CMS must operate against one authoritative commerce backend. This document specifies the experience, design tokens, data contracts, operational safeguards, and release acceptance criteria. It contains no application implementation code.

**Reading contract.** “Must” is a release requirement. “Proposed policy” is an explicit commercial recommendation for merchant configuration, not a claim about an existing business. Measurements, prices, inventory, certifications, reviews, delivery promises, and imagery must come from approved catalog and operational data. Empty states are legitimate; invented business data is not. Examples identified as QA fixtures are confined to tests.

**Scope.** Blankets and throws, sheet sets and fitted sheets, duvet covers, cushion covers, and supported pillow inserts. Curtains in the research inform interaction patterns only. “Cushion sheets” is normalized to “Cushion covers” in customer navigation. The working directory does not establish a public brand name. Use merchant-approved identity at implementation.

## 1. COMPETITIVE SYNTHESIS (FROM MY RESEARCH DOC)

### 1.1 Research authority and critique

The foundation is the supplied **Web Apps for Bed Sheets & Curtains: Design & UX Inspiration**, specifically its “Exemplary Sites,” “Comparison of Key Features,” “Must-Have Features,” and “UI Patterns, Microinteractions & Accessibility” sections. The document has 77 paragraphs and a comparison table with 19 retailer rows. Its references to image embeds are text markers; no product photography is embedded. Its citation handles do not resolve to a bibliography, and the platform descriptions frequently say “likely” or “possibly.”

Consequently, the observations below are attributed research findings, not independently proven current retailer capabilities. The research contains no conversion experiment, sample size, or measured uplift. Calling any feature “highest converting” would overstate the evidence. The proposal selects useful mechanisms and defines how to measure them. Do not import the document’s platform guesses, speculative AR benefits, competitor speed claims, or cost estimates into engineering decisions.

One checked correction illustrates the limitation: the research calls Pepper Home’s curtain calculator PDF-only, while its current [Design Hub](https://pepper-home.com/pages/design-hub) describes an input-driven calculator. Retain the useful lesson—measurement assistance—without repeating the obsolete limitation. Brooklinen’s current [bundle page](https://www.brooklinen.com/pages/all-bundles) supports the relevance of mix-and-match bundles; do not copy its changing promotions.

### 1.2 Selected patterns and their destination

| Research reference and exact standout | Selection for this product | Why it belongs and constraint |
|---|---|---|
| Frette, “Luxury Bedding & Linen Brands”: large lifestyle/product images, restrained neutrals, material/origin copy, shop-the-look banners | One editorial hero; material provenance on product pages; room looks that open a populated bed builder | Establish aspiration, then expose fit, contents, price, and availability immediately. Do not reproduce the source’s brochure-like weakness. |
| The White Company, same section: prominent mega-menu, tonal consistency, home-tour content, “Complete the look” | Image-led category navigation; one coherent palette; one contextual matching-item recommendation | Reduce browsing effort without multiple promo strips or competing upsells. |
| Brooklinen, same section: “Bundle & Save,” fabric education, reviews/customer photos | Itemized bed bundles with visible savings; short fabric comparisons; verified-purchase review and consented photo modules | Explain value and tactile differences. Never fabricate reviews, urgency, stock scarcity, or savings. |
| Parachute, same section: generous whitespace, muted colors, editorial shopping, quick previews and swatch tooltips | Quiet page rhythm; quick option drawer; named, keyboard-operable swatches; routines represented by shopping shortcuts | Preserve ease of browsing while keeping product information visible. |
| Piglet in Bed, same section: clear fabric/sizing tables, warm photography, sustainability messaging | Regional dimensions and pocket-depth guide; approachable bedroom imagery; evidence-backed origin/certification fields | Make fit and provenance useful rather than decorative claims. |
| Matouk, same section: craftsmanship stories, heritage typography, large room photos | Concise construction and finishing story below purchase information; macro textile imagery | Add emotional depth without making customers read a brand essay to choose a size. |
| Anthropologie, “Home Decor & Lifestyle Retailers”: visual mega-menu, advanced filters, swatches and quick-add | Category/material menu, faceted catalog, persistent color choice on cards, quick-select drawer | Use the navigation strengths; avoid the source’s overwhelming density of submenus and promotions. |
| McGee & Co., same section: shoppable room photography with hotspots | Accessible “Shop this bed” hotspot image with equivalent numbered item list; load the exact composition into the builder | Connect editorial inspiration to an executable basket. Every hotspot resolves to real variant options. |
| Lulu & Georgia, same section: dimension-based filtering | Size family plus actual width, length, and fitted depth filters | Prevent a familiar size name from implying universal measurements. |
| Shoppe Amber Interiors, same section: warm interiors, coherent typography and palette | Warm lighting and natural folds in photography; consistent art direction across collections | A mood reference, not a requirement for autoplay video. |
| Burrow, “Interactive Configurators & 3D Visualizers”: step-based module/fabric/color selection with live preview | Three bed-layer steps, persistent preview, reversible selections, explicit compatibility and total | Transfer the configuration logic to bedding. Initial implementation uses aligned 2D product renders; 3D is not required for the promised interaction. |
| Spoonflower, same section: fabric/pattern preview, zoom and repeat functions | Accurate material-specific preview assets and texture zoom, including pattern scale | Do not add custom fabric uploads or a print-on-demand business model. Never simulate all materials by recoloring one texture. |
| Ruggable, same section: visual explanation of a two-part system | “What is included” diagram for sheet sets, covers, and optional inserts | Prevent a cover being mistaken for a filled pillow or duvet. |
| Revival Rugs, same section: exact size, palette, and weave filters | Separate fiber, weave, construction, color family, and dimensions in catalog filters | Correct the underlying schema before building attractive filter controls. |
| Pepper Home, same section: fabric close-ups and measurement help | Texture crops plus interactive size guide in navigation, PDP, and builder | Help customers verify their own measurements; do not broaden scope into curtain sales. |

The source’s general patterns—mobile sticky purchase actions, product image skeletons, subtle crossfades, semantic forms, and clear focus states—apply throughout. They are not attributed exclusively to any one retailer.

### 1.3 Cohesive customer journey

The intended sequence is **discover a feel → verify fabric and fit → compose a bed → review the real contents and price → purchase → track and reuse the look**. The same color names, dimensions, images, variant IDs, and item descriptions must survive every step.

The home page leads with one calm bedroom image and “Create your own bed,” alongside a secondary “Shop bedding” action. A shopper can instead enter through familiar categories or a “Light & airy” shortcut. Product pages explain composition and fit before encouraging a matching layer. A room look is a starting selection in the builder, not an unrelated campaign page. The purchased configuration appears in order details and can be saved to My Sanctuary.

Reject autoplay hero video, scroll-jacking, perpetual reveal animations, forced signup before checkout, countdown timers without a real deadline, unverified “only two left” claims, and mandatory AR. They add complexity or pressure without evidence that they help this store. Preserve named color selections, clear labels, and visible costs even when photography is the dominant visual element.

### 1.4 Product corrections that govern the whole system

**Fiber and weave are separate.** Egyptian cotton and French linen describe fiber/origin, while percale and sateen describe weave. Offer customer shortcuts such as “Egyptian cotton,” “French linen,” “Crisp percale,” and “Smooth sateen,” but resolve them into separate structured attributes and valid SKUs. Origin claims require supplier evidence. Parachute’s [sateen guide](https://parachutehome.com/blogs/posts/sateen-know-your-bedding) explicitly distinguishes weave from raw material.

**Dimensions outrank marketing names.** Retain the requested 18 × 18 and 20 × 20 inch cushion choices, but label the second “20 × 20 in square.” Do not imply that “Euro” means 20 × 20 everywhere. Pepper Home’s [size information](https://pepper-home.com/pages/design-hub) lists square 18/20/22 inch options and a 26 × 26 inch Euro. Offer a 26 × 26 Euro only when the merchant has that actual SKU. Lumbar options display their real dimensions. Twin, Queen, and King always include market and measurements.

**Product facts are not universal ratings.** Thread count is relevant only to appropriate woven products; GSM is mass per area, not a universal warmth score. Weighted blankets need total weight separately. Softness, warmth, and breathability meters are disclosed merchant assessments with a rubric and evidence; do not claim clinical benefit or derive them from thread count alone.

**One backend is not one browser store.** A shared React store cannot synchronize stock, payment, or another person’s order. Client state holds a selection or cache. The backend validates and persists business facts, then emits authorized notifications after commit. Likewise, the View Switcher changes location, never permission.

### 1.5 Priorities and validation

P0 includes the accurate catalog, complete purchase and fulfillment path, three panels, layered builder, account persistence, production media, accessibility, and operational safeguards in this specification. P1 after launch can include additional camera angles, configurable share links, richer reviews, and experimental personalization. AR, user room uploads, generative room imagery, and autonomous purchasing are outside this handoff.

Measure product-view-to-cart, builder start-to-valid-quote, builder start-to-paid-bundle, checkout completion, contribution margin, and returns attributed to fit/color/contents. Report device and acquisition segments. Experiment with builder entry prominence and guidance; predeclare the hypothesis, primary metric, margin/return guardrails, exposure rules, and analysis window. Do not promise uplift before measurement.

## 2. TACTILE LUXURY DESIGN SYSTEM (EXACT TOKENS)

### 2.1 Color tokens

Use semantic aliases with one source of truth. HEX values are exact sRGB values. Storefront surfaces are warm; Admin tables use neutral high-contrast surfaces. Do not apply transparency to body text.

| Semantic token | HEX | Tailwind utility after theme registration | Intended use |
|---|---|---|---|
| canvas | #F7F3ED | bg-canvas | Main storefront and customer page background |
| surface | #FFFCF7 | bg-surface | Cards, forms, drawers, menu panels |
| surface-soft | #EEE6DB | bg-surface-soft | Alternating editorial sections and preview stage surround |
| surface-inset | #E3D8CB | bg-surface-inset | Recessed controls and neutral unloaded media areas |
| ink | #29251F | text-ink | Main storefront headings and body |
| ink-muted | #6C6258 | text-ink-muted | Secondary text and metadata |
| divider | #D8CEC2 | border-divider | Decorative dividers only |
| control-border | #887D71 | border-control-border | Required input and swatch boundaries |
| primary | #31483D | bg-primary | Primary purchase actions and active choices |
| primary-hover | #24382F | hover:bg-primary-hover | Hover/pressed primary actions |
| on-primary | #FFFCF7 | text-on-primary | Text/icons on primary |
| accent | #8A4B34 | text-accent | Editorial links and secondary emphasis |
| focus | #1E5D88 | outline-focus | Keyboard focus on light surfaces |
| success / success-soft | #246347 / #E7F1E9 | text-success / bg-success-soft | Confirmed success with icon/text |
| warning / warning-soft | #8A4F12 / #FFF1D8 | text-warning / bg-warning-soft | Stock/validation warning with text |
| danger / danger-soft | #A6372F / #FBEAE6 | text-danger / bg-danger-soft | Errors/destructive controls with text |
| admin-canvas | #F3F5F7 | bg-admin-canvas | Admin application background |
| admin-surface | #FFFFFF | bg-admin-surface | Admin tables and forms |
| admin-ink | #16212B | text-admin-ink | Admin headings and values |
| admin-muted | #52606D | text-admin-muted | Admin secondary text |
| admin-nav | #16212B | bg-admin-nav | Admin side navigation |
| admin-on-nav | #F9FAFB | text-admin-on-nav | Admin nav text and focus outline on dark surfaces |

Calculated contrast for these opaque pairs: ink/canvas 13.78:1; muted/canvas 5.39:1; muted/surface-soft 4.82:1; on-primary/primary 9.66:1; accent/canvas 6.06:1; control-border/canvas 3.64:1; admin-muted/admin-canvas 5.91:1; admin-on-nav/admin-nav 15.62:1. These checks do not certify every rendered state. Test image overlays, disabled states, charts, opacity, and error combinations separately. Decorative divider is intentionally not the sole visible boundary for a control.

### 2.2 Fabric swatch seed palette

These are art-direction swatch tokens, not a declaration of available stock or color accuracy. Only publish a token as a purchasable color after mapping it to approved product imagery and actual variants. Fabric texture is a separate image, and the UI says “Screen colors may vary” near the expanded swatch picker.

| Color name | HEX | Family | UI treatment |
|---|---|---|---|
| Chalk | #F2EEE6 | White | Dark outline so it remains visible |
| Oat | #D9CBB6 | Beige | Natural linen reference |
| Flax | #B7A58A | Beige | Distinct label from Oat |
| Sand | #C8B49B | Tan | Warm woven reference |
| Mushroom | #9A8C80 | Taupe | Neutral mid-tone |
| Clay | #B77B64 | Terracotta | Warm accent |
| Rosewater | #D9B6AD | Pink | Muted blush |
| Sage | #A2AB94 | Green | Pale botanical |
| Olive | #737B5C | Green | Deeper botanical |
| Mist | #A9BABD | Blue | Cool pale blue |
| Slate | #596A75 | Blue | Deep blue-gray |
| Charcoal | #3B3B38 | Gray | Dark neutral |

Render a 24 px visual swatch inside a minimum 44 × 44 px target. For a mutually exclusive color choice, use a labeled native radio group with visually styled labels; Tab enters/leaves the group and arrow keys change the selected option following the [WAI-ARIA radio pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Active selection adds a 2 px outline, 2 px offset, and visible check mark with a contrasting disc if necessary. Every choice has an accessible name containing color and availability; checked state conveys selection. Do not use the HEX value alone as the customer name. Patterned fabric uses a real thumbnail plus a named color family; a solid HEX cannot represent a pattern.

### 2.3 Typography and hierarchy

Use [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) for editorial display and [Inter](https://fonts.google.com/specimen/Inter) for body, controls, prices, and all Admin content. Self-host approved WOFF2 subsets with licenses retained, font-display swap, and measured fallback metrics. Load only required weights: serif 500/600, sans 400/500/600/700. Do not request remote fonts during payment solely for styling.

The root baseline is 16 px at default browser settings; rem sizing must respect user zoom. Fallbacks: Cormorant Garamond, Georgia, serif; Inter, system-ui, sans-serif. Small storefront headings can use Inter where legibility improves.

| Role | Font and weight | Mobile size / line | Desktop size / line | Letter spacing |
|---|---|---|---|---|
| Hero display | Cormorant 500 | 2.75rem / 3rem = 44 / 48 px | 4.5rem / 4.75rem = 72 / 76 px | -0.025em |
| Page H1 | Cormorant 500 | 2.25rem / 2.5rem = 36 / 40 px | 3.5rem / 3.75rem = 56 / 60 px | -0.02em |
| Section H2 | Cormorant 600 | 2rem / 2.25rem = 32 / 36 px | 2.5rem / 2.75rem = 40 / 44 px | -0.015em |
| Product title / H3 | Inter 500 | 1.125rem / 1.5rem = 18 / 24 px | 1.25rem / 1.75rem = 20 / 28 px | -0.01em |
| Editorial lead | Inter 400 | 1.125rem / 1.75rem = 18 / 28 px | 1.25rem / 1.875rem = 20 / 30 px | 0 |
| Body / inputs | Inter 400 | 1rem / 1.5rem = 16 / 24 px | Same | 0 |
| Buttons / nav | Inter 600 | 0.875rem / 1.25rem = 14 / 20 px | Same | 0.01em |
| Metadata / table text | Inter 400 or 500 | 0.875rem / 1.25rem = 14 / 20 px | Same | 0 |
| Eyebrow / small label | Inter 600 | 0.75rem / 1rem = 12 / 16 px | Same | 0.08em; uppercase only for short labels |
| Main price | Inter 600 | 1.5rem / 2rem = 24 / 32 px | Same | -0.01em; tabular numerals |
| Admin H1 | Inter 600 | 1.5rem / 2rem = 24 / 32 px | 1.75rem / 2.25rem = 28 / 36 px | -0.02em |
| KPI value | Inter 600 | 2rem / 2.5rem = 32 / 40 px | Same | -0.02em; tabular numerals |

Desktop display sizes apply at lg, 1024 px and above. Essential controls and validation never use the 12 px label style. Form text stays 16 px on mobile. Limit prose to 65 characters per line; hero heading to roughly 16–20 characters per line. Use sentence case throughout customer flows.

### 2.4 Exact geometry, spacing, and elevation

Target Tailwind CSS 4 theme conventions; pin compatible package versions during implementation. Register custom aliases once through the official [theme variable system](https://tailwindcss.com/docs/theme). The utility names below are the specification, not claims that custom utilities already exist. Default spacing unit is 0.25rem = 4 px. Do not mix Tailwind 3 configuration assumptions into a Tailwind 4 build.

| Element | Exact utilities or token values | Result |
|---|---|---|
| Storefront container | w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 | 16 / 24 / 40 px outer padding |
| Editorial text | max-w-[65ch] | Bounded reading width |
| Section rhythm | py-12 md:py-16 lg:py-24 | 48 / 64 / 96 px vertical rhythm |
| Default component rhythm | gap-4; md:gap-6; lg:gap-8 | 16 / 24 / 32 px gaps |
| Product grid | grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 | Two columns mobile, three tablet, four wide desktop |
| Small device safety | max-[359px]:grid-cols-1 | One column below 360 px if content cannot fit |
| Control radius | rounded-[12px] | Inputs and standard buttons |
| Card radius | rounded-[16px] | Product/card media corners |
| Panel radius | rounded-[24px] | Builder stage and major surface containers |
| Pills and swatches | rounded-full | Filter chips, avatar, color circles |
| Drawer | rounded-none md:rounded-l-[24px] | Full mobile panel; soft desktop edge |
| Admin form/table container | rounded-[12px] | Restrained geometry for density |
| Control height | min-h-12 px-5; icon target min-h-11 min-w-11 | 48 px primary controls; 44 px icon targets |
| Table rows | min-h-14; cell px-4 py-3 | At least 56 px practical row height |
| Soft card shadow | shadow-soft = 0 4px 20px -8px rgb(41 37 31 / 0.14) | Quiet lift on light surfaces |
| Floating panel shadow | shadow-float = 0 16px 48px -16px rgb(41 37 31 / 0.22) | Dropdowns and drawers |
| Inset selection | inset-shadow-tactile = inset 0 1px 3px rgb(41 37 31 / 0.08) | Recessed choice surface |
| Glass header | bg-surface/95 backdrop-blur-[12px] border-b border-divider | Optional header only; opaque fallback |
| Scrim | bg-ink/40 | Modal backdrop; text sits on opaque panel |
| Focus on light | focus-visible:outline-2 outline-offset-4 outline-focus | Visible outside control |
| Focus on dark | focus-visible:outline-2 outline-offset-4 outline-admin-on-nav | Controls surrounded by a dark parent surface |

Shadow aliases follow Tailwind’s documented [custom shadow tokens](https://tailwindcss.com/docs/box-shadow). Breakpoints are sm 640, md 768, lg 1024, xl 1280, and 2xl 1536 px. Test at 320, 390, 768, 1024, and 1440 px, plus 200% zoom. Table overflow may stay within a named scroll region; the page itself must not require horizontal scrolling.

Choose the focus outline from the surrounding surface, not the button fill: a dark primary CTA on a pale canvas uses the blue focus token because the offset outline lands on that canvas. White focus is reserved for a dark surrounding surface. Verify both combinations in keyboard tests.

Stacking order: base 0; sticky content 10; header 30; dropdown 40; drawer scrim 50; drawer 60; modal 70; toast 80. Do not open unrelated overlays on top of one another. Mobile sticky bars include bottom safe-area padding and sufficient content padding so they never hide the last control.

### 2.5 Motion, tactile media, and component states

Use 120 ms for button/color state, 180 ms for card and menu transitions, 220 ms for image crossfades, and 240 ms for drawers, all with cubic-bezier(0.2, 0, 0, 1). Hover raises a card at most 2 px. Fabric zoom uses a second real image or genuine crop; do not invent detail. No bounce, parallax, drag-only controls, or automatic carousel rotation. Reduced-motion mode removes transforms and uses immediate state changes or a short opacity change.

Required shared states are default, hover, keyboard focus, selected, unavailable, pending, error, and confirmed. Selection uses shape/check/text as well as color. Pending buttons retain width and say “Adding…” or “Saving…”. Errors remain near their field until resolved; a toast alone is insufficient. Skeletons match final dimensions and are hidden from assistive technology; one status region announces loading. Real loading skeletons are allowed under “zero placeholders”; permanently fake content is not.

Accessibility target is [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). Use the project’s 44 px minimum target convention, visible focus, correct heading order, skip link, semantic labels, text errors, and alternatives to pointer-only actions. The target convention is deliberately larger than WCAG’s minimum target-size criterion. Check contrast in actual browser rendering and run keyboard and screen-reader reviews, not just an automated score.

Dialog, cart, size guide, and quick options use the [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): named panel, deliberate initial focus, trapped modal focus, inert background, Escape dismissal when safe, and focus restoration. Drawer content scrolls independently without losing the header and actions. Respect forced-colors and high-contrast modes.

## 3. CENTERPIECE FEATURE: "CREATE YOUR OWN BED" INTERACTIVE CUSTOMIZER

### 3.1 Entry, layout, and operating model

Route: **/create-your-bed**. Entry points: hero, global navigation, PDP “Build around this,” editorial “Shop this bed,” and saved looks. Entry context identifies variant IDs, not client-authored prices. A known PDP color is preserved. A new visitor first chooses market and bed size; existing preferences are suggestions requiring confirmation when fit could change.

Desktop at lg and above uses a 12-column grid: preview spans 7 columns, selector spans 5, with a 32 px gap. The stage is sticky below the header and a local summary remains visible. On tablet, split 6/6 only when both panes retain at least 320 px; otherwise stack. On mobile, show a compact 4:3 stage, step controls, then an expandable current-item summary and sticky bottom price/action bar. The preview is not permanently sticky if it would leave less than 240 px for controls. “View bed” opens a full-screen preview with its own close action.

Three visible steps are **1 Foundation, 2 Top layer, 3 Cushions**. A completed step shows the selected summary. Users may go back without losing choices. Each step may be explicitly skipped for a partial purchase; “Skipped” is different from a selected product with unresolved options. An empty selection can be saved as a draft but cannot be quoted for purchase. The initial stage is a clearly labeled empty base setup with no paid products implied. Curated presets are real available configurations and require an explicit selection.

The builder state contains schema version, locale/market, bed size ID, exact selected variant IDs, quantities, visual positions, optional insert links, and revision. It does not persist prices as facts. A compact text equivalent always lists the included items and their dimensions; the preview is supplementary.

### 3.2 Layer and compatibility contract

| Layer | Selection controls | Validation and presentation |
|---|---|---|
| Foundation | Sheet set OR fitted-sheet-only; fiber/origin; weave; color; regional bed size; fitted depth | Zero when explicitly skipped, otherwise exactly one foundation sale unit. Set contents show flat sheet, fitted sheet, and pillowcase counts as applicable. Do not add the set’s fitted sheet again. Egyptian cotton, French linen, Percale, and Sateen appear as supported guided choices over the separate attributes. |
| Main top layer | Duvet cover OR blanket; construction options including chunky knit, Sherpa fleece, waffle weave, and weighted blanket; color; actual dimensions | Zero or one main top item. Duvet cover clearly says insert included or excluded. An insert is a separately priced compatible SKU if offered. Blanket coverage is checked against dimensions, not its label alone. |
| Optional throw within top layer | None OR one throw; supported material/color; dimensions; foot-of-bed placement | Adds one top-layer SKU but never a second discount group. A small throw is not silently offered as a full-bed blanket. If chosen as the sole top item, label the coverage truthfully. |
| Cushions | Up to five decorative positions; 18 × 18 in square, 20 × 20 in square, available Euro, and actual lumbar dimensions; fabric/color; cover or filled option | Each position maps to a variant and unit. Repeated identical variants aggregate quantity in commerce while retaining positions in the look. Empty positions are explicit; choosing a cover does not automatically buy an insert. |

Slot cardinalities are therefore foundation 0–1, main top 0–1, throw 0–1, and decorative cushions 0–5, with compatible insert choices attached to their covers. At least one valid merchandise unit is required to add a partial selection. Any chosen item with unresolved size/color/compatibility blocks purchase until fixed or explicitly removed. A throw-only Top layer may qualify that discount group if eligible, but the “Complete Bed Bundle” label additionally requires a foundation, a bed-covering main top item, and at least one decorative cushion. Discount eligibility and visual completeness are separate checks.

Weighted blankets require total weight and supplier care/usage information; no medical recommendation engine. A merchant may restrict incompatible layering based on documented product rules. Do not automatically assign material ratings or compatibility from a generic product name.

A sheet set is represented as one stocked sale SKU with explicit included-parts metadata in this initial model. If the merchant actually assembles sets from independently stocked components, implement that inventory model explicitly using supported ERPNext bundling; do not decrement both a stocked set and its contents. The configurable bed itself always groups ordinary sale lines under a bundle instance, not a newly generated stock SKU.

When size changes, preserve every choice that has a verified compatible equivalent. Show a change summary for replaced or unresolved variants. Never choose a different color, higher price, or larger weight silently. Unresolved slots become “Choose a compatible size”; quote and purchase remain disabled until resolved. Existing selections remain inspectable when sold out.

### 3.3 Live visual preview specification

The initial renderer is a deterministic 2D composite of real photographs or approved product renders, using one camera pose, lighting setup, art direction, and canvas coordinate system. It is not generative AI and does not require WebGL. This supports immediate swatch feedback, mobile performance, and inspectable product fidelity.

Asset master is 2400 × 1800 px, 4:3, with normalized coordinates. Layers use transparent WebP/PNG where necessary; responsive production derivatives may use supported alpha formats. Every asset carries variant ID, bed-size template ID, slot type, camera ID, version, dimensions, anchor coordinates, color-space declaration, and rights metadata. A fabric/material change must select its own texture and drape asset. A plain color overlay may only be used if the catalog owner has approved that specific render method as accurate.

| Render order | Visual slot | Rule |
|---|---|---|
| 0 | Room/base frame | Neutral, non-purchasable context; mattress/headboard marked “styling only” |
| 10 | Fitted foundation | Sized to the chosen template, consistent perspective |
| 20 | Flat-sheet fold | Only present when the selected sale unit contains one |
| 30 | Main top layer | Duvet cover or blanket-specific drape |
| 40 | Optional throw | Foot-of-bed overlay, correct weave and scale |
| 50 | Included sleeping pillows | Only the quantity/appearance represented by chosen set metadata; inserts distinguished |
| 60–64 | Decorative cushions | Rear squares before front/lumbar; fixed named positions, editable via buttons |

Swatch activation immediately changes the selected state and starts a versioned image request. Retain the previous complete preview while loading the replacement. Decode the new asset before a 220 ms crossfade. Cancel or disregard responses for an older selection revision. Never flash an unrelated default color. Preload only adjacent likely choices, not the entire catalog.

Expose “Show foundation,” “Show top layer,” “Show all,” and “Zoom texture” controls so covered fabric can be inspected. These are preview-only visibility controls and never remove merchandise. “Remove item” is a separate action. Offer a reset with a review of what will be cleared and an undo affordance for local edits.

If an approved layer render is missing, keep the exact product thumbnail and labeled item list available, explain “Layer preview unavailable for this option,” and allow ordinary selection. Do not display another fabric as if it were the selected SKU. Launch the signature visual builder only for a curated subset with complete assets; other real catalog products remain shoppable through standard PDPs. If all stage assets fail, switch to the accessible list mode with retry.

Proposed performance budgets: local selection feedback within 100 ms; preloaded crossfade start within 150 ms; warm-cache changed-asset decode and preview within 500 ms; cold changed-asset preview within 1,500 ms under the lab profile in Section 4.8; initial builder imagery no more than 1.5 MB transferred at the mobile viewport. Measure from swatch activation to the correctly selected image becoming visible, including fetch/decode. Asset fidelity and these budgets are release-tested together.

### 3.4 Pricing and bundle tiers

The browser submits selections and receives a versioned server quote. The server resolves current prices, sale validity, tax treatment, inventory availability, discount eligibility, and market currency. Show an immediate “Updating total…” state; never present browser arithmetic as a confirmed quote. A cached number must be visibly marked stale until refreshed.

**Proposed initial commercial policy:** one eligible layer group gets 0%, two distinct eligible layer groups get 5%, and all three groups get 10%. Groups are Foundation, Top layer, and Cushions. Repeating cushions, adding inserts, or adding an optional throw does not create another group. A group counts only if at least one selected merchandise line in it is explicitly bundle-eligible. Sale items are excluded from the additional bundle discount by default and do not qualify a group unless the policy explicitly permits them. The UI explains exclusions before purchase. The merchant must validate margin and publish this policy before launch.

Apply the tier percentage to the sum of eligible current merchandise line amounts, not to shipping, tax, gift value, or ineligible sale lines. Use integer minor-unit money at the API boundary and decimal arithmetic inside ERPNext. Never assume every currency has two decimals. Preserve a single currency per cart. Round the bundle discount total once to the currency’s supported minor unit using decimal round-half-up; allocate it to eligible lines by largest remainder with a stable line-ID tie break. Tax rounding follows the separately configured market rules and must reconcile with ERPNext totals. Store allocations on the order for refunds.

Default promo stacking is off. Compare two complete-cart candidates: all eligible bundle discounts across the cart versus one accepted merchandise promo across its eligible cart lines, preserving every exclusion and cap. With destination/method known, choose the lower final payable amount including resulting shipping and tax; on an exact tie prefer the bundle candidate. Before shipping/tax is known, show the lower confirmed merchandise subtotal as an estimated comparison and recalculate after address selection. Never mix per-line winners from both candidates. Show which policy won and why the other was not applied. A shipping promo combines with another discount only when the published policy explicitly allows it. Admin simulation and checkout use the same engine; no discount may be applied twice through custom logic and ERPNext Pricing Rules.

**QA pricing example, not live catalog data:** eligible lines of 20,000, 15,000, and 5,000 minor units across three groups produce a 40,000 merchandise subtotal, 4,000 discount, and 36,000 discounted merchandise total. Tax and shipping follow the configured market rules. Removing the cushion group leaves two groups: 35,000 subtotal, 1,750 discount, and 33,250 discounted merchandise. A newly added ineligible sale line receives no extra discount and does not create another qualifying group.

Quote response includes quote ID, cart/selection revision, pricing-policy version, currency, line subtotals, current-versus-reference prices, allocated discounts, merchandise total, shipping estimate state, tax estimate state, total state, availability warnings, server time, and expiry. Proposed quote TTL is five minutes, capped by an earlier promotion end time. A quote is neither a stock reservation nor a guaranteed price lock. Any expired or changed quote must be refreshed; increased payable totals require the customer to review and confirm before checkout.

### 3.5 Save and purchase actions

**Save This Bed Look** opens a name field, maximum 60 characters, with the selected composition summary. Authenticated saves persist on the server under the current customer, using an expected revision to prevent overwrites. The saved record contains selection IDs, layout, and an optional generated thumbnail; no address or payment data. Thumbnail generation runs in a worker and must not block the save. The image may lag the selection but must indicate pending regeneration.

Guests can retain a local draft with a clear device-only notice. On Save, offer sign-in and return to the same draft after authentication; do not discard it. On sign-in, explicitly merge or retain separate versions when the account already has a matching saved look. Server ownership is derived from the session. Private saved-look URLs cannot expose another customer’s composition or purchase history.

**Add Complete Bed Bundle to Cart** is the primary action only when the foundation, bed-covering main top item, and at least one decorative cushion are intentionally selected and valid. Otherwise label it “Add selected items to cart” and show the actual tier, including a possible three-group tier when Top is throw-only. Before submission, show included unit counts, cover/insert distinctions, sizes, current total, and excluded items. One click submits one atomic command with quote ID, expected cart revision, and idempotency key. All accepted lines share one bundle instance ID. If any required item fails validation, add none and return targeted issues. No partial success toast.

The cart opens after confirmed success, containing an expandable bundle summary and individually editable lines. Rapid double-clicks, retries, and navigation back cannot duplicate the bundle. If editing breaks a tier, show the new discount before the customer confirms the change. Never remove a purchased component invisibly to preserve a price headline.

### 3.6 Builder state and acceptance criteria

| State or scenario | Required behavior |
|---|---|
| Loading configuration | Stable stage skeleton, controls disabled only until their data arrives; named status |
| Unresolved selected item | Show exact missing option or incompatible dimension; allow saving a draft; disable purchase until corrected or removed |
| Explicitly skipped layer | Valid partial selection; quote remaining valid units and show the actual tier and partial-purchase CTA |
| Price/stock refresh | Preview remains usable; purchase waits for a matching current quote |
| Swatch clicked rapidly | Only the final revision controls image and price; old network results cannot overwrite it |
| Network lost | Preserve draft; show offline status; no claim of save, cart mutation, or stock reservation |
| Selected SKU sold out | Keep it visible; offer explicit replacement or removal; never silently substitute |
| Saved SKU discontinued | Preserve old label for context; mark unavailable; reselect and requote before buying |
| Session expired | Preserve non-sensitive draft; reauthenticate; replay only after fresh validation |
| Add command times out | Query by command ID; retry the same idempotency key if needed; do not create a new operation |
| Keyboard/screen reader | Complete the entire bed, review total, save, and add without pointer or visual stage |
| Market or bed-size change | Revalidate all dimensions, prices, and availability; require confirmation for changes |

Acceptance requires exact agreement between preview selections, item list, saved look, cart line IDs, and final order contents across reload, a second device, and an admin stock/price change.

## 4. PUBLIC LUXURY STOREFRONT ARCHITECTURE

### 4.1 Routes and shared component ownership

| Route | Purpose | Principal components |
|---|---|---|
| / | Editorial discovery | AnnouncementBar, MegaNav, EditorialHero, FeelShortcuts, CategoryTiles, FeaturedProducts, ShopTheBed, FabricGuide, Footer |
| /shop and /shop/[category] | Catalog and filtered discovery | Breadcrumbs, CategoryIntro, FilterBar, FilterDrawer, ActiveFilters, SortSelect, ProductGrid, Pagination |
| /search?q= | Search results | SearchInput, ResultsCount, QuerySuggestions, FilterBar, ProductGrid |
| /products/[slug] | Product detail | ProductGallery, VariantSelector, MaterialFacts, FeelMeters, PurchasePanel, CareTabs, CompatibleItems, Reviews |
| /create-your-bed | Signature builder | BedPreviewStage, LayerStepper, SlotSelector, BundleQuote, SaveLookDialog |
| /cart | Durable full-cart fallback | BundleCartGroup, CartLine, PromoForm, ShippingProgress, OrderSummary |
| /checkout | Checkout | ContactForm, AddressForm, ShippingMethods, PaymentHandoff, FinalReview |
| /orders/confirmation/[public-token] | Confirmation or payment status | OrderReceipt, PaymentStatus, ShipmentSummary, SavePurchasedLook |
| /sign-in, /register, /verify-email | Identity entry and activation | Framework-backed authentication forms and verification result |
| /forgot-password, /reset-password | Account recovery | Framework-backed recovery request, token validation, password form |
| /guides/fabrics and /guides/sizes | Shareable guidance | FabricComparison, SizeGuide, MeasurementIllustration |
| /shipping, /returns, /care, /contact, /privacy, /terms | Approved service information | StructuredPolicyContent, ContactOptions |

Order tokens are opaque, scoped, and expiring where appropriate; order numbers alone never authorize access. The size guide modal links to its durable page. Product and guide pages must render usable core content on the server. Account/cart/order responses are private and never shared-cacheable. [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) provide the intended boundary: server-rendered content with small client interaction components.

### 4.2 Smart mega-navbar

Desktop header has a minimum 32 px announcement row and a 72 px primary row. Announcement text wraps and expands its row at narrow widths/zoom; never clip an approved 120-character message to a fixed height. Measure the resulting header height for sticky offsets. Announcements contain one approved message, no rotating carousel. Primary row: brand at left; Bedding, Blankets & Throws, Cushions, Create Your Own Bed, and Fabric Guide in the center; search, wishlist, account, and cart at right. Duvet Covers and Sheets appear explicitly inside Bedding. Display the size-guide trigger in the mega-menu and beside product size selectors. Avoid duplicate prominent navigation to every guide.

The mega-panel spans the content width, with maximum height equal to the smaller of 560 px or the remaining dynamic viewport below the measured header, and internal scrolling when needed. Category links occupy the first column, fiber/weave guidance the second, and two editorial preview tiles the remaining space. Keyboard focus and click open it; hover may open after a 150 ms intent delay but cannot be the only method. Escape closes it, focus stays logical, and it remains open while the pointer enters the panel. Preview changes never navigate until a link is activated. Use normal navigation links/disclosure semantics, not a desktop application menubar pattern by default.

Search opens a named search dialog. Use a labeled [combobox interaction](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) for suggestions: 200 ms debounce after at least two characters, maximum six product results plus category/guide suggestions, selected color and current price only when known. Arrow keys move through suggestions, Enter activates, Escape dismisses. Abort superseded requests and ignore out-of-order responses. Search matches product title, SKU where useful, color name, fiber, weave, and category. Store no address or personal account history in public suggestions.

Before typing, show editorially approved category links rather than fabricated “trending” queries. Empty results say “No results for…” with an editable query and clear filters; a service failure says “Search is unavailable” with category browsing still usable. Returning from a product restores query, filters, and scroll position.

Wishlist counter is the count of distinct saved entries; cart counter is total sale-unit quantity, including individually sold accessories, not the number of visual groups or pieces inside a sheet set. Counters refetch authoritative data after mutation and account changes. Pending counters may indicate loading; they must not flicker to zero on every navigation.

**View Switcher:** a compact “View” control in the account menu, easy to reach without competing with purchase navigation. Guests see Storefront and “Sign in to My Sanctuary”; customers see Storefront and My Sanctuary; authorized staff also see Admin CMS. Staff can return to the storefront in their own session. It never changes roles, simulates another customer, or accepts a role from query string/local storage. A direct unauthorized Admin request receives a server denial even if the menu was altered in developer tools.

Mobile header uses a 64 px row with menu, brand, search, and cart; account/wishlist/view links move into the navigation drawer. Category groups expand as accordions with all preview content available by tap. Keep cart/search targets at least 44 px. Do not squeeze the complete desktop navigation into a horizontally scrolling strip.

### 4.3 Home page and editorial hero

Above-fold order: announcement, navigation, hero, then feel shortcuts. Desktop hero is a 7-column bedroom image with a 5-column text surface, approximately 560–680 px tall within the viewport. Mobile stacks a 4:3 image and text; avoid full-viewport height that hides both CTAs. Hero image focal position is editable by breakpoint. Prefer real folds, macro texture, and warm daylight over artificial gloss. Do not place long text directly over patterned bedding.

Proposed launch copy: **“Build a bed that feels like you.”** Supporting sentence: **“Choose your fabrics, layer your textures, and see your bed come together.”** Primary CTA: **“Create your own bed.”** Secondary: **“Shop bedding.”** This is proposed brand copy requiring publication through CMS, not fictitious product evidence.

Feel shortcut chips appear under the hero: **Light & airy**, **Crisp & cool**, **Soft & draping**, and **Warm & cozy**. They navigate to real filters with visible selected criteria. Proposed mapping: Light & airy = breathability 7–10 and warmth 1–4; Crisp & cool = percale weave and warmth 1–4; Soft & draping = softness 7–10 with supported sateen or relaxed-linen merchandising families; Warm & cozy = warmth 7–10. Missing ratings do not become zero. Explain these as relative feel guides and let customers remove any filter. Do not imply the four shortcuts are a medical sleep assessment.

Subsequent sections, in order:

1. Four category tiles: Sheets, Duvet Covers, Blankets & Throws, Cushions. Tile image, clear name, one link.
2. Featured collection: up to eight real products; selection comes from published CMS IDs. “Best sellers” is used only with a documented sales-based source/window.
3. Shop this bed: one staged composition with numbered hotspots and an equivalent item list; “Customize this look” loads the exact saved recipe.
4. Fabric guide: three concise comparisons with links to complete material facts and care requirements.
5. Genuine reviews or customer photos only when available, consented, and moderated; omit this section when empty.
6. Real shipping/returns/care service information and footer. A newsletter form, if enabled, has separate consent and an actual delivery integration; it is not a blocking popup.

### 4.4 Product listing and tactile cards

Above the grid: breadcrumb, category H1, one-sentence introduction, result count, filter control, and sort. Desktop filter sidebar is 240 px at lg when sufficient grid width remains; otherwise use a drawer. Mobile uses a sticky 56 px filter/sort bar that stays below navigation. Filter selections appear as removable chips and persist in URL search parameters.

Facet groups: category/subtype, regional size/dimensions, fitted depth where relevant, fiber, weave/construction, color family, warmth band, breathability band, price, and in-stock availability. OR within one facet, AND across different facets. Return facet counts from the same server query semantics. Facets without data are omitted rather than filled with arbitrary values. Sort choices: Featured (curated rank), Price low to high, Price high to low, Newest; rating-based sort only when authentic ratings exist. Use 24 products per page and a keyboard-accessible “Load more” that also exposes stable pagination URLs. Restore loaded pages on Back.

Each card contains a 4:5 image, one restrained promotional/availability badge if justified, wishlist control, product title, material/subtype, price or truthful “From” price, selected color label, swatches plus a “+N colors” link, and “Choose options.” Fit the swatch row to card width without shrinking targets: ordinarily two visible swatches on mobile, three on tablet, four on desktop, and up to five only when six 44 px targets including More plus 4 px gaps fit. Remaining colors open the full picker; selection stays accessible by name. Show a compact GSM or thread-count badge only where applicable and verified. A second hover/focus image may show texture; touch users reach the same image through quick options. Clicking a swatch updates that card’s image/color, accessible name, and price context without navigating or adding to cart.

A card with unresolved size cannot perform a blind add. Quick options opens a drawer with image, fabric/color, required size, availability, price, size-guide link, and Add action. Direct quick-add is permitted only if one unambiguous sale variant exists or the customer has explicitly completed the selectors. A preference is not sufficient to silently choose a size. Failure stays visible within the drawer.

Empty filtered results preserve selected filters and allow removal one at a time or “Clear filters.” Catalog failure shows retry and available category links, not an empty catalog claim. Discontinued product URLs remain informative where needed, with alternatives clearly identified; do not redirect unrelated products silently. No stock quantity is invented to make a card appear urgent.

### 4.5 Product detail view

Desktop layout: 7-column gallery and 5-column purchase panel. Gallery contains main product image, room context, true texture macro, color-specific image, and contents/dimensions illustration where available. Use explicit thumbnails and image zoom; no mandatory carousel auto-advance. Mobile places gallery, title, price, selectors, and primary action before deeper content. Purchase panel becomes sticky only while it fits within the viewport.

Purchase information order is fixed:

1. Breadcrumb, category, product H1, authentic rating count if present, current price and valid reference price if applicable.
2. Short material statement and actual contents, including whether cover/insert are separate.
3. Named color swatches; fiber/weave choices only if the product family genuinely varies by them.
4. Size selector with Twin, Queen, King or cushion dimensions as applicable; regional label, actual dimensions, fitted pocket limit, and “Size guide.” Disabled combinations explain why they cannot be bought.
5. Quantity, availability, destination-aware shipping estimate when known, Add to cart, and “Build around this.” Required selectors default to unchosen unless only one valid option exists.
6. Returns/care highlights from approved policy and a link to the full policy. No unspecified delivery date or free-return promise.

The mobile sticky action bar shows selected size/color summary, price state, and primary CTA. If options are missing, label it “Choose size” and scroll/focus the missing selector. It must not cover validation, chat controls, cookie controls, or the final gallery image.

**Feel meters:** three labeled 10-step meters: Softness (structured → supple), Warmth (light → insulating), Breathability (less airflow → more airflow). Display value such as “7 of 10” and a short explanation of the merchant’s assessment. Include “Relative feel guide” and a method disclosure. Do not use rating stars or animated gauges suggesting lab precision. “Not assessed” is distinct from 0. When a SKU materially changes construction, use the correct variant-specific assessment. Do not average these scores into an unsupported scientific rating for a complete bed.

**Specification badges:** display GSM with g/m², thread count with its measurement basis, fiber percentages, weave, finish, actual dimensions, fitted depth, and total blanket weight where relevant. Do not force thread count onto knitted or fleece products. Sale price display follows the merchant’s approved market policy; no invented struck-through reference price.

Below the purchase region: About the fabric, Dimensions & contents, and Care & delivery. Use keyboard-operable tabs on wide screens and accessible accordions on mobile, backed by the same content. Care includes wash temperature, drying, bleaching, ironing, shrinkage allowance if supplied, and product-specific limitations. Missing critical care/fit data blocks product publication rather than showing filler copy. Follow with one compatible-items row and real reviews with moderation/verified-purchase labeling. Review requests and marketing communications require separate implemented workflows; no fake submissions.

### 4.6 Smart cart drawer and full cart

Drawer width is 480 px on desktop, max-width 100vw; mobile uses a full-screen panel. Header: “Your cart,” sale-unit count, close. Body: grouped bundles, standalone lines, one matching-cushion suggestion when applicable, promo field. Footer: itemized subtotal, discounts, shipping/tax estimate state, total or estimated total, and checkout action. A link opens the full /cart page with identical business behavior.

Each line shows image, product/variant name, color, dimensions, contents label, quantity, unit and line price, and removal. Bundle header shows saved-look thumbnail when valid, exact group count, tier, savings, and Edit look. Expanding lists all charged products. Removing/editing a line previews any lost discount; the server returns the updated cart atomically. Cart counts and header totals update from the mutation result. No inventory is reserved merely because the item sits in a cart.

**Free-shipping progress:** use a server-supplied threshold T for the selected destination/method. Qualifying amount Q is discounted eligible merchandise after applicable merchandise discounts, excluding tax, shipping, gift cards, and excluded items. Remaining = max(0, T − Q), progress = min(100, 100 × Q / T) for positive T. If T is zero, show eligible free shipping directly. Unknown destination says “Enter your destination to check shipping” rather than displaying an invented threshold. Removing a line recalculates progress. Only say “Free shipping unlocked” when the selected method and destination qualify.

**Matching cushion upsell:** at most one in-stock recommendation from approved compatibility links, preferring the current palette and dimensions. Show color, size, cover/insert status, price, and effect on discount/shipping. One-click add is allowed for a fully named single variant; otherwise open options. No preselected checkbox, no auto-added paid item, and no mandatory recommendation when none is valid.

The upsell explicitly says “Add to [named bed bundle]” with that bundle instance ID when it can fill a permitted cushion slot. The server requotes and mutates that exact group atomically. With multiple compatible bundles, require a target choice before adding. An action labeled “Add as a separate item” creates a standalone line and makes no promise of a higher bed tier. A full cushion group cannot be expanded past its cap through the upsell.

**Promo code:** labeled input plus Apply; explicit pending, applied, expired, not eligible, usage-limit reached, and service-failure states. Show the actual benefit and stacking decision; preserve entered text on error. Remove promo is a real server mutation. Do not leak hidden customer eligibility details through error wording.

### 4.7 Checkout and instant order creation

Guest checkout is first-class. Use a focused checkout shell with brand, secure return-to-cart link, and the current summary. Desktop is 7-column form / 5-column sticky summary; mobile is one column with an expandable summary at top and final total repeated before payment.

Steps are Contact → Delivery → Review & payment, with completed sections editable. Contact captures email and required delivery contact fields only. Delivery uses market-aware addresses, separate optional address line 2, country/region/postal validation, autocomplete attributes, and manual entry fallback. Address verification suggestions must be accepted by the customer, not silently substituted. Show actual available shipping methods, costs, and supported estimate ranges before payment. Billing “same as shipping” is a reversible convenience.

Final review displays every item, size/color, quantity, discount, tax, shipping, total, currency, delivery address, chosen method, and applicable policies. Changing any dependency triggers a fresh quote. Persist cart and checkout progress server-side where appropriate; payment details remain within the payment provider’s supported secure components. Accept password-manager paste/autofill and do not force account creation.

“Instant order creation” means a durable order reference is created promptly after a validated command. It does not mean a browser redirect can declare payment successful. On Place order, create one checkout attempt and pending order/reservations through the transaction described in Section 6. Queue payment setup after commit and show “Preparing secure payment…” while awaiting the provider handoff. Display legitimate pending/unknown/failure states; do not fake a receipt.

Use provider-hosted checkout or approved hosted payment fields. Only configured, verified payment methods appear. After return from the provider, show “Checking payment status” until verified server evidence resolves the attempt. A declined method offers a retry tied to the same order with a new authorized payment attempt as needed, never a duplicated order. A timeout with unknown charge outcome reconciles before another charge can start. Confirmation shows order reference, payment status, line snapshots, shipping details, and receipt access. Offer account creation and Save purchased look after success without blocking the receipt.

Once stock is reserved, show its actual hold deadline and a visible warning at two minutes remaining. Announce the warning once through a polite status region, not every countdown second. “Keep my reservation” appears only if the server/provider supports an extension and reruns its eligibility checks. Expiry preserves contact/address and selections, explains that price/stock must be checked again, and offers “Check availability again.” If payment is active or its outcome is unknown, keep the recovery action in reconciliation mode; do not offer a fresh charge until the existing attempt is safely resolved.

### 4.8 Performance, discovery, and operational UX

Target p75 real-user LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1, separated by mobile and desktop, using the [Core Web Vitals definitions](https://web.dev/articles/vitals). These are targets, not claims that this unbuilt application already meets them. Use repeatable lab budgets before launch and field monitoring afterward. Proposed route budgets: first-view storefront imagery ≤1 MB mobile; route-specific compressed JavaScript ≤250 KB for ordinary shopping pages and ≤350 KB for the builder, excluding provider-hosted payment pages. Reassess with measured device/network results; do not trade correct transactions for a Lighthouse score.

Initial lab profile: pinned Chromium build, 390 × 844 CSS px viewport, device-pixel ratio 2, 4× CPU slowdown, 1.6 Mbps down / 750 Kbps up, and 150 ms network latency, with a recorded test-machine specification. Test cold navigation and cold changed assets separately from warmed-cache swatch interaction; run ten repetitions per path and report median/p95 plus failures. Changed mobile layer derivatives target ≤160 KB. Use the same instrumentation and throttle semantics on each run, document the browser version, and validate a physical mid-range Android device as a separate check. Field p75 goals require real traffic; until sufficient data exists, report them as pending rather than passed from lab results.

Server-render product and category copy, prices with current context, metadata, and navigation. Prioritize the LCP image; lazy-load offscreen media; set intrinsic image dimensions and responsive sizes. Fonts and images reserve layout space. Cache public catalog by market, currency, publication version, and supported audience context; never cache private customer data in a public route. Checkout always revalidates regardless of cache freshness.

Provide canonical product/category URLs, sitemap of published content, breadcrumb structure, and valid product/offer structured data only from real prices and availability. Filter URLs use an intentional indexing policy to avoid unlimited near-duplicate pages. Drafts, admin, account, cart, and private saved looks must not be indexed or exposed in public sitemaps. Document titles and alt text describe actual content rather than stuffing keywords.

Track view_item, select_variant, builder_started, builder_quote_valid, save_look, add_bundle_to_cart, begin_checkout, order_created, payment_confirmed, and purchase/refund reconciliation with stable event IDs. Never emit paid purchase revenue from a button click. Respect configured consent requirements, avoid PII in analytics, and retain functional commerce even when optional analytics is declined.

## 5. COMPANION CUSTOMER ACCOUNT DASHBOARD ("MY SANCTUARY" USER PANEL)

### 5.1 Shell and overview

Routes: **/account**, **/account/orders**, **/account/orders/[id]**, **/account/looks**, **/account/wishlist**, **/account/profile**, and **/account/addresses**. Authentication returns customers to their intended safe internal route. Credentials and session tokens never live in local storage. The storefront header remains recognizable; the account surface uses canvas, surface, soft borders, and Inter controls with a restrained serif page title.

The /sign-in, /register, /verify-email, /forgot-password, and /reset-password screens are adapters to the configured framework identity service, not a separate password database. Implement submission pending, invalid credentials/validation, email sent, verified, expired/used token, throttled, dependency failure, and session-expiry states. Recovery requests use non-enumerating responses and allow resend subject to rate limits. Safe return destinations are internal and allowlisted. Preserve guest cart and non-sensitive builder draft across these routes; only merge into the verified account through the server ownership workflow. Expired verification/reset links offer a working fresh-link request. Support password managers, paste, and accessible field errors.

Desktop has a 224 px side navigation and flexible main content. Navigation: Overview, Orders, Saved bed looks, Wishlist, Profile & preferences, Addresses, Sign out. Mobile converts this to a labeled account navigation disclosure; it does not cram seven tiny tabs across the viewport. Page content width is at most 1200 px.

Overview begins with “My Sanctuary,” an optional first-name greeting, and the most relevant active order. Follow with saved looks, wishlist preview, and bed-size preference summary. No invented membership tier, loyalty balance, or recommendation history. Empty overview offers “Create your first bed look” and “Explore bedding.” A first-time customer does not see zero-value KPI widgets resembling Admin.

### 5.2 Order history and truthful visual status

History cards show order reference, placed date, payment status, fulfillment summary, thumbnail strip, item count, paid amount/currency where confirmed, and View order. Search is by the customer’s own order reference; filter by date and fulfillment state. Paginate 20 orders. “Buy again” revalidates the original variant IDs and opens a review of changed prices or unavailable items; it never silently recreates a historical basket at stale prices.

Order details display an immutable purchased-item snapshot, address snapshot, original allocated discounts, payment/receipt information, shipment-level tracking, and support entry point. Editing the profile/address book does not rewrite an old order. A shipment address change is a separate authenticated request subject to fulfillment cutoffs and an audit trail.

The main tracker follows **Order Placed → Processing → Quality Check → Shipped → Delivered**, with actual timestamps and textual descriptions. Payment state is a separate badge. Quality Check appears only as a real workflow stage with a recorded inspection task; a failed check creates a hold with a truthful explanation, not an automatically advancing animation. Future steps are neutral, not “almost done.” Dates are localized for the viewer, with precise timestamp detail available.

Split orders show separate shipment cards and item quantities. An order with one of three parcels dispatched says “Partially shipped.” Delivered applies to delivered quantities; it does not imply that unshipped items arrived. Cancellation, delay, delivery exception, return, partial return, and refund information appear alongside the timeline. A refund is not proof that goods have been received into stock. Staff changes arrive via the authorized event/refetch contract in Section 6.

While disconnected, show “Last updated…” and a reconnecting/stale indicator. Refetch on foregrounding the page and on reconnect. A failed status refresh preserves the last confirmed data, clearly marked, with Retry. No fake progress based on elapsed time. Guest orders use secure order access verification and may be claimed by a verified matching account through a server ownership workflow.

### 5.3 Saved bed combinations

Grid cards use a truthful composite thumbnail or selected-item collage, saved name, bed dimensions, last edited date, and selected-item count. Actions: Open, Edit, Duplicate, Rename, Delete, and Buy this look. Current pricing is either freshly quoted or explicitly “Check current price”; do not imply the saved price is guaranteed.

Opening restores slot positions and selection IDs. Unavailable or discontinued items remain as labeled unresolved selections with suggested alternatives requiring explicit acceptance. Editing an existing saved look uses its revision; conflicting edits show both timestamps and let the user reload or save a separate copy. Duplicate creates a separate server record. Deletion requires a clear explicit action, a 10-second immediate Undo, and restoration from a Recently deleted view for a proposed 30-day archive period. After that period a scheduled job may purge the look and its unreferenced thumbnail under the approved retention policy; order snapshots remain. Privacy deletion requests follow the applicable separate policy.

Buy this look performs fresh compatibility, inventory, and pricing checks, shows a review, then atomically adds the valid complete selection. A look with unresolved items cannot be sold under the original complete-bundle headline. The customer may intentionally buy the remaining selection with its new tier shown.

### 5.4 Wishlist and saved items

Cards show product, saved color/size when selected, current price context, availability, and Move to cart. Store product-level entries when options are unknown and variant-level entries when exact choices were made; deduplication respects that distinction. Product-level move opens required options. A successful move atomically updates the cart and removes the wishlist entry under one owned command, then offers a 10-second “Undo move.” Undo restores the saved entry and reverses only the quantity delta from that command, never pre-existing cart quantity, using a fresh revision check. If checkout or another edit prevents reversal, restore the wishlist entry and explicitly explain that the cart/order was retained. Failure of the original move leaves it saved.

Out-of-stock items remain visible with a stock state; offer restock notification only if an actual consented notification integration exists. Discontinued items offer explicit removal and clearly identified alternatives. Guests can maintain a device-only wishlist and merge it into the account after sign-in without dropping already saved cloud entries. Counter meaning stays consistent with navigation.

### 5.5 Profile, preferences, and addresses

Profile fields: display name, account email, optional contact phone, locale, preferred units, and separately managed communication preferences. Email change requires verification of the new address and the applicable session security check. Password changes/recovery use the chosen identity system’s secure flows; never build a cosmetic form that does not change credentials. Sign out terminates the relevant session and clears private caches.

Bed preferences are a list of named beds: name up to 40 characters, market/size-system, size label, measured mattress width/length/depth, preferred units, and optional preferred feel/fiber/color families. One may be default. They prefill suggestions but never guarantee compatibility or override a customer’s deliberate selection. Avoid collecting health data for a simple warmth preference.

Address manager fields: recipient, address line 1, optional line 2, city/locality, region where required, postal code where required, country, delivery phone if operationally necessary, optional label, default shipping flag, and default billing flag. Use country-aware requirements, Unicode names, and text values for postal codes. Add/edit validates on the server; delete clearly identifies the address and is scoped to the owner. Default changes are atomic so two defaults cannot arise from concurrent clicks. Historical order snapshots remain intact.

All account mutations include pending/success/error and session-expiry states. Ownership is checked for individual reads, lists, mutations, export/downloads, and subscriptions. Accessible form error summaries link to fields and preserve valid entries. Privacy and account deletion requests follow the merchant’s actual retention obligations; do not delete accounting records because a profile is removed.

## 6. ADMIN CMS & BACK-OFFICE PANEL SPECIFICATION

### 6.1 Admin shell and permissions

Routes: **/admin**, **/admin/products**, **/admin/products/[id]**, **/admin/orders**, **/admin/orders/[id]**, **/admin/inventory**, **/admin/promotions**, **/admin/content**, **/admin/analytics**, **/admin/integrations**, and **/admin/settings**. Use a 240 px dark sidebar, 64 px top bar, 32 px desktop content padding, 16 px mobile padding, and neutral high-contrast tables. On mobile, use a collapsible nav and inspectable record cards or horizontally scrollable labeled table regions. Important operational actions remain usable, though bulk editing is optimized for desktop.

Top bar contains page name/breadcrumb, contextual search, current staff identity, View storefront, and integration health indicator. No customer-facing serif display type in dense Admin tables. List views retain filters, sort, and page state when returning from a record. Long-running operations have job status and a result report, not a success toast at enqueue time.

| Role | Allowed scope | Explicit restriction |
|---|---|---|
| Customer | Own orders, looks, wishlist, profile, addresses | No Admin routes or arbitrary customer records |
| Catalog Editor | Product metadata, variant drafts, approved media | No stock ledger overrides, refunds, or price-policy publication unless separately granted |
| Marketing Manager | Banner/editorial drafts, approved promo and bundle rules | No payment/stock mutation; commercial publication permission is separate |
| Fulfillment Operator | Assigned orders, pick/QC/dispatch evidence and allowed transitions | No arbitrary “Paid” or accounting status updates |
| Inventory Manager | Warehouse stock views and validated inventory adjustments | Cannot directly overwrite a displayed stock balance |
| Finance | Payment exceptions, approved refunds, credit/accounting workflows | Refund does not automatically mark a physical return received |
| Administrator | Role/configuration management and allowed cross-functional operations | Still subject to validation, audit, and controller lifecycles |

Roles can combine according to merchant policy. Sensitive actions require the relevant permission even when an operator can read the record. Scope by company/site/warehouse where applicable. Enforce server authorization on all routes, API methods, records, files, and realtime rooms. A hidden button is not an access control.

### 6.2 Executive overview and KPI definitions

The first row contains date range, reporting timezone, company/store scope, currency, and last refreshed timestamp. Default range is the last 30 complete local reporting days, with today available separately. KPI cards link to the records that explain them. Beneath: revenue trend with accessible data table, category contribution, fulfillment queue, and low-stock list. Show failures and delays rather than replacing missing data with zero.

| KPI | Exact definition | Required companion context |
|---|---|---|
| Total Revenue | Dashboard operational definition: net captured merchandise payments minus posted merchandise refunds in the selected period; exclude tax and shipping; allocate payments/refunds to lines | Label “Net merchandise revenue” below the requested Total Revenue title. It is not a substitute for the general-ledger revenue report. Provide gross captures/refunds separately. |
| Active Orders | Distinct non-cancelled committed orders with at least one accepted, unfulfilled quantity and no terminal closure | Payment-pending orders are a separately displayed queue, not hidden inside active fulfillment. |
| Bundle Conversion Rate | Distinct qualified builder sessions that produced a verified paid qualifying bed bundle within seven days of start / distinct qualified builder sessions started in the selected cohort window | Qualify at first deliberate selection and successful valid quote; exclude staff/test/bots under documented rules. Show sample sizes and immature cohorts. Anonymous attribution is consent-aware. |
| Category Breakdown | Net merchandise revenue allocated to purchased line categories using order-time category and discount snapshots | Returns reduce the original category; show value and share. Bundle lines retain their own categories. |
| Low-Stock Alerts | Enabled SKU/warehouse combinations with available-to-promise at or below their configured reorder threshold | Show on-hand, reserved, available, threshold, warehouse, and suggested operational action. Do not silently count incoming stock as sellable. |

Use one currency per displayed total unless a documented FX source, rate timestamp, and reporting conversion policy are selected. Do not sum unlike currencies. Revenue updates from financial events, not a paid-looking UI badge. Aggregate scheduled snapshots or bounded queries avoid scanning every order for every dashboard request. Show data freshness; a one-minute analytics delay is acceptable if labeled, while operational order details refetch immediately after committed changes.

### 6.3 Complete bedding product and variant manager

The product list has image, title, category/subtype, publication state, variant count, price range, available units, low-stock flag, modified by/time, and actions. Search by SKU/title; filter by category, draft/published/archived, material, low stock, and warehouse. Sort and paginate server-side, default 25 rows and maximum 100. Column selection and saved views improve density. Bulk selection shows exact count and scope; “all results” is explicit rather than assumed.

The editor has tabs **Overview, Materials & feel, Variants & pricing, Inventory, Media & preview, Care & fit, SEO & publishing**. A sticky action row contains Save draft, Preview, and Publish if allowed. Unsaved navigation prompts protect work. Validation appears at field and tab level; first error receives focus. Successful save updates the revision; concurrent edits return a conflict with changed fields and reload/merge choices.

| Exact field | Type / constraint | Editor behavior and authority |
|---|---|---|
| Product ID | Opaque immutable ID | Generated server-side; not user-editable |
| Title | Required trimmed string, 3–120 characters | Product H1; no embedded markup |
| Slug | Required unique normalized string, max 160 | Suggest from title; published changes create an intentional redirect |
| Category | Required enum: Blankets, Sheets, Duvet Covers, Cushions | Merchandising category; accessory subtype remains explicit |
| Product type / subtype | Controlled enum including sheet_set, fitted_sheet, duvet_cover, blanket, throw, cushion_cover, pillow_insert, duvet_insert | Drives required fields, compatibility, and cover/insert wording |
| Short description | Required plain text, max 240 | First purchase-panel summary |
| Full description | Sanitized structured rich content, max 20,000 characters | Approved blocks only; no script or arbitrary embedded HTML |
| Base price | Required positive decimal input with selected price-list currency | Display template default; materialize and validate per-variant Item Price. API uses minor units. |
| Sale price | Optional positive decimal, strictly below valid base/reference price | Requires start/end/timezone and permitted market rules; no fake reference price |
| Fiber composition | Required component-specific arrays of named fibers and percentage; each component sums to exactly 100 | Record outer fabric/shell, lining and filling separately where applicable. Outer contact fabric drives default fiber filters; filling has a separate filter/fact. Controlled fiber IDs plus approved labels. |
| Fiber origin / manufacture origin | Optional separate country/region fields and evidence reference | Required evidence before “Egyptian” or “French” provenance claims are published |
| Fabric Type display label | Required approved merchandising label | Derived/curated from material attributes, not a substitute for them |
| Weave / construction / finish | Separate controlled fields with subtype-appropriate applicability | Percale/sateen under weave; chunky knit/Sherpa/waffle under appropriate construction/finish taxonomy |
| GSM | Nullable positive decimal plus unit fixed g/m², method/source | Applicable to the specific product; null is not zero |
| Thread count | Nullable positive integer plus basis/method/source | Only on applicable woven textiles; no automatic quality ranking |
| Total blanket weight / filling | Nullable positive decimal total kg; component-specific filling material and fill weight where relevant | Total mass required for weighted blankets. Do not mix shell fiber percentages with glass beads or other filling composition. |
| Softness / Warmth / Breathability | Each nullable integer 1–10 | Slider plus numeric input and text endpoints; require assessment method, assessor/date, and explanation before display |
| Available sizes | References to valid SizeSpec records | Twin/Queen/King plus region and actual measurements; cushion dimensions explicit |
| Fitted pocket depth | Positive canonical mm when fitted product | Required usable depth range and tolerance if supplier provides one |
| Included parts | Array of component type, quantity, description, optional linked SKU | States what one sale unit contains; inventory behavior must follow the declared stocked-set or component model |
| Compatible inserts/accessories | Array of variant/product relationships and dimension rules | Used by builder and contextual upsells |
| Care instructions | Structured wash/dry/bleach/iron fields plus approved notes | Required subtype-appropriate care before publication |
| Stock count | Read-only on-hand/reserved/available by SKU and warehouse | Adjustment action opens stock workflow; no editable Item stock_count field |
| Reorder threshold | Nonnegative integer by SKU/warehouse, inventory permission | Drives low-stock alerts, not a fabricated purchasing promise |
| Images / Image URLs | Ordered media references from uploads or approved HTTPS CDN URLs | Require role, alt text, width/height, focal point, rights, variant/color binding, and review status |
| Multi-color swatch builder | Repeatable color ID, unique name 2–40 chars, HEX matching #RRGGBB, family, texture media, sort order | HEX picker plus text input; variant assignments must use stable color IDs |
| Preview assets | Versioned camera/template/slot/variant asset records | Builder eligibility requires complete approved asset coverage for advertised selections |
| Certification claims | Optional issuer, claim, evidence reference, validity dates | Expired or unsupported claims cannot publish |
| Publication state | draft, published, archived; optional scheduled time | Publish validates all dependent records and required media |

Variant table fields: immutable variant ID, unique SKU, product template ID, color ID, size ID, permitted material/weave/finish IDs, barcode optional, stock UOM, sale unit contents, per-variant price overrides, sale schedule, inventory policy, active flag, and media mapping. Enforce uniqueness of the actual dimension tuple; never generate the full Cartesian product of nonexistent combinations. Allow a preview of proposed variants and reject invalid or duplicate rows before creation.

The initial feel rubric uses documented bands 1–3, 4–6, 7–10 with per-axis explanatory notes and consistent benchmark samples. It is a merchant comparison tool, not a laboratory test. If the team cannot substantiate a score, leave it unassessed and omit the visual meter rather than inventing the middle value.

**CRUD behavior:** Create validates a draft, Read honors role/field permissions, Update checks revision and business constraints, Delete permanently removes only unreferenced drafts after a validation preview and explicit confirmation. Products or variants referenced in orders, looks, prices, or inventory history are archived/disabled; historical line snapshots remain. Restore from archive reruns publication checks. Bulk imports run a dry-run report with row-level errors, duplicate detection, and impact counts before an authorized apply action; large imports are background jobs with bounded batches.

**Inventory adjustment:** display current balances and let permitted staff enter the proposed count/change, warehouse, reason, and supporting record. Preview the difference, valuation/operational effects where applicable, and affected SKU list. Commit through the appropriate ERPNext Stock Reconciliation or Stock Entry controller workflow. Receive success only after document commit. Never update a stock number through product CRUD or a browser counter.

**Media safety:** uploads have type, byte-size, pixel-dimension, and decoding limits. Validate real file content, not just extension. Image URLs are restricted to approved media domains; do not provide a generic server URL-fetch facility that can reach internal addresses. Sanitize metadata, retain rights/approval records, and keep private assets on permission-checked routes. Publish validation checks all referenced media exists.

### 6.4 Live order and fulfillment manager

Order table columns: reference, placed time, customer, payment state, fulfillment state, total/currency, item count, shipping method, exception flag, and age since last operational event. Tabs: All, Payment pending, Ready to process, Quality check, Ready to ship, Exceptions, Completed. Server-side filters/search apply permission scope and pagination. Sensitive contact fields are limited to roles needing them.

Selecting a row opens a 720 px desktop inspection drawer or full-screen mobile view. It contains summary/payment, line items and bundle groups, shipping address, fulfillment/shipment history, QC evidence, notes, and audit trail. A full detail URL is available. Notes distinguish internal comments from customer-visible updates. Do not send a customer message merely because a staff member typed an internal note.

The requested status dropdown lists **allowed next actions**, not arbitrary target strings. Selecting an action opens required evidence and a concise preview of effects; Confirm sends a validated transition with expected revision. Failed validation leaves the old state intact. Native Sales Order status is not rewritten to imitate the customer tracker.

| Customer milestone or exception | Authoritative trigger | Required fields / safeguards |
|---|---|---|
| Order Placed | Committed order record | Reference and timestamp; payment independently pending/paid |
| Processing | Order accepted for fulfillment under payment/business policy | Assigned queue/warehouse, actor/time; required inventory reservation |
| Quality Check | Actual inspection task opened | Inspection reference, item quantities, checklist, responsible operator |
| QC passed / hold | Inspection result recorded | Result, reason for hold/failure, next allowed action; history preserved |
| Shipped | Dispatch evidence and linked submitted Delivery Note | Shipment ID, line quantities, carrier/service, tracking or manual handoff proof, dispatch time; prior QC requirement satisfied |
| Delivered | Verified carrier delivery event or authorized manual proof | Timestamp, shipment quantities, evidence/reason; cannot infer from Delivery Note submission |
| Cancelled / partially cancelled | Validated cancellation of eligible unfulfilled quantities | Reason, payment/refund consequence preview, release reservations; shipped goods follow returns instead |
| Return / partial return | Approved return and physical receipt workflow as applicable | Original lines/quantities, condition, warehouse, credit/refund references; separate stock and financial outcomes |

Order aggregate fulfillment is derived from line/shipment quantities. Do not force every item into the same milestone. Carrier events cannot move Delivered back to Shipped; corrections append audited events with proper permission. Changes are visible in My Sanctuary after commit/refetch, normally within two seconds under healthy infrastructure. This is a measured service target, not a claim of guaranteed instantaneous networking.

Refunds require finance permission, preview of refundable net amounts, reason, and explicit confirmation. Reuse original discount allocations. Atomically reserve each refund operation’s amount: available refundable value equals captured funds minus confirmed refunds minus pending or unknown refund claims, accounting for disputes/chargebacks under Finance policy. Use a unique operation ID and stable provider idempotency key; release a claim only after definitive failure or reconciliation. A second operator receives a conflict if the remaining amount changed. A return stock receipt and monetary refund are separate controller-backed actions. Partial returns do not silently reprice retained items at today’s catalog price. Proposed customer policy is no retroactive bundle clawback; any different approved policy must be disclosed before checkout and represented in the order snapshot.

### 6.5 Promotions, bundles, and homepage CMS

**Promo record fields:** name; unique normalized code; benefit type percent/fixed/shipping; value and currency where applicable; validity start/end with timezone; enabled state; eligible/excluded categories/SKUs; minimum eligible subtotal; maximum discount; global and per-customer usage limits; stacking policy; market/channel restrictions; and audit metadata. UI requires numeric ranges and sane date order. Preview quotes for a representative basket before publication; simulate eligibility and exact allocations. Enforce limited-use redemptions atomically at checkout, with documented release behavior for expired/failed attempts. Do not rely on a read-then-increment race.

**Bundle policy fields:** policy version, effective dates, enabled state, eligible groups and SKU exclusions, tier group-count thresholds, percent basis points, maximum discount, maximum eligible quantities, sale-item treatment, stacking, and refund policy reference. Initial tier proposal is 0/5/10% for 1/2/3 groups. One bundle may contain one foundation, one main top item, one optional throw, at most five decorative cushion units, and at most one selected insert per compatible cover. A merchandise unit belongs to only one discount bundle. Included pillowcases inside a sheet set never qualify the decorative-cushion group. Quantity beyond allowed slots is a separate line and cannot inflate tier qualification.

Require nondecreasing tiers, percentages from 0 to 100 expressed as integer basis points, bounded eligible quantities, and margin-impact simulation. The policy can set a stricter commercial ceiling. Changes create a new version, preserve accepted order snapshots, and invalidate affected quotes. Activating a policy is a distinct publish action; editing a draft does not change live prices.

**Hero/banner fields:** internal name; page/placement; headline max 80 characters; supporting copy max 180; primary/secondary CTA labels max 28; safe internal route or approved URL; desktop/mobile media references; descriptive alt text or decorative flag; breakpoint focal points; start/end; locale; priority; and draft/published state. Announcement text max 120 with optional link. Preview at 390 and 1440 px and test the actual image contrast/crop. Do not insert arbitrary HTML into announcement text.

Homepage collection blocks reference published product/recipe IDs with explicit ordering. Validate that targeted products and look variants are available or display an approved unavailable behavior. Draft preview URLs are signed, permission-limited, expiring, and excluded from indexing. Publication promotes a complete version atomically and invalidates affected caches after commit. Rollback promotes a previously published valid version as a new audited event. The CMS tracks author, revision, approver if required by role policy, publication time, and reason.

### 6.6 Official architecture and source of truth

**Recommended implementation baseline:** Next.js App Router with TypeScript and Tailwind for the three frontend shells; a custom Frappe application over ERPNext for commerce commands, metadata, and fulfillment projections; ERPNext for catalog variants, accounting, and stock; authenticated Frappe realtime notifications; background workers for integrations and media processing. This is a recommendation aligned with the project instructions, not a claim that these systems are already installed. Pin compatible supported versions and record the matrix before implementation. No version-specific API may be assumed from a generic example.

Use server-rendered public content and client islands for the builder, dialogs, cart, and interactive tables. A same-origin authenticated gateway may organize frontend requests, but it must preserve the actual user and permission scope. Never ship an ERP administrator API key to the browser or use a broad service credential as a substitute for customer ownership checks. Browser credentials use secure HttpOnly sessions, applicable SameSite and CSRF protections, rate limits, and safe internal redirects. Validate staff sessions and revoke access on role/session changes.

| Domain | Authoritative record / responsibility |
|---|---|
| Product family and sellable combination | ERPNext Item template / Item variant, plus commerce metadata and dimension/color records |
| Base/sale price | Item Price plus one documented pricing service that owns bundle/promo rules; no competing discount calculators |
| Inventory | ERPNext stock ledger and supported Stock Reservation Entries, by SKU/warehouse |
| Cart and accepted quote | Custom Cart with revision and immutable Commerce Quote with allocations/expiry |
| Saved looks and wishlists | Owner-scoped custom documents; variant references and schema versions |
| Order | Sales Order plus commerce snapshot/projection; linked invoice/payment/delivery documents |
| Fulfillment | Audited fulfillment events, QC records, shipment quantities and evidence |
| Content and promotions | Versioned draft/published CMS and pricing-policy documents |
| Integration reliability | Custom durable task/outbox, idempotency record, webhook receipt, and reconciliation records |

These custom records are implementation requirements, not built-in Frappe DocTypes. Stable business kits may use an [ERPNext Product Bundle](https://docs.frappe.io/erpnext/product-bundle); its inventory model differs from a stocked parent. Customer-built beds instead group real sale lines through bundle_instance_id, preserving each SKU’s stock/price lineage. Follow the official [Item Variant model](https://docs.frappe.io/erpnext/item-variants) and verify the selected version’s supported behavior.

Implement invariants in Document controllers: **validate** for dimensions, permitted combinations, monetary constraints, ownership and transitions; **on_submit** for submission-time document effects within the current transaction; **on_cancel** for valid reversal/release behavior within that transaction. These controller hooks are not after-commit hooks. Notifications and external work wait for commit. Coordinate linked ERP documents through their public controller workflows, not arbitrary status assignments. No direct SQL UPDATE, db.set_value, or bulk insert may bypass Sales Order, payment, or inventory controllers. [Frappe controllers](https://docs.frappe.io/framework/user/en/basics/doctypes/controllers) and [database transactions](https://docs.frappe.io/framework/user/en/api/database) are the implementation reference.

Batch catalog/variant/price/stock reads by page IDs; avoid one query per product or swatch. Enforce bounded pagination and field allowlists. Chunk imports and process large work in workers. bulk_insert is acceptable only for explicitly documented controller-independent records with validation and permission checks, not as a way to bypass commerce lifecycle hooks. Public endpoints must not accidentally use permission-bypassing get_all for private records.

### 6.7 Typed domain and command contracts

The implementation must publish a strict versioned JSON Schema/OpenAPI contract and generate or validate matching TypeScript types. Backend command inputs use strict Pydantic models where compatible with the pinned Frappe environment; do not replace framework dependencies ad hoc. Reject unknown properties and invalid enum/number coercions. [Pydantic strict validation](https://docs.pydantic.dev/latest/concepts/strict_mode/) supports that boundary; application validators still enforce cross-field and authorization rules.

Shared scalar rules: opaque bounded IDs, ISO 8601 UTC timestamps, explicit schema_version, integer quantities (1–99 unless a stricter slot rule applies), bounded page size ≤100, nonnegative integer minor-unit amounts with currency, and percentage basis points 0–10,000. Money remains within JavaScript safe-integer bounds. Browser values never authorize prices, owners, roles, stock, or transitions. Canonical measurements use mm and kg; convert for display without silently altering supplier tolerances.

| Contract | Required shape and invariants |
|---|---|
| Money | amount_minor integer; currency ISO code; precision resolved from supported currency configuration; no float transport |
| SizeSpec | id, market, label, width_mm, length_mm, optional pocket_depth_mm, measurement_tolerance, product_role |
| SellableVariant | id, product_id, SKU, color_id, size_id, fiber/weave references, active state, sale UOM, authoritative price and availability contexts |
| BedSelection | schema_version, market, bed_size_id, slots of slot_id/variant_id/quantity/position, compatible insert links, selection_revision |
| CommerceQuote | quote_id, input revision/hash, immutable resolved lines, allocations, policy version, currency, totals with estimate flags, expires_at, warnings |
| Cart | id, owner or scoped anonymous identity, revision, bundle groups, line IDs and quantities, latest quote reference, updated_at |
| SavedBedLook | id, server-derived owner, name, schema version, selections, source labels, revision, optional thumbnail status, updated_at |
| OrderProjection | id/reference, revision, purchased line/address/policy snapshots, independent payment/fulfillment/return states, shipment quantities, timeline |
| RealtimeEvent | event_id, schema_version, aggregate_type/id/version, event_type, occurred_at; no private full document payload |
| API error | stable code, safe message, field_errors/line_errors, retryable flag, request_id, current_revision when authorized; no stack traces or secrets |

All endpoint names below are **logical custom contracts to implement**, not existing ERPNext APIs. Read operations are safe and paginated; mutations use authenticated POST-style commands with CSRF protection as appropriate. Frappe whitelisted method adapters must perform their own role/ownership validation rather than granting arbitrary DocType CRUD to clients.

| Command | Client input | Server result and important checks |
|---|---|---|
| catalog.search / catalog.get | Approved filters, sort, page/cursor, market; product ID/slug | Published scoped products/variants/facets; stable page context and real price range |
| bed.quote | BedSelection, destination context, optional promo | CommerceQuote; validate SKU, compatibility, price policy, and availability; no reservation |
| cart.add_bundle | quote_id, expected_cart_revision, idempotency_key | Whole bundle added or none; authoritative cart and revision |
| cart.update | line/group operations, expected revision, idempotency key | Revalidated cart/quote; reject partial accidental bundle mutation |
| look.save / wishlist.mutate | Selection/entry change, expected revision, command ID | Owned persisted record; owner derived from session; limits enforced |
| checkout.create | cart revision, quote ID, validated address reference or guest address, shipping method, idempotency key | Durable checkout/order ID and pending/ready payment setup state; atomic reservations |
| checkout.status | Scoped checkout ID | Confirmed payment state, safe next action; no client-declared paid flag |
| order.get / order.list | Scoped ID or bounded filters | Only authorized records; immutable purchase snapshots plus current fulfillment |
| admin.product.save | Validated product/variant delta, expected revision | Saved draft or field errors/conflict; publish is separate |
| admin.product.publish | product ID, revision, validation token | Validated published version; all required data/assets present |
| admin.fulfillment.transition | order/shipment ID, expected revision, action, reason, evidence | New committed projection or legal-transition/quantity errors |
| admin.promotion.simulate / publish | Draft policy/version and test basket; then approved revision | Deterministic preview, then audited active version |
| admin.destructive.preview / execute | Action, scoped IDs and intent; then expiring preview token, revision, reason | Preview impact; execution revalidates same scope/current state and fails if changed |

Standard error mappings: 400/422 VALIDATION_FAILED; 401 AUTH_REQUIRED; 403 FORBIDDEN; 404 NOT_FOUND for inaccessible owner-scoped records where appropriate; 409 VERSION_CONFLICT, PRICE_CHANGED, OUT_OF_STOCK, or IDEMPOTENCY_CONFLICT; 410 QUOTE_EXPIRED; 429 RATE_LIMITED; 503 DEPENDENCY_UNAVAILABLE. PAYMENT_PENDING is a successful unresolved business state, not necessarily a server error. All retry UI respects the server’s safe next action.

Idempotency records have a database-enforced unique scoped key, canonical request hash, processing/completed state, original result/reference, and timestamps. Same key plus same request returns the original outcome; same key plus different payload returns conflict. Concurrent identical requests cannot both create orders. Keep checkout/payment identifiers for reconciliation and audit; never prune them while delayed retries or provider events can still arrive. Anonymous access uses an unguessable scoped cart token that rotates on ownership transfer.

Expected revisions must be checked atomically with mutation, using the pinned framework’s supported transactional concurrency mechanisms. A preliminary read-and-compare is insufficient. Prove this for simultaneous cart edits, default-address changes, saved-look updates, promotion claims, and staff edits. Scope any required serialization to the specific aggregate whose race has been demonstrated.

The versioned checkout state enum is payment_setup_pending, ready_for_payment, payment_processing, accepted, expired, cancelled, or payment_exception. accepted means commercial acceptance, not delivery. Apply this transition matrix through the serialized checkout command boundary; any unlisted transition fails validation.

| Source state | Allowed next states | Actor and evidence |
|---|---|---|
| payment_setup_pending | ready_for_payment, accepted, expired, cancelled, payment_exception | Integration worker records provider setup; verified acceptance may arrive before setup response; expiry/cancel/exception requires corresponding lifecycle checks |
| ready_for_payment | payment_processing, accepted, expired, cancelled, payment_exception | Payment handoff records processing; verified provider evidence establishes acceptance; expiry/cancel checks prevent active unknown charges being abandoned blindly |
| payment_processing | accepted, ready_for_payment, expired, cancelled, payment_exception | Verified provider/reconciliation evidence; ready_for_payment only after definitive unsuccessful attempt with valid hold; expiry/cancel requires safe provider finalization or explicit late-event compensation path |
| accepted | No checkout-state change | Order fulfillment, return, refund and dispute evolve in separate records; success history remains |
| expired or cancelled | payment_exception | Late successful provider evidence requires stock reacquisition or compensation; never auto-reopen payment UI |
| payment_exception | accepted, expired, cancelled | Authorized reconciliation/Finance command with matched payment and recovered stock, or confirmed void/refund/no-charge outcome; audit required |

For acceptance from any nonterminal state, require matching immutable amount/currency, the configured authorization/capture policy, and valid serialized stock/promo claims. Webhooks can arrive before a browser redirect or setup response, so intermediate UI states are not mandatory evidence. Separate payment-attempt states are setup_pending, requires_action, processing, authorized, captured, declined, cancelled, or unknown; refund states are requested, processing, succeeded, failed, or unknown; dispute states are none, open, won, or lost. Each configured provider must supply a tested mapping from its actual lifecycle to these enums, including permitted evidence-based transitions and recovery from unknown. Captured remains part of history after a refund/dispute; a retry after definitive failure is a new attempt linked to the same checkout, not a rewrite of the old attempt.

### 6.8 Transaction, inventory, and payment lifecycle

No browser action can atomically commit both a database order and an external card charge. Implement a recoverable state machine with durable tasks and provider idempotency. Native stock reservation must be enabled and verified for the pinned ERPNext release; a Sales Order by itself is not sufficient. [ERPNext Stock Reservation](https://docs.frappe.io/erpnext/stock-reservation) documents the supported feature, but its documentation does not prove every concurrency interleaving safe.

1. Receive checkout.create, authenticate/scoped guest identity, validate request schema, establish unique idempotency ownership, and atomically claim the cart revision for checkout. Enforce a database-unique (cart_id, cart_revision) checkout binding: repeated submission returns the existing checkout even with a different command key. Intentional reorder requires a new cart/purchase intent. A processing checkout cannot be edited into a new payable attempt until the prior attempt is safely cancelled or reconciled; later edits create a new revision with an explicit supersession link.
2. Refresh quote and delivery/tax policy, require acceptance of any payable change, and validate every SKU/quantity/address/method.
3. In one bounded Frappe transaction, create and submit the Sales Order through the pinned release’s supported lifecycle required by native reservation, save the immutable commercial snapshot, reserve all required stock through supported controllers, reserve any limited promotion entitlement, and persist the pending payment task/outbox. payment_pending remains a separate commerce state. A failure of any required line rolls back the whole command, including its cart-revision claim.
4. Commit. Return the durable checkout reference and payment_setup_pending if setup is not yet ready. Publish notifications and enqueue the durable task after commit.
5. Worker creates the provider payment session/intent with the stable provider idempotency key and records the result. Client polls or receives a minimal event and opens the secure payment flow. Network calls never hold stock-row locks.
6. Verify provider events, reconcile payment, and advance the payment/order workflow. Prefer authorization-before-capture when the selected gateway and business flow support it. Fulfillment requires the configured acceptance policy and valid stock reservation.
7. Expire abandoned reservations through a scheduled controller-backed job. Proposed default hold is 15 minutes for compatible immediate payment methods; show the deadline clearly and configure extensions/settlement policies per provider. Expiry, payment acceptance, cancellation, and extension serialize through one short checkout lifecycle transition using a supported lock or atomic revision claim. Expiry rechecks payment state and hold generation inside the transaction, releases only eligible stock/promo holds, and marks checkout expired atomically. Cancel or close the abandoned unfulfilled ERP commitment through its permitted workflow so it does not remain an active order. No network call occurs while locked. Do not enable long-settlement methods until their reservation policy is defined.
8. If success arrives after expiry, revalidate/re-reserve before fulfillment. If stock cannot be obtained, enter a visible payment exception and authorized void/refund process. Never conceal an oversell behind a successful receipt.

The last-unit race is concrete: two buyers both observe one available unit and each attempt to reserve one. Test native reservation transactions with simultaneous requests against the actual database/version. Prefer its existing locking and constraints. If a proven check-then-act gap remains, document the exact interleaving and use narrowly scoped supported locking on only the affected SKU/warehouse balance records in a stable order. No broad locks, speculative for_update on catalog reads, or direct SQL stock updates. Re-run the last-unit and partial-bundle rollback tests before enabling payment.

Frappe’s successful write requests and jobs participate in its transaction model; caught exceptions must not accidentally commit partial state. Use documented savepoints/rollback when necessary. Linked operations must not introduce premature commits. Emit no “order created” or inventory success event until the transaction commits.

External API syncs and any job exceeding 30 seconds use [frappe.enqueue](https://docs.frappe.io/framework/user/en/api/background_jobs), with enqueue_after_commit for work dependent on newly committed records. Persist an outbox/task in the transaction because an after-commit callback alone can be lost if the process dies before enqueue. A scheduled scanner recovers committed undispatched tasks; workers acquire a bounded lease/claim and can safely repeat work.

Integration policy: connection timeout 5 s, total request timeout 15 s unless the provider contract requires a justified alternative; retry transient timeouts/429/5xx with the same idempotency key; at most five attempts with exponential delays based on 30 s × 2^(attempt−1), full jitter, and a 15-minute cap, while respecting valid Retry-After. Validation and permission failures are not retried. Five transient failures within 60 seconds open the provider circuit for 60 seconds; allow one half-open probe. Exhausted jobs enter a visible failure queue with reason, attempts, next safe action, and correlation ID. These are initial operational settings to validate under load.

Webhook intake validates the provider’s raw-body signature and replay rules, records the receipt durably, and acknowledges according to its contract. Deduplicate receipts by (provider, merchant account, provider event ID) and economic operations by stable operation identity, such as authorization, capture, or individual refund ID. Distinct lifecycle events for the same payment remain processable. Before recognizing payment, verify provider environment/account, payment object, checkout binding, currency, and authorized/captured amount against the immutable accepted checkout. Quarantine mismatches; client metadata and signature validity alone cannot establish a valid order payment. Handle out-of-order events without regressing completed operations; refunds and disputes have independent states. Capture/refund timeout means outcome unknown; reconcile before issuing another economic operation. Scheduled reconciliation applies the same binding checks to unsettled attempts and exposes mismatches to Finance.

Returns use appropriate linked [Sales Return](https://docs.frappe.io/erpnext/sales-return) and [Credit Note](https://docs.frappe.io/erpnext/credit-note) workflows. A submitted [Delivery Note](https://docs.frappe.io/erpnext/delivery-note) affects stock/fulfillment accounting; it does not certify delivery to the customer. Avoid restoring inventory twice through both a return and a generic adjustment.

### 6.9 Unified real-time state across all three panels

Use a single authoritative API/domain model and separate scoped client query caches. Local UI state holds open drawers, active steps, or unsaved selections. The frontend must never maintain independent durable product/order inventories for each panel. A server mutation returns the new authoritative snapshot/revision; optimistic UI is limited to reversible presentation and reverts on failure. Do not optimistically mark payment successful or a shipment delivered.

Use established authenticated [Frappe realtime APIs](https://docs.frappe.io/framework/user/en/api/realtime) and a supported custom client connection. Exclude experimental nightly realtime handler features unless a later separately validated architecture decision adopts them. An event contains identity/version metadata only; clients refetch authorized projections. Events for private orders/looks go only to authorized user or document rooms, never a public broadcast. Permissions also apply during room subscription and after session/role changes.

| Committed change | Required invalidation |
|---|---|
| Product/color/media publication | Catalog list, relevant PDP, builder option catalog, wishlist/saved-look summaries |
| Price or promotion version | Affected quotes/cart estimates and catalog price views; accepted order snapshots remain fixed |
| Stock reservation/release/receipt | Availability views and affected active checkout validation; never infer a reservation from a badge |
| Order/QC/shipment/payment event | Admin order detail/queue, authorized customer order detail/history; KPI projection refresh as appropriate |
| Saved look/wishlist/profile/address change | Owner’s current device and other authenticated sessions |
| Banner/content publish | Affected public route/cache version, preview publication indicator |

Consumers deduplicate event_id and discard aggregate versions older than their current snapshot. Version gaps trigger a fresh fetch. A socket event is an invalidation hint, not an exactly-once transport guarantee. On reconnect, sign-in, returning to foreground, or role change, refetch relevant snapshots. If disconnected, show stale state and poll active order/checkout data every 15 seconds, active catalog/cart data every 30 seconds, with jitter and backoff up to 120 seconds during failure; stop background polling when hidden. Rate limits and server load may require negotiated slower intervals.

Healthy order-state propagation target is ≤2 seconds to an active authorized viewer; polling fallback target is within its stated interval plus network time. Monitor missed-event recovery, stale-view duration, permission errors, and queue lag. A delayed event cannot roll back a newer response or overwrite an unsaved edit. Staff editing conflicts show a banner and require deliberate reconciliation.

### 6.10 Security, observability, and deployment readiness

Use allowlisted fields, parameterized framework queries, sanitized rich content, secure uploads, restricted remote media origins, private response caching rules, and scoped authenticated sessions. Rate-limit login, search, guest cart creation, quote generation, checkout, and promo validation. Protect credential recovery and verification from account enumeration. Bound request sizes, selected-item counts, asset dimensions, and background task volume. Audit price changes, stock changes, policy publication, order transitions, cancellation, and refunds with actor/time/reason/before-after references; do not log payment secrets, tokens, or full customer PII.

Required operational signals: API latency/error rate, inventory reservation failures, duplicate command rate, payment unknown states, provider circuit state, outbox age, job retry/dead-letter counts, realtime disconnects, checkout funnel and paid-order reconciliation, and stale catalog/media references. Alerts route to real operational ownership configured before launch. Backups must include restore rehearsal and handling of provider reconciliation after recovery. Production and test data/credentials remain isolated.

No LLM is necessary for this specification’s transactional features. If later added for copy assistance, it cannot price orders, change stock, select fulfillment transitions, or publish claims autonomously. Use bounded inputs, strict output contracts, redacted/summarized context, capped retries/circuit breakers, and human validation before business mutation. Do not send raw customer tables to a model.

The following are concrete launch inputs, not values for GPT-6 Sol to fabricate:

| Owner | Required production input | Gate |
|---|---|---|
| Merchant | Approved brand identity, actual catalog, prices, fiber/origin evidence, dimensions, contents, care, real imagery and rights | No product/hero publication with missing required data |
| Commerce/Finance | Company, market/currency/precision, tax configuration, price lists, approved discounts/returns, accounting mappings | Quote/checkout readiness tests must reconcile totals |
| Fulfillment | Warehouses, stock opening balances, reservation settings, shipping regions/methods, QC process, carrier/manual evidence procedure | Last-unit, dispatch, cancellation, and return exercises pass |
| Payments | Selected provider, credentials, webhook configuration, supported currencies/methods, capture/refund policy | Sandbox and controlled production readiness verified; no fake payment success |
| Engineering | Version matrix, deployed API/workers/realtime, secrets management, observability, restore and recovery runbooks | All integration contracts and failure tests pass |
| Content/Marketing | Published hero, announcement, real look recipes, policy pages, consent and analytics configuration | Links/media/claims verified; no dead controls or invented social proof |

Missing production configuration produces a clearly unavailable feature and an Admin readiness error; it must not silently fall back to mock data. Test fixtures are allowed only in isolated tests/staging with explicit identification. “Zero placeholders” means every shipped feature is backed by a functioning service and real approved data, not that absent merchant decisions should be guessed.

### TECHNICAL HANDOFF CHECKLIST FOR GPT-6 SOL

Treat this as a release gate. Do not mark the task complete after rendering three attractive screens. Implement and demonstrate each item with the real backend integration or leave the release explicitly incomplete.

- [ ] Preserve all six sections’ requirements in an implementation traceability list; record pinned Next.js, Tailwind, Frappe, ERPNext, Python, Node, and database versions and official compatibility references.
- [ ] Register the exact semantic palette, typography, spacing, radii, shadows, motion, and breakpoint tokens once; all three panels consume them with their intended surface variants.
- [ ] Map every public, account, and Admin route to a working page with real success, loading, empty, validation, error, and permission states. No dead buttons, placeholder navigation, fake charts, or simulated successful mutations.
- [ ] Implement the separate fiber/origin/weave/construction model, canonical dimensions, fitted depth, cover/insert distinctions, conditional GSM/thread count, and evidence-backed feel scores.
- [ ] Use real variant records, per-variant prices, actual stock sources, approved media and complete builder assets for the advertised builder catalog. Never recolor an unrelated texture and represent it as the selected product.
- [ ] Demonstrate all three layers, named swatches, explicit quantities, optional inserts/throw, size compatibility, reveal controls, latest-selection image behavior, save/reload, and one-command complete-bundle add.
- [ ] Enforce group-based tiers, quantity caps, one-bundle-per-unit membership, sale/promo eligibility, deterministic rounding, line discount allocations, shipping threshold rules, and immutable order price snapshots on the server.
- [ ] Publish strict request/response schemas and generated or validated frontend types; reject forged price/owner/role/stock/discount inputs and unknown properties.
- [ ] Persist cart, wishlist, saved looks, profile, addresses, and orders; verify reload, second-device access, guest-to-account merge, and ownership isolation. A browser store is never the authority.
- [ ] Validate Frappe Document lifecycle behavior and transaction boundaries; use native stock/accounting workflows; no direct business-table updates or bulk insertion around controllers.
- [ ] Prove simultaneous last-unit checkout permits only the allowed quantity; partial bundle shortage rolls back all required reservations/order effects; no lock spans a provider network call.
- [ ] Prove repeated add/checkout commands, browser back/reload, response loss, same-key requests, and different-key submissions for the same cart revision produce one intended result; a changed payload with the same key fails safely.
- [ ] Complete real payment setup, signed and amount/account-bound webhook handling, distinct authorization/capture/refund events, unknown-outcome reconciliation, reservation-expiry/payment races, late-success compensation, concurrent refund claims, cancellation, and partial refund flows.
- [ ] Persist integration tasks before commit; demonstrate recovery after process death between commit and enqueue, worker crash/retry, and temporary queue/provider outage. Retry caps, jitter, circuit breakers, and failure queues must operate.
- [ ] Demonstrate Storefront/My Sanctuary/Admin synchronization from committed records, authorized subscriptions, revision ordering, reconnect refetch, polling fallback, and truthful stale-state messaging.
- [ ] Implement legal fulfillment transitions and real QC/dispatch/delivery evidence. Demonstrate partial shipment, delivery exception, partial cancellation, return receipt, and partial refund without corrupting order history.
- [ ] Verify Admin product CRUD, variant uniqueness, stock adjustment preview, concurrent-edit conflict, promotion simulation/publication, limited-promo concurrency, CMS scheduling, cache invalidation, audit, and rollback.
- [ ] Deny direct unauthorized Admin URLs, cross-customer API/file/order/look access, forged realtime room subscriptions, and actions after staff role/session revocation. View Switcher never grants permissions.
- [ ] Complete keyboard and screen-reader browse → build → cart → checkout → account journeys; test 320 px reflow, 200% zoom, focus visibility, named radio swatches, dialogs, reduced motion, and high-contrast mode against WCAG 2.2 AA.
- [ ] Verify responsive imagery, SSR content, private/public cache separation, canonical/metadata behavior, measured route budgets, and the specified Core Web Vitals targets; configure field monitoring after launch.
- [ ] Reconcile KPI definitions against financial/operational fixtures including refunds, split payments, multiple currencies, immature builder cohorts, and missing consent; never report absent data as measured zero.
- [ ] Run targeted end-to-end scenarios for stale price during checkout, rapid swatch changes, discontinued saved variants, image failure, session expiry, failed save, and offline reconnection. Assertions must inspect backend records and visible customer outcomes.
- [ ] Obtain and validate every production input in the readiness table, verify migrations/backups/restore, configure secrets and monitoring, and supply operational runbooks. No demo-data fallback, unconfigured payment control, or fabricated product promise may pass release.
