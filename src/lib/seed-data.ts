import type {
  BedSelection,
  BedSlotId,
  CommerceState,
  Fiber,
  Product,
  ProductMedia,
  ProductRole,
  SizeSpec,
  SwatchColor,
  Weave,
} from "@/types/commerce";
import {
  executeCommand,
  money,
  quoteCart,
  quoteSelection,
} from "./commerce-engine";
import { BRAND } from "./brand";

export const FIXTURE_TIME = "2026-10-18T07:00:00.000Z";
export const QA_DISCLOSURE =
  "QA fixture only. Prices, stock, fiber origins, GSM, thread counts and feel assessments are synthetic test data, not supplier-verified commercial claims. Editorial photographs do not depict exact variants. No payments are collected.";

export const SWATCH_COLORS: SwatchColor[] = [
  ["chalk", "Chalk", "#F2EEE6", "White"],
  ["oat", "Oat", "#D9CBB6", "Beige"],
  ["flax", "Flax", "#B7A58A", "Beige"],
  ["sand", "Sand", "#C8B49B", "Tan"],
  ["mushroom", "Mushroom", "#9A8C80", "Taupe"],
  ["clay", "Clay", "#B77B64", "Terracotta"],
  ["rosewater", "Rosewater", "#D9B6AD", "Pink"],
  ["sage", "Sage", "#A2AB94", "Green"],
  ["olive", "Olive", "#737B5C", "Green"],
  ["mist", "Mist", "#A9BABD", "Blue"],
  ["slate", "Slate", "#596A75", "Blue"],
  ["charcoal", "Charcoal", "#3B3B38", "Gray"],
].map(([id, name, hex, family]) => ({
  id,
  name,
  hex: hex as SwatchColor["hex"],
  family: family as SwatchColor["family"],
  screen_disclosure:
    "Screen colors may vary. QA palette; exact product photography requires merchant approval.",
}));

function size(
  id: string,
  label: string,
  role: SizeSpec["product_role"],
  width: number,
  length: number,
  depth?: number,
): SizeSpec {
  return {
    id,
    market: "US",
    label,
    product_role: role,
    width_mm: width * 25.4,
    length_mm: length * 25.4,
    ...(depth === undefined ? {} : { pocket_depth_mm: depth * 25.4 }),
    measurement_tolerance: {
      plus_minus_mm: role === "mattress" ? 0 : 12.7,
      basis: "QA fixture cut dimensions; supplier tolerance unverified",
    },
    display_inches: {
      width,
      length,
      ...(depth === undefined ? {} : { pocket_depth: depth }),
    },
  };
}
const BED_FAMILIES = [
  { id: "twin", label: "Twin", w: 39, l: 75, topW: 68, topL: 86 },
  { id: "queen", label: "Queen", w: 60, l: 80, topW: 90, topL: 92 },
  { id: "king", label: "King", w: 76, l: 80, topW: 106, topL: 92 },
];
export const SIZE_SPECS: SizeSpec[] = [
  ...BED_FAMILIES.flatMap((bed) => [
    size(`us-${bed.id}`, `US ${bed.label}`, "mattress", bed.w, bed.l),
    size(
      `sheet-set-${bed.id}`,
      `US ${bed.label} · fitted component · 16 in pocket`,
      "sheet_set",
      bed.w,
      bed.l,
      16,
    ),
    size(
      `fitted-sheet-${bed.id}`,
      `US ${bed.label} · 16 in pocket`,
      "fitted_sheet",
      bed.w,
      bed.l,
      16,
    ),
    size(
      `duvet-cover-${bed.id}`,
      `US ${bed.label} duvet cover`,
      "duvet_cover",
      bed.topW,
      bed.topL,
    ),
    size(
      `blanket-${bed.id}`,
      `US ${bed.label} bed blanket`,
      "blanket",
      bed.topW,
      bed.topL,
    ),
    size(
      `duvet-insert-${bed.id}`,
      `US ${bed.label} duvet insert`,
      "duvet_insert",
      bed.topW,
      bed.topL,
    ),
  ]),
  size("throw-50-70", "50 × 70 in throw · foot of bed", "throw", 50, 70),
  ...[
    { id: "18", label: "18 × 18 in square", w: 18, l: 18 },
    { id: "20", label: "20 × 20 in square", w: 20, l: 20 },
    { id: "euro", label: "26 × 26 in Euro", w: 26, l: 26 },
    { id: "lumbar", label: "14 × 22 in lumbar", w: 14, l: 22 },
  ].flatMap((c) => [
    size(`cushion-${c.id}`, c.label, "cushion_cover", c.w, c.l),
    size(`pillow-${c.id}`, `${c.label} insert`, "pillow_insert", c.w, c.l),
  ]),
];

