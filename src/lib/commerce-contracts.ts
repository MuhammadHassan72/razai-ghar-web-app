import { z } from "zod";
import type {
  BedSelection,
  BundlePolicy,
  Cart,
  CatalogDraft,
  CommerceCommand,
  CommerceQuote,
  CommerceState,
  CustomerAddress,
  CustomerProfile,
  BedPreference,
  HeroBannerConfig,
  Money,
  OrderProjection,
  Product,
  PromoCode,
  SellableVariant,
  SizeSpec,
  SwatchColor,
} from "@/types/commerce";

const id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
const text = z
  .string()
  .min(1)
  .max(2000)
  .refine(
    (v) => v.trim().length > 0 && !/[<>\u0000-\u0008]/.test(v),
    "Plain text is required",
  );
const short = text.max(160);
const optionalText = z
  .string()
  .max(500)
  .refine((v) => !/[<>\u0000-\u0008]/.test(v), "Plain text is required");
const uint = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const revision = uint;
const qty = z.number().int().min(1).max(99);
const timestamp = z.iso.datetime();
const version = z.literal(1);
const status = z.enum(["draft", "published", "archived"]);
const role = z.enum([
  "sheet_set",
  "fitted_sheet",
  "duvet_cover",
  "blanket",
  "throw",
  "cushion_cover",
  "pillow_insert",
  "duvet_insert",
]);
const category = z.enum([
  "Sheets",
  "Duvet Covers",
  "Blankets & Throws",
  "Cushions",
  "Inserts",
]);
const fiber = z.enum([
  "Egyptian Cotton",
  "French Linen",
  "Organic Cotton",
  "Cotton",
  "Merino Wool",
  "Cashmere",
  "Recycled Polyester",
  "European Down",
  "Feather",
]);
const weave = z.enum([
  "Percale",
  "Sateen",
  "Chunky Knit",
  "Sherpa Fleece",
  "Waffle",
  "Plain Weave",
  "Twill",
]);
const family = z.enum([
  "White",
  "Beige",
  "Tan",
  "Taupe",
  "Terracotta",
  "Pink",
  "Green",
  "Blue",
  "Gray",
]);
const fibers = z
  .array(
    z.strictObject({
      fiber,
      percentage: z.number().min(0.01).max(100),
      origin: short.optional(),
      evidence_reference: short,
    }),
  )
  .min(1)
  .max(8)
  .refine(
    (v) =>
      Math.abs(v.reduce((sum, f) => sum + f.percentage, 0) - 100) < 0.00001,
    "Fiber percentages must total 100",
  );
const group = z.enum(["foundation", "top", "cushions"]);
const slotId = z.enum([
  "foundation",
  "main_top",
  "throw",
  "cushion_1",
  "cushion_2",
  "cushion_3",
  "cushion_4",
  "cushion_5",
]);
export const CURRENCY_PRECISION: Readonly<Record<string, number>> =
  Object.freeze({
    USD: 2,
    EUR: 2,
    GBP: 2,
    PKR: 2,
    CAD: 2,
    AUD: 2,
    JPY: 0,
    KWD: 3,
  });
export const moneySchema = z
  .strictObject({
    amount_minor: uint,
    currency: z.string().regex(/^[A-Z]{3}$/),
    precision: z.number().int().min(0).max(3),
  })
  .refine(
    (v) => CURRENCY_PRECISION[v.currency] === v.precision,
    "Unsupported currency or precision",
  ) satisfies z.ZodType<Money>;
export const sizeSchema = z
  .strictObject({
    id,
    market: id,
    label: short,
    width_mm: z.number().positive().max(10000),
    length_mm: z.number().positive().max(10000),
    pocket_depth_mm: z.number().positive().max(1000).optional(),
    measurement_tolerance: z.strictObject({
      plus_minus_mm: z.number().nonnegative().max(100),
      basis: short,
    }),
    product_role: z.union([role, z.literal("mattress")]),
    display_inches: z.strictObject({
      width: z.number().positive(),
      length: z.number().positive(),
      pocket_depth: z.number().positive().optional(),
    }),
  })
  .refine(
    (v) =>
      Math.abs(v.display_inches.width * 25.4 - v.width_mm) < 0.001 &&
      Math.abs(v.display_inches.length * 25.4 - v.length_mm) < 0.001 &&
      (v.pocket_depth_mm === undefined
        ? v.display_inches.pocket_depth === undefined
        : v.display_inches.pocket_depth !== undefined &&
          Math.abs(v.display_inches.pocket_depth * 25.4 - v.pocket_depth_mm) <
            0.001),
    "Inches must agree with canonical millimetres",
  ) satisfies z.ZodType<SizeSpec>;
