# RAZAI GHAR

Luxury bedding storefront, interactive bed customizer, My Sanctuary customer dashboard and Admin CMS, built with Next.js 16.4.2, React 19.3.0, TypeScript, Tailwind CSS v4 and strict Zod commerce contracts.

**Start with the [Complete Feature & Operations Guide](RAZAI_GHAR_COMPLETE_GUIDE.md)** for every route, demo session, shopping/builder workflow, customer feature, Admin procedure, seed promotion and Vercel deployment step.

## Run locally

Use Node 22.x and npm from the repository root:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For port 3100, run `npm run dev -- --port 3100`.

## Verify and preview a production build

```sh
npm run build
npm run lint
npm run test:commerce
npm run start -- --port 3100
```

Run the build and commerce tests sequentially because the test harness also uses `.next`. Stop a server using the current build before rebuilding it.

## Main entry points

- `/` — editorial storefront and recipe discovery.
- `/shop` — filtered catalog and product selection.
- `/create-your-bed` — three-step layered bed customizer.
- `/sign-in` — Guest, Customer and Admin demo sessions.
- `/account` — My Sanctuary orders, looks, wishlist, profile and addresses.
- `/admin` — catalog, inventory, fulfillment, promotions, homepage CMS and reporting.

## Operating boundary

This application uses a **device-only QA Commerce Engine** persisted under `bedding-commerce:qa:v1`. Same-origin tabs synchronize; different browsers, devices, ports and hostnames have separate state. QA roles reset on a full reload while persisted commerce data remains.

No identity provider, ERPNext server, payment processor, carrier API or qualified conversion attribution service is connected. Checkout creates pending QA orders with stock holds; Finance actions simulate capture/refund without transferring money. Product facts and assessments are synthetic fixtures, and the layered stage is a labelled QA illustration. Read the complete guide before using staff actions or planning a commercial integration.

## Handover documents

- [Complete guide](RAZAI_GHAR_COMPLETE_GUIDE.md)
- [Premium Bedding UI UX Master Specification](Premium%20Bedding%20UI%20UX%20Master%20Specification.md)
- [Phase 1 verification](PHASE_1_VERIFICATION.md)
- [Phase 2 verification](PHASE_2_VERIFICATION.md)
- [Phase 3 verification](PHASE_3_VERIFICATION.md)
- [Phase 4 verification](PHASE_4_VERIFICATION.md)

Temporary verification screenshots/logs under `artifacts/`, generated `.next/` output and installed dependencies are intentionally ignored by Git. The complete source, public branding assets, specification, tests, lockfile and Markdown reports are versioned.