export function editorialImage(
  id: string,
  photo: string,
  alt: string,
): ProductMedia {
  return {
    id,
    url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=2400&q=85`,
    alt,
    width: 2400,
    height: 1800,
    kind: "editorial",
    rights_reference:
      "Unsplash editorial QA reference; merchant must approve image rights and product fidelity before commercial publication",
    fidelity: "editorial_reference",
  };
}
const PHOTOS = [
  "photo-1611892440504-42a792e24d32",
  "photo-1616594039964-ae9021a400a0",
  "photo-1584100936595-c0654b55a2e2",
  "photo-1631049307264-da0ec9d70304",
  "photo-1615874959474-d609969a20ed",
  "photo-1616486338812-3dadae4b4ace",
];
interface ProductSeed {
  id: string;
  title: string;
  role: ProductRole;
  fiber: Fiber;
  weave: Weave;
  construction: Product["construction"];
  gsm: number | null;
  tc: number | null;
  price: number;
  colors: string[];
  feel: [number, number, number];
  description: string;
  weight?: number;
}
const CATALOG: ProductSeed[] = [
  {
    id: "atelier-percale",
    title: "Atelier Egyptian Cotton Percale Sheet Set",
    role: "sheet_set",
    fiber: "Egyptian Cotton",
    weave: "Percale",
    construction: "woven",
    gsm: 125,
    tc: 300,
    price: 20000,
    colors: ["chalk", "mist", "sage"],
    feel: [7, 3, 9],
    description:
      "A crisp percale foundation with a matte finish. One stocked set includes a fitted sheet, flat sheet and sleeping pillowcases; no decorative cushions or inserts.",
  },
  {
    id: "heirloom-sateen",
    title: "Heirloom Egyptian Cotton Sateen Sheet Set",
    role: "sheet_set",
    fiber: "Egyptian Cotton",
    weave: "Sateen",
    construction: "woven",
    gsm: 155,
    tc: 400,
    price: 24500,
    colors: ["chalk", "oat", "rosewater"],
    feel: [9, 5, 7],
    description:
      "Smooth sateen with a subtle lustre and generous drape. Fitted component, flat sheet and sleeping pillowcases are sold as one stocked set.",
  },
  {
    id: "rivage-linen",
    title: "Rivage French Linen Sheet Set",
    role: "sheet_set",
    fiber: "French Linen",
    weave: "Plain Weave",
    construction: "woven",
    gsm: 170,
    tc: null,
    price: 31000,
    colors: ["flax", "oat", "sage"],
    feel: [7, 4, 9],
    description:
      "Relaxed plain-weave linen with a softly textured hand. The set includes a fitted sheet, a flat sheet and sleeping pillowcases.",
  },
  {
    id: "essential-fitted",
    title: "Essential Organic Cotton Fitted Sheet",
    role: "fitted_sheet",
    fiber: "Organic Cotton",
    weave: "Percale",
    construction: "woven",
    gsm: 125,
    tc: 300,
    price: 9500,
    colors: ["chalk", "slate"],
    feel: [7, 3, 9],
    description:
      "A fitted-sheet-only option with an elasticated 16 inch pocket. Flat sheet, pillowcases and pillows are excluded.",
  },
  {
    id: "atelier-duvet",
    title: "Atelier Percale Duvet Cover",
    role: "duvet_cover",
    fiber: "Egyptian Cotton",
    weave: "Percale",
    construction: "woven",
    gsm: 125,
    tc: 300,
    price: 15000,
    colors: ["chalk", "mist", "sage"],
    feel: [7, 3, 9],
    description:
      "A crisp duvet cover with concealed fastening and internal corner ties. Duvet insert is a separately priced SKU.",
  },
  {
    id: "rivage-duvet",
    title: "Rivage French Linen Duvet Cover",
    role: "duvet_cover",
    fiber: "French Linen",
    weave: "Plain Weave",
    construction: "woven",
    gsm: 175,
    tc: null,
    price: 22500,
    colors: ["oat", "clay", "flax"],
    feel: [7, 4, 9],
    description:
      "An airy linen duvet cover with a lived-in texture and internal ties. Excludes duvet insert and pillowcases.",
  },
  {
    id: "heirloom-duvet",
    title: "Heirloom Sateen Duvet Cover",
    role: "duvet_cover",
    fiber: "Egyptian Cotton",
    weave: "Sateen",
    construction: "woven",
    gsm: 155,
    tc: 400,
    price: 19500,
    colors: ["chalk", "mushroom"],
    feel: [9, 5, 7],
    description:
      "Fluid cotton sateen for a softly reflective top layer. One cover only; purchase a compatible insert separately.",
  },
  {
    id: "alpine-knit",
    title: "Alpine Merino Chunky Knit Blanket",
    role: "blanket",
    fiber: "Merino Wool",
    weave: "Chunky Knit",
    construction: "knitted",
    gsm: 650,
    tc: null,
    price: 28500,
    colors: ["oat", "charcoal"],
    feel: [8, 9, 5],
    description:
      "A full-bed merino blanket with an open chunky stitch and substantial drape. Do not pull individual loops.",
  },
  {
    id: "cloud-sherpa",
    title: "Cloud Recycled Sherpa Fleece Blanket",
    role: "blanket",
    fiber: "Recycled Polyester",
    weave: "Sherpa Fleece",
    construction: "fleece",
    gsm: 380,
    tc: null,
    price: 14500,
    colors: ["chalk", "sand"],
    feel: [9, 9, 3],
    description:
      "A lofty fleece bed blanket with a tactile sherpa face. A separate layer, without a removable insert.",
  },
  {
    id: "honeycomb-waffle",
    title: "Honeycomb Cotton Waffle Blanket",
    role: "blanket",
    fiber: "Cotton",
    weave: "Waffle",
    construction: "woven",
    gsm: 320,
    tc: null,
    price: 16500,
    colors: ["chalk", "sage", "olive"],
    feel: [7, 5, 8],
    description:
      "Dimensional waffle weave for a breathable bed-covering layer. Supplied dimensions are after the fixture wash allowance.",
  },
  {
    id: "grounded-weighted",
    title: "Grounded Cotton Weighted Blanket",
    role: "blanket",
    fiber: "Cotton",
    weave: "Plain Weave",
    construction: "weighted",
    gsm: 210,
    tc: null,
    price: 23000,
    colors: ["slate"],
    feel: [7, 8, 4],
    weight: 6.8,
    description:
      "A compartmented cotton blanket with glass-bead fill and a total weight of 6.8 kg. Fabric GSM describes its shell, not total blanket mass. No therapeutic claims.",
  },
  {
    id: "highland-throw",
    title: "Highland Cashmere Throw",
    role: "throw",
    fiber: "Cashmere",
    weave: "Twill",
    construction: "woven",
    gsm: 240,
    tc: null,
    price: 19500,
    colors: ["sand", "mushroom", "clay"],
    feel: [10, 7, 7],
    description:
      "A brushed cashmere throw for the foot of the bed. Its 50 × 70 inch dimensions do not cover a Queen or King mattress.",
  },
  {
    id: "rivage-cushion",
    title: "Rivage Linen Cushion Cover",
    role: "cushion_cover",
    fiber: "French Linen",
    weave: "Plain Weave",
    construction: "woven",
    gsm: 210,
    tc: null,
    price: 5000,
    colors: ["chalk", "clay", "sage", "olive"],
    feel: [7, 4, 8],
    description:
      "A tailored linen decorative cover in 18 inch square, 20 inch square, 26 inch Euro and 14 × 22 inch lumbar. Each is a separate SKU; inserts excluded.",
  },
  {
    id: "velour-cushion",
    title: "Dune Cotton Textured Cushion Cover",
    role: "cushion_cover",
    fiber: "Cotton",
    weave: "Twill",
    construction: "woven",
    gsm: 340,
    tc: null,
    price: 6500,
    colors: ["rosewater", "slate", "mushroom"],
    feel: [9, 6, 5],
    description:
      "A densely textured cotton cover with concealed zip. Choose actual square, Euro or lumbar dimensions; insert sold separately.",
  },
  {
    id: "down-pillow",
    title: "European Down & Feather Cushion Insert",
    role: "pillow_insert",
    fiber: "European Down",
    weave: "Plain Weave",
    construction: "quilted",
    gsm: 120,
    tc: 233,
    price: 3500,
    colors: ["chalk"],
    feel: [9, 7, 6],
    description:
      "A cotton-shell decorative cushion insert filled with 20% down and 80% feather. Available in matched square, Euro and lumbar dimensions.",
  },
  {
    id: "allseason-duvet",
    title: "All Season European Down Duvet Insert",
    role: "duvet_insert",
    fiber: "European Down",
    weave: "Plain Weave",
    construction: "quilted",
    gsm: 120,
    tc: 300,
    price: 25000,
    colors: ["chalk"],
    feel: [9, 7, 7],
    description:
      "A baffled duvet insert with a cotton shell and 80% down / 20% feather filling. Shell GSM and thread count do not describe fill weight or warmth certification.",
  },
];

export function emptyBedSelection(bedSizeId = "us-queen"): BedSelection {
  const slotIds: BedSlotId[] = [
    "foundation",
    "main_top",
    "throw",
    "cushion_1",
    "cushion_2",
    "cushion_3",
    "cushion_4",
    "cushion_5",
  ];
  return {
    schema_version: 1,
    market: "US",
    locale: "en-US",
    bed_size_id: bedSizeId,
    selection_revision: 0,
    insert_links: [],
    slots: slotIds.map((slot_id, i) => ({
      slot_id,
      variant_id: null,
      quantity: 1,
      state: "skipped",
      position: {
        x: i < 3 ? 0.5 : 0.18 + (i - 3) * 0.16,
        y: i < 3 ? 0.65 : 0.3,
        z: i < 3 ? i * 10 + 10 : 60 + i - 3,
      },
    })),
  };
}
export function createSeedState(seedTime = FIXTURE_TIME): CommerceState {
  const state: CommerceState = {
    schema_version: 1,
    mode: "qa_fixture",
    revision: 0,
    updated_at: FIXTURE_TIME,
    products: [],
    variants: [],
    product_drafts: [],
    sizes: structuredClone(SIZE_SPECS),
    colors: structuredClone(SWATCH_COLORS),
    inventory: [],
    markets: [
      {
        id: "US",
        country: "US",
        currency: "USD",
        precision: 2,
        shipping_method_id: "qa-ground",
        shipping_label: "QA ground shipping",
        shipping_minor: 1500,
        free_shipping_threshold_minor: 35000,
        tax_basis_points: 0,
        tax_shipping: false,
        tax_rounding: "half_up_order",
        disclosure:
          "QA policy: US only, $15 shipping below $350 discounted eligible merchandise, zero fixture tax. Not an actual US tax determination.",
      },
    ],
    bundle_policy: {
      schema_version: 1,
      id: "bed-layers",
      version: 1,
      enabled: true,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: null,
      eligible_groups: ["foundation", "top", "cushions"],
      excluded_variant_ids: [],
      tiers: [
        { group_count: 1, basis_points: 0 },
        { group_count: 2, basis_points: 500 },
        { group_count: 3, basis_points: 1000 },
      ],
      maximum_discount: null,
      limits: {
        foundation: 1,
        main_top: 1,
        throw: 1,
        cushions: 5,
        insert_per_cover: 1,
      },
      sale_item_treatment: "exclude",
      stacking: "none",
      refund_policy_reference:
        "QA: refunds retain original line allocations; no retroactive bundle clawback",
    },
    bundle_policy_draft: null,
    promos: [],
    promo_drafts: [],
    hero_banners: [],
    hero_banner_drafts: [],
    hero_history: [],
    recipes: [],
    profile: {
      schema_version: 1,
      id: "customer-qa",
      revision: 1,
      display_name: "Avery Morgan (QA)",
      email: "avery@example.test",
      phone: null,
      locale: "en-US",
      preferred_units: "imperial",
      communication_preferences: {
        email_marketing: false,
        sms_marketing: false,
        consent_updated_at: FIXTURE_TIME,
      },
      updated_at: FIXTURE_TIME,
    },
    addresses: [
      {
        schema_version: 1,
        id: "address-qa-home",
        owner_id: "customer-qa",
        revision: 1,
        recipient: "Avery Morgan (QA)",
        line1: "100 Example Avenue",
        line2: "QA fixture address — do not ship",
        city: "New York",
        region: "NY",
        postal_code: "10001",
        country: "US",
        phone: null,
        label: "QA home",
        default_shipping: true,
        default_billing: true,
        updated_at: FIXTURE_TIME,
      },
    ],
    bed_preferences: [
      {
        schema_version: 1,
        id: "bed-qa-primary",
        owner_id: "customer-qa",
        revision: 1,
        name: "Primary bedroom",
        market: "US",
        bed_size_id: "us-queen",
        mattress_width_mm: 1524,
        mattress_length_mm: 2032,
        mattress_depth_mm: 304.8,
        preferred_units: "imperial",
        preferred_feel: "light",
        preferred_fibers: ["French Linen", "Egyptian Cotton"],
        preferred_color_families: ["White", "Green"],
        is_default: true,
        updated_at: FIXTURE_TIME,
      },
    ],
    cart: {
      schema_version: 1,
      id: "cart-qa",
      owner_id: "customer-qa",
      revision: 0,
      market: "US",
      currency: "USD",
      bundles: [],
      lines: [],
      promo_code: null,
      destination: null,
      latest_quote_id: null,
      updated_at: FIXTURE_TIME,
    },
    builder_selection: emptyBedSelection(),
    wishlist: [],
    saved_looks: [],
    orders: [],
    undo_records: [],
    audit: [],
    command_receipts: [],
  };
  CATALOG.forEach((item, index) => {
    const role = item.role;
    const category: Product["category"] =
      role === "sheet_set" || role === "fitted_sheet"
        ? "Sheets"
        : role === "duvet_cover"
          ? "Duvet Covers"
          : role === "blanket" || role === "throw"
            ? "Blankets & Throws"
            : role === "cushion_cover"
              ? "Cushions"
              : "Inserts";
    const fibers: Product["fibers"] =
      role === "pillow_insert" || role === "duvet_insert"
        ? [
            {
              fiber: "European Down",
              percentage: role === "pillow_insert" ? 20 : 80,
              origin: "Europe (QA only)",
              evidence_reference: `QA-FILL-${item.id}`,
            },
            {
              fiber: "Feather",
              percentage: role === "pillow_insert" ? 80 : 20,
              evidence_reference: `QA-FILL-${item.id}`,
            },
          ]
        : [
            {
              fiber: item.fiber,
              percentage: 100,
              origin:
                item.fiber === "French Linen"
                  ? "France (QA only)"
                  : item.fiber === "Egyptian Cotton"
                    ? "Egypt (QA only)"
                    : "Unverified QA origin",
              evidence_reference: `QA-FIBER-${item.id}`,
            },
          ];
    const delicate = ["Merino Wool", "Cashmere", "European Down"].includes(
      item.fiber,
    );
    const product: Product = {
      schema_version: 1,
      id: item.id,
      revision: 1,
      slug: item.id,
      title: item.title,
      description: item.description,
      category,
      product_role: role,
      status: "published",
      fibers,
      weave: item.weave,
      construction: item.construction,
      gsm: item.gsm,
      thread_count: item.tc
        ? { value: item.tc, basis: "threads_per_square_inch" }
        : null,
      total_weight_kg: item.weight ?? null,
      facts_evidence: {
        reference: `QA-TECH-SHEET-${item.id}`,
        verification: "qa_fixture_only",
        disclosure: QA_DISCLOSURE,
      },
      feel: {
        softness: item.feel[0],
        warmth: item.feel[1],
        breathability: item.feel[2],
        notes: {
          softness:
            item.feel[0] >= 8
              ? "Supple comparative hand in this QA scenario."
              : "Structured, textured comparative hand in this QA scenario.",
          warmth:
            item.feel[1] >= 7
              ? "Insulating comparative layer in this QA scenario."
              : "Light to moderate comparative insulation in this QA scenario.",
          breathability:
            item.feel[2] >= 7
              ? "Higher comparative airflow in this QA scenario."
              : "Lower comparative airflow in this QA scenario.",
        },
        method:
          "Synthetic merchandising assessment against fixture benchmark samples; no laboratory test",
        rubric:
          "1–3 structured/light/less airflow; 4–6 balanced; 7–10 supple/insulating/more airflow. Axes assessed independently.",
        assessed_at: FIXTURE_TIME,
        evidence_reference: `QA-FEEL-${item.id}`,
        disclosure:
          "Relative feel guide. QA assessment only; no clinical or supplier verification.",
      },
      contents:
        role === "sheet_set"
          ? [
              {
                name: "Fitted sheet",
                quantity: 1,
                note: "Selected mattress dimensions; 16 in pocket",
              },
              {
                name: "Flat sheet",
                quantity: 1,
                note: "Twin 66 × 96 in; Queen 90 × 102 in; King 108 × 102 in",
              },
              {
                name: "Sleeping pillowcase",
                quantity: 2,
                note: "Twin/Queen 20 × 30 in; King 20 × 40 in. Twin fixture set also includes two; no inserts.",
              },
            ]
          : [
              {
                name: role.replaceAll("_", " "),
                quantity: 1,
                note: role.endsWith("cover")
                  ? "Cover only; insert excluded"
                  : "One sale unit at selected dimensions",
              },
            ],
      insert_included: false,
      care: {
        wash_celsius: delicate ? null : 30,
        drying: delicate
          ? "Professional specialist cleaning; dry flat only when supplier label permits"
          : "Low tumble dry; remove promptly",
        bleaching: "Do not bleach",
        ironing:
          delicate || item.construction === "fleece"
            ? "Do not iron"
            : "Warm iron when needed",
        limitations: item.weight
          ? "6.8 kg total weight. Do not use for infants or anyone unable to remove it independently; obtain actual supplier usage guidance before sale. Spot clean only in this QA scenario."
          : "QA care instructions; actual sewn care label must be approved before commercial sale.",
      },
      media: [
        editorialImage(
          `${item.id}-editorial`,
          PHOTOS[index % PHOTOS.length],
          `Editorial bedroom inspiration for ${item.title}; not exact variant photography`,
        ),
      ],
      related_product_ids: ["rivage-cushion", "allseason-duvet"].filter(
        (id) => id !== item.id,
      ),
      featured_rank: index + 1,
      data_source: "qa_fixture",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: FIXTURE_TIME,
    };
    state.products.push(product);
    const applicableSizes = state.sizes.filter((s) => s.product_role === role);
    item.colors.forEach((color) =>
      applicableSizes.forEach((s, sizeIndex) => {
        const id = `${item.id}-${color}-${s.id}`;
        const price = money(
          item.price +
            (s.id.includes("king")
              ? 4000
              : s.id.includes("twin")
                ? -3000
                : role === "cushion_cover" || role === "pillow_insert"
                  ? sizeIndex * 500
                  : 0),
          "USD",
        );
        state.variants.push({
          schema_version: 1,
          id,
          revision: 1,
          product_id: item.id,
          sku: id.toUpperCase(),
          color_id: color,
          size_id: s.id,
          fibers: structuredClone(fibers),
          weave: item.weave,
          active: true,
          sale_uom: role === "sheet_set" ? "set" : "each",
          price,
          sale:
            item.id === "cloud-sherpa" && color === "sand"
              ? {
                  price: money(price.amount_minor - 2000, "USD"),
                  reference_price: price,
                  starts_at: "2026-01-01T00:00:00.000Z",
                  ends_at: "2099-12-31T23:59:59.000Z",
                }
              : null,
          bundle_eligible: !["pillow_insert", "duvet_insert"].includes(role),
          shipping_eligible: true,
          compatible_bed_size_ids:
            role === "throw" ||
            role === "cushion_cover" ||
            role === "pillow_insert"
              ? BED_FAMILIES.map((b) => `us-${b.id}`)
              : BED_FAMILIES.filter((b) => s.id.endsWith(b.id)).map(
                  (b) => `us-${b.id}`,
                ),
          compatible_insert_variant_ids: [],
          availability: {
            warehouse_id: "qa-warehouse",
            inventory_id: `inventory-${id}`,
            policy: "finite",
          },
          media_ids: product.media.map((m) => m.id),
        });
        state.inventory.push({
          id: `inventory-${id}`,
          variant_id: id,
          warehouse_id: "qa-warehouse",
          revision: 1,
          on_hand: index === 13 ? 3 : 18 + (index % 5) * 4,
          reserved: 0,
          reorder_threshold: 4,
        });
      }),
    );
  });
  state.variants.forEach((v) => {
    const role = state.products.find(
      (p) => p.id === v.product_id,
    )!.product_role;
    if (role === "duvet_cover" || role === "cushion_cover") {
      const coverSize = state.sizes.find((s) => s.id === v.size_id)!;
      v.compatible_insert_variant_ids = state.variants
        .filter((insert) => {
          const insertRole = state.products.find(
            (p) => p.id === insert.product_id,
          )!.product_role;
          const insertSize = state.sizes.find((s) => s.id === insert.size_id)!;
          return (
            insertRole ===
              (role === "duvet_cover" ? "duvet_insert" : "pillow_insert") &&
            insertSize.width_mm === coverSize.width_mm &&
            insertSize.length_mm === coverSize.length_mm
          );
        })
        .map((insert) => insert.id);
    }
  });
  const recipes = [
    {
      id: "quiet-morning",
      name: "Quiet morning",
      description:
        "Chalk percale, an airy duvet cover and one sage square. Three eligible groups; inserts selected separately.",
      foundation: "atelier-percale-chalk-sheet-set-queen",
      top: "atelier-duvet-chalk-duvet-cover-queen",
      cushion: "rivage-cushion-sage-cushion-18",
    },
    {
      id: "linen-retreat",
      name: "Linen retreat",
      description:
        "Tonal oat linen with a clay lumbar accent and an optional cashmere throw.",
      foundation: "rivage-linen-oat-sheet-set-queen",
      top: "rivage-duvet-oat-duvet-cover-queen",
      cushion: "rivage-cushion-clay-cushion-lumbar",
    },
    {
      id: "winter-layering",
      name: "Winter layering",
      description:
        "Smooth sateen, a chunky merino bed blanket and a textured mushroom Euro cover.",
      foundation: "heirloom-sateen-chalk-sheet-set-queen",
      top: "alpine-knit-oat-blanket-queen",
      cushion: "velour-cushion-mushroom-cushion-euro",
    },
  ];
  state.recipes = recipes.map((r, i) => {
    const selection = emptyBedSelection();
    selection.slots.forEach((slot) => {
      const variant =
        slot.slot_id === "foundation"
          ? r.foundation
          : slot.slot_id === "main_top"
            ? r.top
            : slot.slot_id === "cushion_1"
              ? r.cushion
              : null;
      if (variant) {
        slot.variant_id = variant;
        slot.state = "selected";
      }
    });
    selection.selection_revision = 1;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      image: editorialImage(
        `recipe-${r.id}`,
        PHOTOS[i],
        `Editorial inspiration for ${r.name}; selected items are listed separately`,
      ),
      selection,
      data_source: "qa_fixture" as const,
    };
  });
  state.saved_looks = state.recipes.map((r, i) => ({
    schema_version: 1,
    id: `look-qa-${i + 1}`,
    owner_id: state.profile.id,
    name: r.name,
    selection: structuredClone(r.selection),
    source_labels: Object.fromEntries(
      r.selection.slots
        .filter((s) => s.variant_id)
        .map((s) => [
          s.slot_id,
          state.products.find(
            (p) =>
              p.id ===
              state.variants.find((v) => v.id === s.variant_id)!.product_id,
          )!.title,
        ]),
    ),
    revision: 1,
    thumbnail: { status: "item_collage", urls: [r.image.url] },
    deleted_at: null,
    purge_after: null,
    created_at: FIXTURE_TIME,
    updated_at: FIXTURE_TIME,
  }));
  state.wishlist = ["rivage-linen", "highland-throw", "velour-cushion"].map(
    (product_id, i) => ({
      id: `wish-qa-${i}`,
      owner_id: state.profile.id,
      product_id,
      variant_id:
        i === 0
          ? null
          : state.variants.find((v) => v.product_id === product_id)!.id,
      created_at: FIXTURE_TIME,
    }),
  );
  state.promos = [
    {
      id: "promo-qa-welcome",
      code: "REST8",
      name: "QA welcome 8%",
      benefit: { type: "percent", basis_points: 800 },
    },
    {
      id: "promo-qa-fixed",
      code: "LINEN30",
      name: "QA linen $30",
      benefit: { type: "fixed", amount: money(3000, "USD") },
    },
    {
      id: "promo-qa-ship",
      code: "SHIPQUIET",
      name: "QA ground shipping",
      benefit: { type: "shipping", amount: null },
    },
  ].map((p) => ({
    ...p,
    schema_version: 1,
    revision: 1,
    version: 1,
    status: "published",
    enabled: true,
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2099-12-31T23:59:59.000Z",
    timezone: "UTC",
    eligible_categories: [],
    excluded_variant_ids: [],
    minimum_subtotal: money(10000, "USD"),
    maximum_discount: null,
    global_usage_limit: 1000,
    per_customer_usage_limit: 5,
    stacking: "none",
    include_sale_items: false,
    markets: ["US"],
    channels: ["web"],
    updated_at: FIXTURE_TIME,
  })) as CommerceState["promos"];
  state.hero_banners = [
    {
      schema_version: 1,
      id: "home-hero",
      revision: 1,
      internal_name: `${BRAND.name} QA launch`,
      page: "/",
      placement: "hero",
      headline: "Build a bed that feels like you.",
      supporting_copy:
        "Choose your fabrics, layer your textures, and see your bed come together.",
      primary_cta: { label: "Create your own bed", href: "/create-your-bed" },
      secondary_cta: { label: "Shop bedding", href: "/shop" },
      desktop_media: editorialImage(
        "hero-desktop",
        PHOTOS[0],
        "A softly lit bedroom with layered neutral bedding; QA editorial inspiration",
      ),
      mobile_media: editorialImage(
        "hero-mobile",
        PHOTOS[1],
        "A calm bedroom in warm neutral tones; QA editorial inspiration",
      ),
      decorative: false,
      focal_points: {
        desktop: { x: 0.5, y: 0.55 },
        mobile: { x: 0.55, y: 0.5 },
      },
      announcement_text: null,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: null,
      locale: "en-US",
      priority: 10,
      status: "published",
      author_id: "qa-administrator",
      published_at: FIXTURE_TIME,
      updated_at: FIXTURE_TIME,
    },
  ];
  state.hero_banners.push({
    ...structuredClone(state.hero_banners[0]),
    id: "home-announcement",
    internal_name: `${BRAND.name} QA announcement`,
    placement: "announcement",
    headline: "",
    supporting_copy: "",
    desktop_media: null,
    mobile_media: null,
    primary_cta: { label: "Explore the fabric guide", href: "/guides/fabrics" },
    secondary_cta: null,
    announcement_text: "Good days begin with thoughtful layers.",
    priority: 20,
  });
  return seedOrders(state, seedTime);
}

function seedOrders(initial: CommerceState, seedTime: string): CommerceState {
  let state = initial;
  for (let index = 0; index < 5; index++) {
    const at = new Date(Date.parse(seedTime) - index * 86400000).toISOString();
    let sequence = 0;
    const runtime = {
      now: at,
      actor_id: state.profile.id,
      role: "administrator" as const,
      newId: () => `qa-${index}-${++sequence}`,
    };
    const apply = (command: Parameters<typeof executeCommand>[1]) => {
      const result = executeCommand(
        state,
        command,
        { idempotency_key: `seed-${index}-${sequence}-${command.type}` },
        runtime,
      );
      state = result.state;
      return result.result;
    };
    state.cart = {
      ...state.cart,
      id: `cart-seed-${index}`,
      revision: 0,
      lines: [],
      bundles: [],
      promo_code: null,
      destination: {
        country: "US",
        region: "NY",
        shipping_method_id: "qa-ground",
      },
    };
    if (index >= 1 && index <= 3) {
      const recipe = state.recipes[index - 1];
      apply({
        type: "cart.add_bundle",
        selection: recipe.selection,
        quote: quoteSelection(state, recipe.selection, {
          now: at,
          quote_id: `seed-bed-quote-${index}`,
        }),
        name: recipe.name,
        expected_cart_revision: state.cart.revision,
      });
    } else {
      apply({
        type: "cart.add_item",
        variant_id:
          index === 0
            ? "atelier-percale-chalk-sheet-set-queen"
            : "honeycomb-waffle-olive-blanket-queen",
        quantity: 1,
      });
      if (index === 4)
        apply({
          type: "cart.add_item",
          variant_id: "highland-throw-sand-throw-50-70",
          quantity: 1,
        });
    }
    const quote = quoteCart(state, state.cart, {
      now: at,
      quote_id: `seed-quote-${index}`,
    });
    const created = apply({
      type: "checkout.create",
      quote,
      address_id: state.addresses[0].id,
      expected_cart_revision: state.cart.revision,
    });
    const orderId = created.id!;
    const transition = (
      value: Parameters<typeof executeCommand>[1] & {
        type: "order.transition";
      },
    ) => apply(value);
    const advance = (value: import("@/types/commerce").OrderTransition) =>
      transition({
        type: "order.transition",
        order_id: orderId,
        expected_order_revision: state.orders.find((o) => o.id === orderId)!
          .revision,
        transition: value,
      });
    if (index >= 1) {
      advance({
        action: "fixture_capture",
        evidence: "QA payment fixture; no provider transaction or real funds",
      });
      advance({
        action: "process",
        warehouse_id: "qa-warehouse",
        reason: "QA warehouse acceptance",
      });
    }
    if (index >= 2)
      advance({
        action: "start_qc",
        inspection_reference: `QA-QC-${index}`,
        operator: "QA inspector",
        checklist: [
          "SKU and dimensions checked",
          "Seams and fastening checked",
          "Package contents checked",
        ],
      });
    if (index >= 3) {
      advance({ action: "qc_pass", reason: "QA inspection passed" });
      const order = state.orders.find((o) => o.id === orderId)!;
      advance({
        action: "ship",
        shipment_id: `QA-SHIP-${index}`,
        carrier: "QA carrier",
        service: "QA ground",
        tracking_reference: `QA-TRACK-${index}`,
        dispatch_evidence: "QA warehouse handoff record",
        delivery_note_reference: `QA-DN-${index}`,
        lines: order.lines.map((l) => ({
          line_id: l.line_id,
          quantity: l.quantity,
        })),
      });
    }
    if (index >= 4)
      advance({
        action: "deliver",
        shipment_id: `QA-SHIP-${index}`,
        evidence: "QA delivery scan; no actual shipment",
      });
  }
  state.cart = {
    ...initial.cart,
    id: "cart-qa",
    revision: 0,
    lines: [],
    bundles: [],
    promo_code: null,
    destination: null,
    latest_quote_id: null,
    updated_at: seedTime,
  };
  state.updated_at = seedTime;
  return state;
}