export const colorSchema = z.strictObject({
  id,
  name: short.min(2).max(40),
  hex: z
    .string()
    .regex(/^#[A-Fa-f0-9]{6}$/)
    .transform((v) => v as SwatchColor["hex"]),
  family,
  screen_disclosure: text,
}) satisfies z.ZodType<SwatchColor>;
const media = z.strictObject({
  id,
  url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "images.unsplash.com" &&
      !url.username &&
      !url.password &&
      !url.port
    );
  }, "Only approved Unsplash HTTPS media is supported"),
  alt: optionalText,
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  kind: z.enum(["editorial", "product", "texture"]),
  rights_reference: text,
  fidelity: z.enum(["editorial_reference", "approved_variant"]),
});
const contents = z
  .array(z.strictObject({ name: short, quantity: qty, note: text }))
  .min(1)
  .max(20);
const feelScore = z.number().int().min(1).max(10).nullable();
export const productSchema = z
  .strictObject({
    schema_version: version,
    id,
    revision,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    title: short,
    description: text,
    category,
    product_role: role,
    status,
    fibers,
    weave,
    construction: z.enum(["woven", "knitted", "fleece", "quilted", "weighted"]),
    gsm: z.number().positive().max(5000).nullable(),
    thread_count: z
      .strictObject({
        value: z.number().int().min(50).max(1500),
        basis: z.literal("threads_per_square_inch"),
      })
      .nullable(),
    total_weight_kg: z.number().positive().max(30).nullable(),
    facts_evidence: z.strictObject({
      reference: short,
      verification: z.literal("qa_fixture_only"),
      disclosure: text,
    }),
    feel: z.strictObject({
      softness: feelScore,
      warmth: feelScore,
      breathability: feelScore,
      notes: z.strictObject({
        softness: text,
        warmth: text,
        breathability: text,
      }),
      method: text,
      rubric: text,
      assessed_at: timestamp,
      evidence_reference: short,
      disclosure: text,
    }),
    contents,
    insert_included: z.boolean(),
    care: z.strictObject({
      wash_celsius: z.number().int().min(0).max(95).nullable(),
      drying: text,
      bleaching: text,
      ironing: text,
      limitations: text,
    }),
    media: z.array(media).min(1).max(20),
    related_product_ids: z.array(id).max(20),
    featured_rank: uint,
    seo: z
      .strictObject({ title: text.max(70), description: text.max(180) })
      .optional(),
    data_source: z.literal("qa_fixture"),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .refine(
    (v) =>
      !["knitted", "fleece", "weighted"].includes(v.construction) ||
      v.thread_count === null,
    "Thread count is not meaningful for this construction",
  )
  .refine(
    (v) => v.construction !== "weighted" || v.total_weight_kg !== null,
    "Weighted blankets need total mass",
  ) satisfies z.ZodType<Product>;
export const variantSchema = z.strictObject({
  schema_version: version,
  id,
  revision,
  product_id: id,
  sku: short,
  color_id: id,
  size_id: id,
  fibers,
  weave,
  active: z.boolean(),
  sale_uom: z.enum(["set", "each"]),
  price: moneySchema,
  sale: z
    .strictObject({
      price: moneySchema,
      reference_price: moneySchema,
      starts_at: timestamp,
      ends_at: timestamp,
    })
    .nullable(),
  bundle_eligible: z.boolean(),
  shipping_eligible: z.boolean(),
  compatible_bed_size_ids: z.array(id).min(1).max(30),
  compatible_insert_variant_ids: z.array(id).max(30),
  availability: z.strictObject({
    warehouse_id: id,
    inventory_id: id,
    policy: z.literal("finite"),
  }),
  media_ids: z.array(id).min(1).max(20),
}) satisfies z.ZodType<SellableVariant>;
export const catalogDraftSchema = z.strictObject({
  product: productSchema,
  variants: z.array(variantSchema).min(1).max(500),
}) satisfies z.ZodType<CatalogDraft>;
export const selectionSchema = z.strictObject({
  schema_version: version,
  market: id,
  locale: short,
  bed_size_id: id,
  fit_confirmed: z.boolean().optional(),
  step_intent: z
    .strictObject({
      foundation: z.enum(["open", "configured", "skipped"]),
      top: z.enum(["open", "configured", "skipped"]),
      cushions: z.enum(["open", "configured", "skipped"]),
    })
    .optional(),
  slots: z
    .array(
      z.strictObject({
        slot_id: slotId,
        variant_id: id.nullable(),
        quantity: z.literal(1),
        position: z.strictObject({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          z: uint.max(100),
        }),
        state: z.enum(["selected", "skipped", "unresolved"]),
        source_label: short.optional(),
        pending_options: z
          .strictObject({
            product_id: id,
            color_id: id.nullable(),
            size_id: id.nullable(),
          })
          .optional(),
      }),
    )
    .max(8),
  insert_links: z
    .array(
      z.strictObject({
        slot_id: slotId,
        variant_id: id,
        quantity: z.literal(1),
      }),
    )
    .max(6),
  selection_revision: revision,
}) satisfies z.ZodType<BedSelection>;
const destination = z.strictObject({
  country: z.string().regex(/^[A-Z]{2}$/),
  region: optionalText,
  shipping_method_id: id,
});
const cartLine = z.strictObject({
  id,
  variant_id: id,
  quantity: qty,
  bundle_instance_id: id.nullable(),
  slot_ids: z.array(slotId).max(5),
  insert_for_line_id: id.nullable(),
});
export const cartSchema = z.strictObject({
  schema_version: version,
  id,
  owner_id: id,
  revision,
  market: id,
  currency: z.string().length(3),
  bundles: z
    .array(
      z.strictObject({
        id,
        name: text.max(60),
        selection: selectionSchema,
        complete_bed: z.boolean(),
      }),
    )
    .max(20),
  lines: z.array(cartLine).max(100),
  promo_code: short.nullable(),
  destination: destination.nullable(),
  latest_quote_id: id.nullable(),
  updated_at: timestamp,
}) satisfies z.ZodType<Cart>;
const quoteLine = z.strictObject({
  id,
  variant_id: id,
  product_id: id,
  sku: short,
  title: short,
  category,
  product_role: role,
  color: colorSchema,
  size: sizeSchema,
  contents,
  image_url: z.url(),
  quantity: qty,
  bundle_instance_id: id.nullable(),
  unit_price: moneySchema,
  reference_price: moneySchema.nullable(),
  subtotal: moneySchema,
  discount: moneySchema,
  total: moneySchema,
  discount_source: z.enum(["bundle", "promo", "none"]),
  on_sale: z.boolean(),
  bundle_eligible: z.boolean(),
  shipping_eligible: z.boolean(),
});
export const quoteSchema = z.strictObject({
  schema_version: version,
  quote_id: id,
  cart_id: id,
  input_revision: revision,
  input_hash: z.string().min(1).max(100000),
  policy_version: revision,
  currency: z.string().length(3),
  precision: uint.max(3),
  lines: z.array(quoteLine).max(100),
  bundle_tiers: z
    .array(
      z.strictObject({
        bundle_instance_id: id,
        groups: z.array(group).max(3),
        basis_points: uint.max(10000),
        discount: moneySchema,
      }),
    )
    .max(20),
  subtotal: moneySchema,
  discount: moneySchema,
  merchandise_total: moneySchema,
  shipping: moneySchema,
  tax: moneySchema,
  total: moneySchema,
  shipping_state: z.enum(["estimated", "confirmed"]),
  tax_state: z.enum(["estimated", "confirmed"]),
  total_state: z.enum(["estimated", "confirmed"]),
  shipping_progress: z
    .strictObject({
      threshold: moneySchema,
      qualifying: moneySchema,
      remaining: moneySchema,
      percent: z.number().min(0).max(100),
      unlocked: z.boolean(),
    })
    .nullable(),
  applied_discount: z.enum(["bundle", "promo", "none"]),
  promo_code: short.nullable(),
  comparison: z.strictObject({
    bundle_payable: moneySchema,
    promo_payable: moneySchema.nullable(),
    explanation: text,
  }),
  warnings: z
    .array(
      z.strictObject({
        code: id,
        message: text,
        line_id: id.optional(),
        blocking: z.boolean(),
      }),
    )
    .max(200),
  created_at: timestamp,
  expires_at: timestamp,
  data_source: z.literal("qa_fixture"),
}) satisfies z.ZodType<CommerceQuote>;
export const policySchema = z
  .strictObject({
    schema_version: version,
    id,
    version: revision,
    enabled: z.boolean(),
    starts_at: timestamp,
    ends_at: timestamp.nullable(),
    eligible_groups: z.array(group).max(3),
    excluded_variant_ids: z.array(id).max(500),
    tiers: z
      .array(
        z.strictObject({
          group_count: z.union([z.literal(1), z.literal(2), z.literal(3)]),
          basis_points: uint.max(10000),
        }),
      )
      .length(3),
    maximum_discount: moneySchema.nullable(),
    limits: z.strictObject({
      foundation: z.literal(1),
      main_top: z.literal(1),
      throw: z.literal(1),
      cushions: uint.max(5),
      insert_per_cover: z.literal(1),
    }),
    sale_item_treatment: z.enum(["exclude", "include"]),
    stacking: z.literal("none"),
    refund_policy_reference: text,
  })
  .refine(
    (v) =>
      v.tiers.every(
        (t, i) =>
          t.group_count === i + 1 &&
          (i === 0 || t.basis_points >= v.tiers[i - 1].basis_points),
      ),
    "Tiers must be ordered and nondecreasing",
  )
  .refine(
    (v) => !v.ends_at || v.starts_at < v.ends_at,
    "Invalid policy dates",
  ) satisfies z.ZodType<BundlePolicy>;
export const promoSchema = z
  .strictObject({
    schema_version: version,
    id,
    revision,
    version: revision,
    name: short,
    code: z.string().regex(/^[A-Z0-9_-]{2,32}$/),
    status,
    enabled: z.boolean(),
    benefit: z.discriminatedUnion("type", [
      z.strictObject({
        type: z.literal("percent"),
        basis_points: uint.max(10000),
      }),
      z.strictObject({ type: z.literal("fixed"), amount: moneySchema }),
      z.strictObject({
        type: z.literal("shipping"),
        amount: moneySchema.nullable(),
      }),
    ]),
    starts_at: timestamp,
    ends_at: timestamp,
    timezone: short.refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone"),
    eligible_categories: z.array(category).max(5),
    excluded_variant_ids: z.array(id).max(500),
    minimum_subtotal: moneySchema,
    maximum_discount: moneySchema.nullable(),
    global_usage_limit: qty
      .nullable()
      .or(z.number().int().positive().max(1000000)),
    per_customer_usage_limit: qty.nullable(),
    stacking: z.enum(["none", "shipping_with_bundle"]),
    include_sale_items: z.boolean(),
    markets: z.array(id).min(1).max(20),
    channels: z.array(z.literal("web")).min(1).max(1),
    updated_at: timestamp,
  })
  .refine((v) => v.starts_at < v.ends_at, "Invalid promotion dates")
  .refine(
    (v) => v.stacking === "none" || v.benefit.type === "shipping",
    "Only a shipping promo may explicitly stack with a bundle",
  ) satisfies z.ZodType<PromoCode>;
const cta = z
  .strictObject({
    label: text.max(28),
    href: z
      .string()
      .max(300)
      .regex(/^\/(?!\/)[a-zA-Z0-9/_?=&%.#-]*$/)
      .refine((v) => !/%(?:2f|5c|0[ad])/i.test(v), "Unsafe redirect"),
  })
  .nullable();
const focalPoint = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export const heroSchema = z
  .strictObject({
    featured_product_ids: z.array(id).max(16).optional(),
    schema_version: version,
    id,
    revision,
    internal_name: short,
    page: z.enum(["/", "/shop", "/create-your-bed"]),
    placement: z.enum(["hero", "announcement"]),
    headline: optionalText.max(80),
    supporting_copy: optionalText.max(180),
    primary_cta: cta,
    secondary_cta: cta,
    desktop_media: media.nullable(),
    mobile_media: media.nullable(),
    decorative: z.boolean(),
    focal_points: z.strictObject({ desktop: focalPoint, mobile: focalPoint }),
    announcement_text: optionalText.max(120).nullable(),
    starts_at: timestamp,
    ends_at: timestamp.nullable(),
    locale: short,
    priority: uint.max(1000),
    status,
    author_id: id,
    published_at: timestamp.nullable(),
    updated_at: timestamp,
  })
  .refine(
    (v) => !v.ends_at || v.starts_at < v.ends_at,
    "Invalid content schedule",
  )
  .refine(
    (v) =>
      v.placement !== "hero" ||
      (!!v.headline &&
        !!v.desktop_media &&
        !!v.mobile_media &&
        (v.decorative || (!!v.desktop_media.alt && !!v.mobile_media.alt))),
    "Hero requires complete media, headline and accessible descriptions",
  )
  .refine(
    (v) => v.placement !== "announcement" || !!v.announcement_text,
    "Announcement text is required",
  ) satisfies z.ZodType<HeroBannerConfig>;
export const profileSchema = z.strictObject({
  schema_version: version,
  id,
  revision,
  display_name: short,
  email: z.email().max(254),
  phone: z.e164().nullable(),
  locale: short,
  preferred_units: z.enum(["metric", "imperial"]),
  communication_preferences: z.strictObject({
    email_marketing: z.boolean(),
    sms_marketing: z.boolean(),
    consent_updated_at: timestamp,
  }),
  updated_at: timestamp,
}) satisfies z.ZodType<CustomerProfile>;
export const addressSchema = z
  .strictObject({
    schema_version: version,
    id,
    owner_id: id,
    revision,
    recipient: short,
    line1: short,
    line2: optionalText,
    city: short,
    region: optionalText,
    postal_code: optionalText.max(20),
    country: z.string().regex(/^[A-Z]{2}$/),
    phone: z.e164().nullable(),
    label: short,
    default_shipping: z.boolean(),
    default_billing: z.boolean(),
    updated_at: timestamp,
  })
  .refine(
    (v) =>
      v.country !== "US" ||
      (/^\d{5}(?:-\d{4})?$/.test(v.postal_code) && /^[A-Z]{2}$/.test(v.region)),
    "US addresses require a two-letter region and ZIP code",
  ) satisfies z.ZodType<CustomerAddress>;
export const preferenceSchema = z.strictObject({
  schema_version: version,
  id,
  owner_id: id,
  revision,
  name: text.max(40),
  market: id,
  bed_size_id: id,
  mattress_width_mm: z.number().positive().max(5000),
  mattress_length_mm: z.number().positive().max(5000),
  mattress_depth_mm: z.number().positive().max(1000),
  preferred_units: z.enum(["metric", "imperial"]),
  preferred_feel: z.enum(["light", "balanced", "warm"]).nullable(),
  preferred_fibers: z.array(fiber).max(10),
  preferred_color_families: z.array(family).max(9),
  is_default: z.boolean(),
  updated_at: timestamp,
}) satisfies z.ZodType<BedPreference>;
const orderLines = z
  .array(
    z.strictObject({
      line_id: id,
      quantity: qty,
      reserved: uint.max(99),
      shipped: uint.max(99),
      delivered: uint.max(99),
      cancelled: uint.max(99),
      returned: uint.max(99),
    }),
  )
  .min(1)
  .max(100);
const transitionLines = z
  .array(z.strictObject({ line_id: id, quantity: qty }))
  .min(1)
  .max(100);
export const transitionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("process"),
    warehouse_id: id,
    reason: text,
  }),
  z.strictObject({
    action: z.literal("start_qc"),
    inspection_reference: short,
    operator: short,
    checklist: z.array(short).min(1).max(30),
  }),
  z.strictObject({ action: z.enum(["qc_pass", "qc_hold"]), reason: text }),
  z.strictObject({
    action: z.literal("ship"),
    shipment_id: id,
    carrier: short,
    service: short,
    tracking_reference: short,
    dispatch_evidence: text,
    delivery_note_reference: short,
    lines: transitionLines,
  }),
  z.strictObject({
    action: z.literal("deliver"),
    shipment_id: id,
    evidence: text,
  }),
  z.strictObject({
    action: z.literal("cancel"),
    reason: text,
    lines: transitionLines,
  }),
  z.strictObject({
    action: z.literal("receive_return"),
    reason: text,
    receipt_reference: short,
    warehouse_id: id,
    restock: z.boolean(),
    lines: transitionLines,
  }),
  z.strictObject({ action: z.literal("fixture_capture"), evidence: text }),
  z.strictObject({
    action: z.literal("fixture_refund"),
    reason: text,
    evidence: text,
    amount: moneySchema,
  }),
]);
export const orderSchema = z.strictObject({
  schema_version: version,
  id,
  reference: short,
  owner_id: id,
  revision,
  cart_id: id,
  cart_revision: revision,
  customer_snapshot: z.strictObject({ display_name: short, email: z.email() }),
  shipping_address: addressSchema,
  destination,
  quote_snapshot: quoteSchema,
  policy_snapshot: policySchema,
  bundle_snapshots: z
    .array(
      z.strictObject({
        id,
        name: text.max(60),
        selection: selectionSchema,
        complete_bed: z.boolean(),
      }),
    )
    .max(20)
    .optional(),
  lines: orderLines,
  payment_state: z.enum([
    "pending",
    "paid",
    "failed",
    "expired",
    "partially_refunded",
    "refunded",
  ]),
  captured: moneySchema,
  refunded: moneySchema,
  financial_events: z
    .array(
      z.strictObject({
        id,
        type: z.enum(["capture", "refund"]),
        at: timestamp,
        amount: moneySchema,
        evidence: text,
      }),
    )
    .max(1000)
    .optional(),
  fulfillment_state: z.enum([
    "placed",
    "processing",
    "quality_check",
    "qc_hold",
    "ready_to_ship",
    "partially_shipped",
    "shipped",
    "partially_delivered",
    "delivered",
    "partially_cancelled",
    "cancelled",
  ]),
  return_state: z.enum(["none", "partially_returned", "returned"]),
  qc: z
    .strictObject({
      inspection_reference: short,
      operator: short,
      checklist: z.array(short).max(30),
      result: z.enum(["pending", "passed", "hold"]),
      reason: optionalText,
    })
    .nullable(),
  shipments: z
    .array(
      z.strictObject({
        id,
        carrier: short,
        service: short,
        tracking_reference: short,
        dispatch_evidence: text,
        delivery_note_reference: short,
        dispatched_at: timestamp,
        delivered_at: timestamp.nullable(),
        delivery_evidence: text.nullable(),
        lines: transitionLines,
      }),
    )
    .max(100),
  timeline: z
    .array(
      z.strictObject({
        id,
        type: short,
        at: timestamp,
        actor_id: id,
        message: text,
        evidence: text.nullable(),
      }),
    )
    .max(1000),
  reservation_expires_at: timestamp.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
  data_source: z.literal("qa_fixture"),
}) satisfies z.ZodType<OrderProjection>;
const wishlist = z.strictObject({
  id,
  owner_id: id,
  product_id: id,
  variant_id: id.nullable(),
  created_at: timestamp,
});
const look = z.strictObject({
  schema_version: version,
  id,
  owner_id: id,
  name: text.max(60),
  selection: selectionSchema,
  source_labels: z.record(z.string().max(160), short),
  revision,
  thumbnail: z.strictObject({
    status: z.enum(["item_collage", "unavailable"]),
    urls: z.array(z.url()).max(8),
  }),
  deleted_at: timestamp.nullable(),
  purge_after: timestamp.nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
const result = z.strictObject({
  id: id.optional(),
  undo_id: id.optional(),
  quote: quoteSchema.optional(),
  message: text.optional(),
});
export const stateSchema = z.strictObject({
  schema_version: version,
  mode: z.literal("qa_fixture"),
  revision,
  updated_at: timestamp,
  products: z.array(productSchema).max(2000),
  variants: z.array(variantSchema).max(10000),
  product_drafts: z.array(catalogDraftSchema).max(100),
  sizes: z.array(sizeSchema).max(500),
  colors: z.array(colorSchema).max(100),
  inventory: z
    .array(
      z.strictObject({
        id,
        variant_id: id,
        warehouse_id: id,
        revision,
        on_hand: uint.max(1000000),
        reserved: uint.max(1000000),
        reorder_threshold: uint.max(1000000),
      }),
    )
    .max(10000),
  markets: z
    .array(
      z.strictObject({
        id,
        country: z.string().length(2),
        currency: z.string().length(3),
        precision: uint.max(3),
        shipping_method_id: id,
        shipping_label: short,
        shipping_minor: uint,
        free_shipping_threshold_minor: uint,
        tax_basis_points: uint.max(10000),
        tax_shipping: z.boolean(),
        tax_rounding: z.literal("half_up_order"),
        disclosure: text,
      }),
    )
    .min(1)
    .max(20),
  bundle_policy: policySchema,
  bundle_policy_draft: policySchema.nullable(),
  promos: z.array(promoSchema).max(100),
  promo_drafts: z.array(promoSchema).max(100),
  hero_banners: z.array(heroSchema).max(100),
  hero_banner_drafts: z.array(heroSchema).max(100),
  hero_history: z.array(heroSchema).max(500),
  recipes: z
    .array(
      z.strictObject({
        id,
        name: short,
        description: text,
        image: media,
        selection: selectionSchema,
        data_source: z.literal("qa_fixture"),
      }),
    )
    .max(100),
  profile: profileSchema,
  addresses: z.array(addressSchema).max(50),
  bed_preferences: z.array(preferenceSchema).max(30),
  cart: cartSchema,
  builder_selection: selectionSchema,
  wishlist: z.array(wishlist).max(500),
  saved_looks: z.array(look).max(500),
  orders: z.array(orderSchema).max(1000),
  undo_records: z
    .array(
      z.strictObject({
        id,
        owner_id: id,
        kind: z.enum(["wishlist_move", "look_delete"]),
        expires_at: timestamp,
        entry: wishlist.nullable(),
        look_id: id.nullable(),
        cart_id: id.nullable(),
        cart_revision_after: revision.nullable(),
        line_id: id.nullable(),
        quantity_delta: uint.max(99),
      }),
    )
    .max(100),
  audit: z
    .array(
      z.strictObject({
        id,
        actor_id: id,
        role: z.enum([
          "guest",
          "customer",
          "catalog_editor",
          "marketing_manager",
          "fulfillment_operator",
          "inventory_manager",
          "finance",
          "administrator",
        ]),
        action: short,
        entity_id: id,
        at: timestamp,
        reason: optionalText,
        before_revision: revision,
        after_revision: revision,
      }),
    )
    .max(10000),
  command_receipts: z
    .array(
      z.strictObject({ key: id, fingerprint: z.string().max(200000), result }),
    )
    .max(10000),
}) satisfies z.ZodType<CommerceState>;
export const commandSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("catalog.swatch_save"),
    color: colorSchema,
    expected_state_revision: revision,
  }),
  z.strictObject({
    type: z.literal("catalog.delete_draft"),
    product_id: id,
    expected_product_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("catalog.featured"),
    product_ids: z.array(id).max(16),
    expected_state_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("inventory.threshold"),
    inventory_id: id,
    threshold: uint.max(1000000),
    expected_inventory_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("cart.add_items"),
    items: z
      .array(
        z.strictObject({
          variant_id: id,
          quantity: qty,
          expected_unit_price: moneySchema.optional(),
        }),
      )
      .min(1)
      .max(100),
    expected_cart_revision: revision,
  }),
  z.strictObject({ type: z.literal("bed.quote"), selection: selectionSchema }),
  z.strictObject({
    type: z.literal("catalog.save_draft"),
    draft: catalogDraftSchema,
    expected_product_revision: revision,
  }),
  z.strictObject({
    type: z.enum(["catalog.publish", "catalog.archive"]),
    product_id: id,
    expected_product_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("inventory.adjust"),
    inventory_id: id,
    delta: z.number().int().min(-1000000).max(1000000),
    expected_inventory_revision: revision,
    reason: text,
    evidence: text,
  }),
  z.strictObject({
    type: z.literal("cart.add_item"),
    variant_id: id,
    quantity: qty,
  }),
  z.strictObject({
    type: z.literal("cart.add_to_bundle"),
    bundle_id: id,
    variant_id: id,
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.add_bundle"),
    selection: selectionSchema,
    quote: quoteSchema,
    name: text.max(60),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.replace_bundle"),
    bundle_id: id,
    selection: selectionSchema,
    quote: quoteSchema,
    name: text.max(60),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.update_line"),
    line_id: id,
    quantity: uint.max(99),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.remove_bundle"),
    bundle_id: id,
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.set_destination"),
    destination: destination.nullable(),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("cart.apply_promo"),
    code: short.nullable(),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("builder.save"),
    selection: selectionSchema,
    expected_selection_revision: revision,
  }),
  z.strictObject({
    type: z.literal("wishlist.add"),
    product_id: id,
    variant_id: id.nullable(),
  }),
  z.strictObject({ type: z.literal("wishlist.remove"), entry_id: id }),
  z.strictObject({
    type: z.literal("wishlist.move"),
    entry_id: id,
    variant_id: id,
    expected_cart_revision: revision,
  }),
  z.strictObject({ type: z.literal("undo"), undo_id: id }),
  z.strictObject({
    type: z.literal("look.save"),
    look_id: id.nullable(),
    name: text.max(60),
    selection: selectionSchema,
    expected_look_revision: revision,
  }),
  z.strictObject({
    type: z.enum(["look.duplicate", "look.delete", "look.restore"]),
    look_id: id,
    expected_look_revision: revision,
  }),
  z.strictObject({
    type: z.literal("profile.update"),
    profile: profileSchema,
    expected_profile_revision: revision,
  }),
  z.strictObject({
    type: z.literal("address.save"),
    address: addressSchema,
    expected_address_revision: revision,
  }),
  z.strictObject({
    type: z.literal("address.delete"),
    address_id: id,
    expected_address_revision: revision,
  }),
  z.strictObject({
    type: z.literal("preference.save"),
    preference: preferenceSchema,
    expected_preference_revision: revision,
  }),
  z.strictObject({
    type: z.literal("preference.delete"),
    preference_id: id,
    expected_preference_revision: revision,
  }),
  z.strictObject({
    type: z.literal("checkout.create"),
    quote: quoteSchema,
    address_id: id,
    address: addressSchema.optional(),
    contact: z
      .strictObject({ display_name: short, email: z.email().max(254) })
      .optional(),
    expected_cart_revision: revision,
  }),
  z.strictObject({
    type: z.literal("order.transition"),
    order_id: id,
    expected_order_revision: revision,
    transition: transitionSchema,
  }),
  z.strictObject({
    type: z.literal("promo.save_draft"),
    promo: promoSchema,
    expected_promo_revision: revision,
  }),
  z.strictObject({
    type: z.enum(["promo.publish", "promo.archive"]),
    promo_id: id,
    expected_promo_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("policy.save_draft"),
    policy: policySchema,
    expected_policy_version: revision,
  }),
  z.strictObject({
    type: z.literal("policy.publish"),
    expected_policy_version: revision,
    expected_draft_version: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("hero.save_draft"),
    banner: heroSchema,
    expected_banner_revision: revision,
  }),
  z.strictObject({
    type: z.enum(["hero.publish", "hero.archive"]),
    banner_id: id,
    expected_banner_revision: revision,
    reason: text,
  }),
  z.strictObject({
    type: z.literal("hero.rollback"),
    banner_id: id,
    history_revision: revision,
    expected_banner_revision: revision,
    reason: text,
  }),
  z.strictObject({ type: z.literal("maintenance.expire") }),
]) satisfies z.ZodType<CommerceCommand>;
export const commandOptionsSchema = z.strictObject({
  idempotency_key: id,
  expected_revision: revision.optional(),
});
export function getCommerceJSONSchemas() {
  return {
    schema_version: 1,
    command: z.toJSONSchema(commandSchema, { io: "input" }),
    state: z.toJSONSchema(stateSchema, { io: "input" }),
    quote: z.toJSONSchema(quoteSchema, { io: "input" }),
  };
}
