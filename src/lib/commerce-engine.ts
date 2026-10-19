import { z } from "zod";
import {
  CURRENCY_PRECISION,
  commandOptionsSchema,
  commandSchema,
  selectionSchema,
  stateSchema,
  cartSchema,
  quoteSchema,
} from "./commerce-contracts";
import type {
  BedSelection,
  Cart,
  CartLine,
  CommerceCommand,
  CommerceErrorData,
  CommerceQuote,
  CommerceState,
  CommandOptions,
  CommandResult,
  FulfillmentState,
  LayerGroup,
  Money,
  OrderProjection,
  OrderTransition,
  QuoteLine,
  Role,
  SellableVariant,
} from "@/types/commerce";

export class CommerceError extends Error implements CommerceErrorData {
  constructor(
    public code: string,
    message: string,
    public field_errors: Record<string, string> = {},
    public retryable = false,
    public current_revision?: number,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}
export function ensure(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new CommerceError(code, message);
}
export function safeParse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new CommerceError(
    "VALIDATION",
    "Check the highlighted commerce fields.",
    Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
    ),
  );
}
export function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJSON(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function money(amount_minor: number, currency: string): Money {
  const precision = CURRENCY_PRECISION[currency];
  ensure(
    precision !== undefined &&
      Number.isSafeInteger(amount_minor) &&
      amount_minor >= 0,
    "MONEY",
    "Money must use a supported currency and nonnegative safe integer minor units.",
  );
  return { amount_minor, currency, precision };
}
function safeNumber(value: bigint): number {
  const converted = Number(value);
  ensure(
    Number.isSafeInteger(converted) && converted >= 0,
    "MONEY_OVERFLOW",
    "This amount exceeds the supported integer range.",
  );
  return converted;
}
export function sumMinor(values: number[]): number {
  return safeNumber(
    values.reduce((sum, value) => {
      ensure(
        Number.isSafeInteger(value) && value >= 0,
        "MONEY",
        "Invalid minor-unit amount.",
      );
      return sum + BigInt(value);
    }, BigInt(0)),
  );
}
export function roundBasisPoints(amount: number, basisPoints: number): number {
  ensure(
    Number.isSafeInteger(amount) &&
      amount >= 0 &&
      Number.isInteger(basisPoints) &&
      basisPoints >= 0 &&
      basisPoints <= 10000,
    "MONEY",
    "Invalid percentage inputs.",
  );
  return safeNumber(
    (BigInt(amount) * BigInt(basisPoints) + BigInt(5000)) / BigInt(10000),
  );
}
export function allocateLargestRemainder(
  total: number,
  weights: { id: string; amount: number }[],
): Record<string, number> {
  ensure(
    new Set(weights.map((w) => w.id)).size === weights.length,
    "DUPLICATE_ID",
    "Allocation line IDs must be unique.",
  );
  const denominator = sumMinor(weights.map((w) => w.amount));
  ensure(
    Number.isSafeInteger(total) && total >= 0 && total <= denominator,
    "ALLOCATION",
    "Discount cannot exceed eligible merchandise.",
  );
  const result = Object.fromEntries(weights.map((w) => [w.id, 0]));
  if (total === 0 || denominator === 0) return result;
  const ranked = weights.map((w) => {
    const numerator = BigInt(total) * BigInt(w.amount);
    return {
      ...w,
      floor: safeNumber(numerator / BigInt(denominator)),
      remainder: numerator % BigInt(denominator),
    };
  });
  ranked.forEach((line) => {
    result[line.id] = line.floor;
  });
  ranked.sort((a, b) =>
    a.remainder === b.remainder
      ? a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  const remaining = total - sumMinor(ranked.map((w) => w.floor));
  for (let i = 0; i < remaining; i++) result[ranked[i].id]++;
  return result;
}
function sameCurrency(value: Money, currency: string) {
  ensure(
    value.currency === currency &&
      value.precision === CURRENCY_PRECISION[currency],
    "CURRENCY",
    "A cart and all its pricing rules must use one currency.",
  );
}
function expected(actual: number, requested: number) {
  if (actual !== requested)
    throw new CommerceError(
      "REVISION_CONFLICT",
      "This record changed. Refresh it before saving.",
      {},
      true,
      actual,
    );
}
function find<T extends { id: string }>(values: T[], id: string): T {
  const value = values.find((v) => v.id === id);
  ensure(value, "NOT_FOUND", "The requested commerce record is unavailable.");
  return value;
}
export function layerGroup(role: string): LayerGroup | null {
  return ["sheet_set", "fitted_sheet"].includes(role)
    ? "foundation"
    : ["duvet_cover", "blanket", "throw"].includes(role)
      ? "top"
      : role === "cushion_cover"
        ? "cushions"
        : null;
}
function productFor(state: CommerceState, variant: SellableVariant) {
  return find(state.products, variant.product_id);
}
function activeVariant(state: CommerceState, variantId: string) {
  const v = find(state.variants, variantId);
  ensure(
    v.active && productFor(state, v).status === "published",
    "UNAVAILABLE_VARIANT",
    "A selected product is unpublished or archived. Choose an available option.",
  );
  return v;
}
function available(state: CommerceState, variant: SellableVariant) {
  const balance = find(state.inventory, variant.availability.inventory_id);
  return balance.on_hand - balance.reserved;
}
function inWindow(now: string, start: string, end: string | null) {
  return (
    Date.parse(now) >= Date.parse(start) &&
    (!end || Date.parse(now) < Date.parse(end))
  );
}

export function validateSelection(
  state: CommerceState,
  input: BedSelection,
  purchase = true,
): BedSelection {
  const selection = safeParse<BedSelection>(selectionSchema, input);
  const bedSize = find(state.sizes, selection.bed_size_id);
  ensure(
    !purchase || selection.fit_confirmed !== false,
    "FIT_CONFIRMATION",
    "Confirm the market and actual mattress size before requesting a purchase quote.",
  );
  ensure(
    bedSize.product_role === "mattress" && bedSize.market === selection.market,
    "BED_SIZE",
    "Select a bed size in the chosen market.",
  );
  ensure(
    selection.slots.length === 8 &&
      new Set(selection.slots.map((s) => s.slot_id)).size === 8,
    "SLOT_CARDINALITY",
    "Every bed slot must be selected, unresolved, or explicitly skipped once.",
  );
  const occupied = selection.slots.filter((s) => s.state === "selected");
  ensure(
    !purchase ||
      (occupied.length > 0 &&
        selection.slots.every((s) => s.state !== "unresolved")),
    "INCOMPLETE_SELECTION",
    "Choose compatible options or explicitly skip unresolved items.",
  );
  ensure(
    occupied.filter((s) => s.slot_id.startsWith("cushion_")).length <=
      state.bundle_policy.limits.cushions,
    "CUSHION_LIMIT",
    "This bed exceeds the permitted decorative cushion positions.",
  );
  for (const slot of selection.slots) {
    ensure(
      slot.state !== "selected" || !!slot.variant_id,
      "MISSING_VARIANT",
      "A selected slot needs an exact variant.",
    );
    ensure(
      slot.state !== "skipped" || slot.variant_id === null,
      "SKIPPED_VARIANT",
      "A skipped slot cannot contain a paid variant.",
    );
    if (slot.state !== "selected" || !purchase) continue;
    const variant = activeVariant(state, slot.variant_id!);
    const product = productFor(state, variant);
    const size = find(state.sizes, variant.size_id);
    const validRoles =
      slot.slot_id === "foundation"
        ? ["sheet_set", "fitted_sheet"]
        : slot.slot_id === "main_top"
          ? ["duvet_cover", "blanket"]
          : slot.slot_id === "throw"
            ? ["throw"]
            : ["cushion_cover"];
    ensure(
      validRoles.includes(product.product_role) &&
        size.product_role === product.product_role,
      "SLOT_ROLE",
      "The selected SKU does not fit this bed slot.",
    );
    ensure(
      variant.compatible_bed_size_ids.includes(bedSize.id),
      "FIT",
      "The selected variant has no verified equivalent for this bed size.",
    );
    if (slot.slot_id === "foundation")
      ensure(
        Math.abs(size.width_mm - bedSize.width_mm) <=
          size.measurement_tolerance.plus_minus_mm &&
          Math.abs(size.length_mm - bedSize.length_mm) <=
            size.measurement_tolerance.plus_minus_mm &&
          !!size.pocket_depth_mm,
        "FIT",
        "Foundation dimensions or fitted pocket do not match this mattress.",
      );
    if (slot.slot_id === "main_top")
      ensure(
        size.width_mm >= bedSize.width_mm &&
          size.length_mm >= bedSize.length_mm,
        "COVERAGE",
        "The main top item does not cover this mattress.",
      );
  }
  ensure(
    new Set(selection.insert_links.map((i) => i.slot_id)).size ===
      selection.insert_links.length,
    "INSERT_LIMIT",
    "Only one insert may attach to a cover position.",
  );
  if (purchase)
    for (const link of selection.insert_links) {
      const coverSlot = occupied.find((s) => s.slot_id === link.slot_id);
      ensure(
        coverSlot?.variant_id,
        "INSERT_LINK",
        "Remove an insert whose cover is no longer selected.",
      );
      const cover = activeVariant(state, coverSlot.variant_id);
      const insert = activeVariant(state, link.variant_id);
      const a = find(state.sizes, cover.size_id),
        b = find(state.sizes, insert.size_id);
      ensure(
        cover.compatible_insert_variant_ids.includes(insert.id) &&
          a.width_mm === b.width_mm &&
          a.length_mm === b.length_mm,
        "INSERT_FIT",
        "An insert must match its cover's actual dimensions and approved compatibility link.",
      );
    }
  return selection;
}
export function isCompleteBed(selection: BedSelection): boolean {
  return (
    ["foundation", "main_top"].every((id) =>
      selection.slots.some((s) => s.slot_id === id && s.state === "selected"),
    ) &&
    selection.slots.some(
      (s) => s.slot_id.startsWith("cushion_") && s.state === "selected",
    )
  );
}
function selectionLines(
  state: CommerceState,
  selection: BedSelection,
  bundleId: string,
  purchase = true,
): CartLine[] {
  validateSelection(state, selection, purchase);
  const lines: CartLine[] = [];
  for (const slot of selection.slots.filter((s) => s.state === "selected")) {
    let line = lines.find(
      (l) => l.variant_id === slot.variant_id && l.insert_for_line_id === null,
    );
    if (!line) {
      line = {
        id: `${bundleId}-${slot.slot_id}`,
        variant_id: slot.variant_id!,
        quantity: 0,
        bundle_instance_id: bundleId,
        slot_ids: [],
        insert_for_line_id: null,
      };
      lines.push(line);
    }
    line.quantity++;
    line.slot_ids.push(slot.slot_id);
  }
  for (const link of selection.insert_links) {
    const cover = lines.find((l) => l.slot_ids.includes(link.slot_id))!;
    let line = lines.find(
      (l) =>
        l.variant_id === link.variant_id && l.insert_for_line_id === cover.id,
    );
    if (!line) {
      line = {
        id: `${bundleId}-insert-${link.slot_id}`,
        variant_id: link.variant_id,
        quantity: 0,
        bundle_instance_id: bundleId,
        slot_ids: [],
        insert_for_line_id: cover.id,
      };
      lines.push(line);
    }
    line.quantity++;
    line.slot_ids.push(link.slot_id);
  }
  return lines;
}
export function selectionCart(
  state: CommerceState,
  selection: BedSelection,
): Cart {
  return {
    ...structuredClone(state.cart),
    id: "selection-preview",
    revision: selection.selection_revision,
    bundles: [
      {
        id: "selection-bundle",
        name: "Your bed",
        selection: structuredClone(selection),
        complete_bed: isCompleteBed(selection),
      },
    ],
    lines: selectionLines(state, selection, "selection-bundle"),
  };
}
function validateCartMembership(state: CommerceState, cart: Cart) {
  ensure(
    new Set(cart.lines.map((l) => l.id)).size === cart.lines.length &&
      new Set(cart.bundles.map((b) => b.id)).size === cart.bundles.length,
    "DUPLICATE_ID",
    "Cart lines and bundle instances require unique IDs.",
  );
  for (const bundle of cart.bundles) {
    const expectedLines = selectionLines(
      state,
      bundle.selection,
      bundle.id,
      false,
    );
    const actual = cart.lines.filter((l) => l.bundle_instance_id === bundle.id);
    const normalize = (lines: CartLine[]) =>
      lines
        .map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
          slot_ids: [...l.slot_ids].sort(),
          insert: l.insert_for_line_id
            ? lines.find((c) => c.id === l.insert_for_line_id)?.variant_id
            : null,
        }))
        .sort((a, b) => canonicalJSON(a).localeCompare(canonicalJSON(b)));
    ensure(
      canonicalJSON(normalize(expectedLines)) ===
        canonicalJSON(normalize(actual)),
      "BUNDLE_MEMBERSHIP",
      "Bundle quantities must agree with the exact selected positions and inserts.",
    );
  }
  cart.lines.forEach((l) =>
    ensure(
      l.bundle_instance_id
        ? cart.bundles.some((b) => b.id === l.bundle_instance_id)
        : !l.insert_for_line_id && l.slot_ids.length === 0,
      "BUNDLE_MEMBERSHIP",
      "A merchandise unit must belong to exactly one valid bundle or a standalone line.",
    ),
  );
}

export interface QuoteRuntime {
  now: string;
  quote_id: string;
}
export function quoteCart(
  state: CommerceState,
  input: Cart,
  runtime: QuoteRuntime,
): CommerceQuote {
  const cart = safeParse<Cart>(cartSchema, input);
  validateCartMembership(state, cart);
  const market = state.markets.find((m) => m.id === cart.market);
  ensure(
    market && market.currency === cart.currency,
    "MARKET",
    "This market or currency is not configured.",
  );
  if (cart.destination)
    ensure(
      cart.destination.country === market.country &&
        cart.destination.shipping_method_id === market.shipping_method_id,
      "DESTINATION",
      "Shipping is unavailable for that destination and method.",
    );
  const currency = cart.currency,
    m = (amount: number) => money(amount, currency),
    policy = state.bundle_policy;
  const warnings: CommerceQuote["warnings"] = [];
  const variantMap = new Map(state.variants.map((v) => [v.id, v]));
  const productMap = new Map(state.products.map((p) => [p.id, p]));
  const sizeMap = new Map(state.sizes.map((s) => [s.id, s]));
  const colorMap = new Map(state.colors.map((c) => [c.id, c]));
  const requested = new Map<string, number>();
  const lines: QuoteLine[] = cart.lines.map((line) => {
    const variant = variantMap.get(line.variant_id);
    ensure(
      variant,
      "UNAVAILABLE_VARIANT",
      "A selected variant no longer exists. Review the cart.",
    );
    const product = productMap.get(variant.product_id),
      size = sizeMap.get(variant.size_id),
      color = colorMap.get(variant.color_id);
    ensure(
      product && size && color,
      "CATALOG_INTEGRITY",
      "This variant has incomplete catalog references.",
    );
    sameCurrency(variant.price, currency);
    const onSale =
      !!variant.sale &&
      inWindow(runtime.now, variant.sale.starts_at, variant.sale.ends_at);
    const unitPrice = onSale ? variant.sale!.price : variant.price;
    sameCurrency(unitPrice, currency);
    requested.set(variant.id, (requested.get(variant.id) ?? 0) + line.quantity);
    if (!variant.active || product.status !== "published")
      warnings.push({
        code: "UNAVAILABLE",
        message: `${product.title} is unavailable.`,
        line_id: line.id,
        blocking: true,
      });
    const group = layerGroup(product.product_role);
    const eligible =
      !!group &&
      policy.eligible_groups.includes(group) &&
      variant.bundle_eligible &&
      !policy.excluded_variant_ids.includes(variant.id) &&
      (!onSale || policy.sale_item_treatment === "include");
    if (line.bundle_instance_id && onSale && !eligible)
      warnings.push({
        code: "SALE_EXCLUDED",
        message: `${product.title} is on sale and excluded from the extra bundle discount.`,
        line_id: line.id,
        blocking: false,
      });
    const subtotal = safeNumber(
      BigInt(unitPrice.amount_minor) * BigInt(line.quantity),
    );
    return {
      id: line.id,
      variant_id: variant.id,
      product_id: product.id,
      sku: variant.sku,
      title: product.title,
      category: product.category,
      product_role: product.product_role,
      color: structuredClone(color),
      size: structuredClone(size),
      contents: structuredClone(product.contents),
      image_url: product.media[0].url,
      quantity: line.quantity,
      bundle_instance_id: line.bundle_instance_id,
      unit_price: structuredClone(unitPrice),
      reference_price: onSale
        ? structuredClone(variant.sale!.reference_price)
        : null,
      subtotal: m(subtotal),
      discount: m(0),
      total: m(subtotal),
      discount_source: "none",
      on_sale: onSale,
      bundle_eligible: eligible,
      shipping_eligible: variant.shipping_eligible,
    };
  });
  for (const [variantId, quantity] of requested)
    if (available(state, variantMap.get(variantId)!) < quantity)
      warnings.push({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient available stock for ${variantMap.get(variantId)!.sku}.`,
        blocking: true,
      });
  const bundleAlloc: Record<string, number> = Object.fromEntries(
    lines.map((l) => [l.id, 0]),
  );
  const bundleTiers: CommerceQuote["bundle_tiers"] = [];
  if (policy.enabled && inWindow(runtime.now, policy.starts_at, policy.ends_at))
    for (const bundle of cart.bundles) {
      const eligible = lines.filter(
        (l) => l.bundle_instance_id === bundle.id && l.bundle_eligible,
      );
      const groups = [
        ...new Set(eligible.map((l) => layerGroup(l.product_role)!)),
      ].sort() as LayerGroup[];
      const basisPoints =
        policy.tiers.find((t) => t.group_count === groups.length)
          ?.basis_points ?? 0;
      const raw = roundBasisPoints(
        sumMinor(eligible.map((l) => l.subtotal.amount_minor)),
        basisPoints,
      );
      if (policy.maximum_discount)
        sameCurrency(policy.maximum_discount, currency);
      const discount = policy.maximum_discount
        ? Math.min(raw, policy.maximum_discount.amount_minor)
        : raw;
      Object.assign(
        bundleAlloc,
        allocateLargestRemainder(
          discount,
          eligible.map((l) => ({ id: l.id, amount: l.subtotal.amount_minor })),
        ),
      );
      bundleTiers.push({
        bundle_instance_id: bundle.id,
        groups,
        basis_points: basisPoints,
        discount: m(discount),
      });
    }
  const subtotal = sumMinor(lines.map((l) => l.subtotal.amount_minor));
  const candidate = (
    alloc: Record<string, number>,
    shippingDiscount: number | null = 0,
  ) => {
    const discount = sumMinor(Object.values(alloc));
    const merchandise = subtotal - discount;
    const qualifying = sumMinor(
      lines
        .filter((l) => l.shipping_eligible)
        .map((l) => l.subtotal.amount_minor - (alloc[l.id] ?? 0)),
    );
    const threshold = market.free_shipping_threshold_minor;
    const baseShipping =
      lines.length === 0 || qualifying >= threshold ? 0 : market.shipping_minor;
    const shipping = cart.destination
      ? Math.max(
          0,
          baseShipping -
            (shippingDiscount === null ? baseShipping : shippingDiscount),
        )
      : 0;
    const taxable = sumMinor([merchandise, market.tax_shipping ? shipping : 0]);
    const tax = cart.destination
      ? roundBasisPoints(taxable, market.tax_basis_points)
      : 0;
    return {
      discount,
      merchandise,
      qualifying,
      shipping,
      tax,
      total: sumMinor([merchandise, shipping, tax]),
      alloc,
    };
  };
  const bundleCandidate = candidate(bundleAlloc);
  let promoCandidate: ReturnType<typeof candidate> | null = null;
  let promoEnd: string | null = null;
  let acceptedPromo: string | null = null;
  if (cart.promo_code) {
    const promo = state.promos.find(
      (p) =>
        p.code === cart.promo_code?.trim().toUpperCase() &&
        p.status === "published" &&
        p.enabled,
    );
    const usage = promo
      ? state.orders.filter(
          (o) =>
            o.quote_snapshot.promo_code === promo.code &&
            o.payment_state !== "expired" &&
            !(
              o.fulfillment_state === "cancelled" &&
              o.captured.amount_minor === 0
            ),
        )
      : [];
    const eligible = promo
      ? lines.filter(
          (l) =>
            (!promo.eligible_categories.length ||
              promo.eligible_categories.includes(l.category)) &&
            !promo.excluded_variant_ids.includes(l.variant_id) &&
            (promo.include_sale_items || !l.on_sale),
        )
      : [];
    const eligibleTotal = sumMinor(
      eligible.map((l) => l.subtotal.amount_minor),
    );
    const valid =
      promo &&
      inWindow(runtime.now, promo.starts_at, promo.ends_at) &&
      promo.markets.includes(cart.market) &&
      promo.channels.includes("web") &&
      eligible.length > 0 &&
      eligibleTotal >= promo.minimum_subtotal.amount_minor &&
      (promo.global_usage_limit === null ||
        usage.length < promo.global_usage_limit) &&
      (promo.per_customer_usage_limit === null ||
        usage.filter((o) => o.owner_id === cart.owner_id).length <
          promo.per_customer_usage_limit);
    if (!valid)
      warnings.push({
        code: "PROMO_INELIGIBLE",
        message: !promo
          ? "This promotion code is unavailable. Check the code and try again."
          : Date.parse(runtime.now) >= Date.parse(promo.ends_at)
            ? "This promotion has expired."
            : Date.parse(runtime.now) < Date.parse(promo.starts_at)
              ? "This promotion is not active yet."
              : (promo.global_usage_limit !== null &&
                    usage.length >= promo.global_usage_limit) ||
                  (promo.per_customer_usage_limit !== null &&
                    usage.filter((o) => o.owner_id === cart.owner_id).length >=
                      promo.per_customer_usage_limit)
                ? "The usage limit for this promotion has been reached."
                : "This promotion is not eligible for the current items, subtotal or market.",
        blocking: false,
      });
    else {
      sameCurrency(promo.minimum_subtotal, currency);
      if (promo.maximum_discount)
        sameCurrency(promo.maximum_discount, currency);
      let amount = 0;
      if (promo.benefit.type === "percent")
        amount = roundBasisPoints(eligibleTotal, promo.benefit.basis_points);
      if (promo.benefit.type === "fixed") {
        sameCurrency(promo.benefit.amount, currency);
        amount = Math.min(eligibleTotal, promo.benefit.amount.amount_minor);
      }
      if (promo.maximum_discount)
        amount = Math.min(amount, promo.maximum_discount.amount_minor);
      const promoAlloc = allocateLargestRemainder(
        amount,
        eligible.map((l) => ({ id: l.id, amount: l.subtotal.amount_minor })),
      );
      let shippingBenefit: number | null = 0;
      if (promo.benefit.type === "shipping") {
        if (promo.benefit.amount) sameCurrency(promo.benefit.amount, currency);
        shippingBenefit = promo.benefit.amount?.amount_minor ?? null;
        if (promo.maximum_discount)
          shippingBenefit = Math.min(
            shippingBenefit ?? Number.MAX_SAFE_INTEGER,
            promo.maximum_discount.amount_minor,
          );
      }
      promoCandidate = candidate(
        promo.benefit.type === "shipping" &&
          promo.stacking === "shipping_with_bundle"
          ? bundleAlloc
          : promoAlloc,
        shippingBenefit,
      );
      promoEnd = promo.ends_at;
      acceptedPromo = promo.code;
    }
  }
  const promoWins =
    !!promoCandidate && promoCandidate.total < bundleCandidate.total;
  const chosen = promoWins ? promoCandidate! : bundleCandidate;
  const winningShippingPromo =
    promoWins &&
    state.promos.find((p) => p.code === acceptedPromo)?.benefit.type ===
      "shipping";
  for (const line of lines) {
    const discount = chosen.alloc[line.id] ?? 0;
    line.discount = m(discount);
    line.total = m(line.subtotal.amount_minor - discount);
    line.discount_source = discount
      ? promoWins && !winningShippingPromo
        ? "promo"
        : "bundle"
      : "none";
  }
  const expiryTimes = [
    Date.parse(runtime.now) + 300000,
    ...(promoEnd ? [Date.parse(promoEnd)] : []),
    ...(policy.ends_at ? [Date.parse(policy.ends_at)] : []),
    ...cart.lines.flatMap((l) => {
      const sale = variantMap.get(l.variant_id)?.sale;
      return sale
        ? [Date.parse(sale.starts_at), Date.parse(sale.ends_at)].filter(
            (t) => t > Date.parse(runtime.now),
          )
        : [];
    }),
  ];
  const confirmed = cart.destination !== null;
  const inputHash = canonicalJSON({
    cart: { ...cart, latest_quote_id: null, updated_at: "" },
    policy_version: policy.version,
    promo_versions: state.promos.map((p) => [p.id, p.version, p.revision]),
  });
  return {
    schema_version: 1,
    quote_id: runtime.quote_id,
    cart_id: cart.id,
    input_revision: cart.revision,
    input_hash: inputHash,
    policy_version: policy.version,
    currency,
    precision: market.precision,
    lines,
    bundle_tiers: bundleTiers,
    subtotal: m(subtotal),
    discount: m(chosen.discount),
    merchandise_total: m(chosen.merchandise),
    shipping: m(chosen.shipping),
    tax: m(chosen.tax),
    total: m(chosen.total),
    shipping_state: confirmed ? "confirmed" : "estimated",
    tax_state: confirmed ? "confirmed" : "estimated",
    total_state: confirmed ? "confirmed" : "estimated",
    shipping_progress: confirmed
      ? {
          threshold: m(market.free_shipping_threshold_minor),
          qualifying: m(chosen.qualifying),
          remaining: m(
            Math.max(
              0,
              market.free_shipping_threshold_minor - chosen.qualifying,
            ),
          ),
          percent:
            market.free_shipping_threshold_minor === 0
              ? 100
              : Math.min(
                  100,
                  (chosen.qualifying / market.free_shipping_threshold_minor) *
                    100,
                ),
          unlocked: chosen.shipping === 0,
        }
      : null,
    applied_discount: promoWins
      ? "promo"
      : chosen.discount > 0
        ? "bundle"
        : "none",
    promo_code: promoWins ? acceptedPromo : null,
    comparison: {
      bundle_payable: m(bundleCandidate.total),
      promo_payable: promoCandidate ? m(promoCandidate.total) : null,
      explanation: promoWins
        ? "The promotion gives the lower whole-cart payable amount. Bundle discounts are replaced unless this shipping promotion explicitly permits stacking."
        : promoCandidate
          ? "Bundle pricing gives an equal or lower whole-cart payable amount; ties prefer the bundle. The promotion was not applied."
          : "Bundle pricing applies where eligible. Shipping and tax are estimates until a supported destination and method are selected.",
    },
    warnings,
    created_at: runtime.now,
    expires_at: new Date(Math.min(...expiryTimes)).toISOString(),
    data_source: "qa_fixture",
  };
}
export function quoteSelection(
  state: CommerceState,
  selection: BedSelection,
  runtime: QuoteRuntime,
) {
  return quoteCart(state, selectionCart(state, selection), runtime);
}
function acceptQuote(
  accepted: CommerceQuote,
  current: CommerceQuote,
  now: string,
) {
  safeParse<CommerceQuote>(quoteSchema, accepted);
  ensure(
    Date.parse(accepted.expires_at) > Date.parse(now) &&
      Date.parse(accepted.created_at) <= Date.parse(now),
    "QUOTE_EXPIRED",
    "Refresh the expired quote before continuing.",
  );
  const commercial = (q: CommerceQuote) => ({
    ...q,
    quote_id: "",
    created_at: "",
    expires_at: "",
  });
  ensure(
    canonicalJSON(commercial(accepted)) === canonicalJSON(commercial(current)),
    "QUOTE_CHANGED",
    "Price, stock, exclusions or delivery changed. Review a fresh quote before continuing.",
  );
  ensure(
    !current.warnings.some((w) => w.blocking),
    "QUOTE_BLOCKED",
    "Resolve unavailable products or insufficient stock before continuing.",
  );
}

export interface CommandRuntime {
  now: string;
  actor_id: string;
  role: Role;
  newId: () => string;
}
const STAFF = new Set<Role>([
  "catalog_editor",
  "marketing_manager",
  "fulfillment_operator",
  "inventory_manager",
  "finance",
  "administrator",
]);
export function isStaff(role: Role) {
  return STAFF.has(role);
}
function authorize(role: Role, allowed: Role[]) {
  ensure(
    role === "administrator" || allowed.includes(role),
    "FORBIDDEN",
    "The current QA role cannot perform this action.",
  );
}
function owner(state: CommerceState, runtime: CommandRuntime) {
  ensure(
    runtime.actor_id === state.profile.id,
    "OWNER",
    "This device's private records belong to another customer scope.",
  );
}
export function allowedOrderActions(
  order: OrderProjection,
  role: Role,
): OrderTransition["action"][] {
  const result: OrderTransition["action"][] = [];
  if (role === "administrator" || role === "finance") {
    if (
      order.payment_state === "pending" &&
      order.fulfillment_state !== "cancelled"
    )
      result.push("fixture_capture");
    if (order.captured.amount_minor > order.refunded.amount_minor)
      result.push("fixture_refund");
  }
  if (role !== "administrator" && role !== "fulfillment_operator")
    return result;
  if (
    ["placed", "partially_cancelled"].includes(order.fulfillment_state) &&
    order.payment_state === "paid"
  )
    result.push("process");
  if (["processing", "qc_hold"].includes(order.fulfillment_state))
    result.push("start_qc");
  if (order.fulfillment_state === "quality_check")
    result.push("qc_pass", "qc_hold");
  if (
    order.qc?.result === "passed" &&
    order.payment_state === "paid" &&
    order.lines.some((l) => l.reserved > 0)
  )
    result.push("ship");
  if (order.shipments.some((s) => !s.delivered_at)) result.push("deliver");
  if (order.lines.some((l) => l.quantity > l.shipped + l.cancelled))
    result.push("cancel");
  if (order.lines.some((l) => l.delivered > l.returned))
    result.push("receive_return");
  return result;
}
function deriveFulfillment(order: OrderProjection): FulfillmentState {
  const n = (key: "quantity" | "shipped" | "delivered" | "cancelled") =>
    order.lines.reduce((sum, l) => sum + l[key], 0);
  const required = n("quantity") - n("cancelled");
  if (required === 0) return "cancelled";
  if (n("delivered") === required) return "delivered";
  if (n("delivered") > 0) return "partially_delivered";
  if (n("shipped") === required) return "shipped";
  if (n("shipped") > 0) return "partially_shipped";
  if (n("cancelled") > 0) return "partially_cancelled";
  return order.fulfillment_state;
}
function transitionOrder(
  state: CommerceState,
  order: OrderProjection,
  transition: OrderTransition,
  runtime: CommandRuntime,
) {
  ensure(
    allowedOrderActions(order, runtime.role).includes(transition.action),
    "ILLEGAL_TRANSITION",
    "This order action is not allowed from its current state or role.",
  );
  const inventoryFor = (lineId: string) => {
    const quoteLine = find(order.quote_snapshot.lines, lineId);
    const variant = find(state.variants, quoteLine.variant_id);
    return find(state.inventory, variant.availability.inventory_id);
  };
  if (transition.action === "fixture_capture") {
    ensure(
      order.reservation_expires_at &&
        Date.parse(order.reservation_expires_at) > Date.parse(runtime.now),
      "RESERVATION_EXPIRED",
      "The stock hold expired; capture cannot proceed.",
    );
    order.payment_state = "paid";
    order.captured = structuredClone(order.quote_snapshot.total);
    (order.financial_events ??= []).push({
      id: runtime.newId(),
      type: "capture",
      at: runtime.now,
      amount: structuredClone(order.captured),
      evidence: transition.evidence,
    });
    order.reservation_expires_at = null;
  } else if (transition.action === "fixture_refund") {
    sameCurrency(transition.amount, order.captured.currency);
    ensure(
      transition.amount.amount_minor > 0 &&
        transition.amount.amount_minor <=
          order.captured.amount_minor - order.refunded.amount_minor,
      "REFUND_AMOUNT",
      "The refund exceeds remaining captured funds.",
    );
    order.refunded.amount_minor = sumMinor([
      order.refunded.amount_minor,
      transition.amount.amount_minor,
    ]);
    (order.financial_events ??= []).push({
      id: runtime.newId(),
      type: "refund",
      at: runtime.now,
      amount: structuredClone(transition.amount),
      evidence: transition.evidence,
    });
    order.payment_state =
      order.refunded.amount_minor === order.captured.amount_minor
        ? "refunded"
        : "partially_refunded";
  } else if (transition.action === "process") {
    ensure(
      order.lines.every(
        (l) =>
          l.reserved === l.quantity - l.cancelled &&
          inventoryFor(l.line_id).warehouse_id === transition.warehouse_id,
      ),
      "RESERVATION",
      "All accepted quantities must be reserved in the assigned warehouse.",
    );
    order.fulfillment_state = "processing";
  } else if (transition.action === "start_qc") {
    order.qc = {
      inspection_reference: transition.inspection_reference,
      operator: transition.operator,
      checklist: transition.checklist,
      result: "pending",
      reason: "",
    };
    order.fulfillment_state = "quality_check";
  } else if (
    transition.action === "qc_pass" ||
    transition.action === "qc_hold"
  ) {
    ensure(order.qc, "QC", "Open an inspection before recording its result.");
    order.qc.result = transition.action === "qc_pass" ? "passed" : "hold";
    order.qc.reason = transition.reason;
    order.fulfillment_state =
      transition.action === "qc_pass" ? "ready_to_ship" : "qc_hold";
  } else if (transition.action === "deliver") {
    const shipment = find(order.shipments, transition.shipment_id);
    ensure(
      !shipment.delivered_at,
      "DELIVERY",
      "This shipment has already been delivered.",
    );
    shipment.delivered_at = runtime.now;
    shipment.delivery_evidence = transition.evidence;
    shipment.lines.forEach((line) => {
      const target = order.lines.find((l) => l.line_id === line.line_id)!;
      target.delivered += line.quantity;
    });
  } else if ("lines" in transition) {
    ensure(
      new Set(transition.lines.map((l) => l.line_id)).size ===
        transition.lines.length,
      "DUPLICATE_LINE",
      "Transition line quantities must be unique.",
    );
    if (transition.action === "ship")
      ensure(
        !order.shipments.some((s) => s.id === transition.shipment_id),
        "DUPLICATE_SHIPMENT",
        "This shipment reference is already used.",
      );
    for (const commandLine of transition.lines) {
      const target = order.lines.find((l) => l.line_id === commandLine.line_id);
      ensure(
        target,
        "ORDER_LINE",
        "A transition references an unknown purchased line.",
      );
      const inventory = inventoryFor(target.line_id);
      const quantity = commandLine.quantity;
      if (transition.action === "ship") {
        ensure(
          quantity <= target.reserved &&
            quantity <= inventory.reserved &&
            quantity <= inventory.on_hand,
          "SHIP_QUANTITY",
          "Dispatch exceeds the reserved unshipped quantities.",
        );
        target.reserved -= quantity;
        target.shipped += quantity;
        inventory.reserved -= quantity;
        inventory.on_hand -= quantity;
      }
      if (transition.action === "cancel") {
        ensure(
          quantity <= target.quantity - target.shipped - target.cancelled,
          "CANCEL_QUANTITY",
          "Shipped goods must follow the returns workflow.",
        );
        const release = Math.min(quantity, target.reserved);
        target.reserved -= release;
        inventory.reserved -= release;
        target.cancelled += quantity;
      }
      if (transition.action === "receive_return") {
        ensure(
          quantity <= target.delivered - target.returned &&
            transition.warehouse_id === inventory.warehouse_id,
          "RETURN_QUANTITY",
          "Only delivered unreturned quantities may be received into the correct warehouse.",
        );
        target.returned += quantity;
        if (transition.restock) inventory.on_hand += quantity;
      }
      inventory.revision++;
    }
    if (transition.action === "ship") {
      const { action: _action, ...shipment } = transition;
      void _action;
      order.shipments.push({
        id: shipment.shipment_id,
        carrier: shipment.carrier,
        service: shipment.service,
        tracking_reference: shipment.tracking_reference,
        dispatch_evidence: shipment.dispatch_evidence,
        delivery_note_reference: shipment.delivery_note_reference,
        dispatched_at: runtime.now,
        delivered_at: null,
        delivery_evidence: null,
        lines: structuredClone(shipment.lines),
      });
    }
    if (transition.action === "receive_return")
      order.return_state = order.lines.every(
        (l) => l.returned === l.quantity - l.cancelled,
      )
        ? "returned"
        : "partially_returned";
  }
  order.fulfillment_state = deriveFulfillment(order);
  if (order.fulfillment_state === "cancelled")
    order.reservation_expires_at = null;
  order.revision++;
  order.updated_at = runtime.now;
  const evidence =
    "evidence" in transition
      ? transition.evidence
      : "dispatch_evidence" in transition
        ? transition.dispatch_evidence
        : "receipt_reference" in transition
          ? transition.receipt_reference
          : null;
  order.timeline.push({
    id: runtime.newId(),
    type: transition.action,
    at: runtime.now,
    actor_id: runtime.actor_id,
    message:
      "reason" in transition
        ? transition.reason
        : `QA ${transition.action.replaceAll("_", " ")} recorded`,
    evidence,
  });
}

function validateCatalog(
  state: CommerceState,
  draft: CommerceState["product_drafts"][number],
) {
  const product = draft.product;
  const others = [
    ...state.variants.filter(
      (v) =>
        v.product_id !== product.id ||
        !draft.variants.some((next) => next.id === v.id),
    ),
    ...draft.variants,
  ];
  ensure(
    new Set(others.map((v) => v.id)).size === others.length &&
      new Set(others.map((v) => v.sku.toUpperCase())).size === others.length,
    "DUPLICATE_SKU",
    "Variant IDs and SKUs must be unique.",
  );
  ensure(
    !state.products.some((p) => p.id !== product.id && p.slug === product.slug),
    "DUPLICATE_SLUG",
    "This product URL is already used.",
  );
  const tuples = new Set<string>();
  for (const variant of draft.variants) {
    const size = find(state.sizes, variant.size_id);
    find(state.colors, variant.color_id);
    ensure(
      variant.product_id === product.id &&
        size.product_role === product.product_role,
      "VARIANT_PRODUCT",
      "Variant dimensions and product role must agree with the parent product.",
    );
    ensure(
      variant.weave === product.weave &&
        canonicalJSON(variant.fibers) === canonicalJSON(product.fibers),
      "MATERIAL",
      "Variant fiber and weave references must match this product family.",
    );
    const tuple = canonicalJSON([
      variant.color_id,
      size.market,
      size.width_mm,
      size.length_mm,
      size.pocket_depth_mm ?? null,
      variant.weave,
      variant.fibers,
    ]);
    ensure(
      !tuples.has(tuple),
      "DUPLICATE_DIMENSIONS",
      "This product already has the actual color, material and dimension combination.",
    );
    tuples.add(tuple);
    const market = state.markets.find((m) => m.id === size.market);
    ensure(market, "MARKET", "Variant market is not configured.");
    sameCurrency(variant.price, market.currency);
    ensure(
      variant.media_ids.every((id) => product.media.some((m) => m.id === id)),
      "MEDIA",
      "Every variant image must belong to its product.",
    );
    for (const bedId of variant.compatible_bed_size_ids)
      ensure(
        find(state.sizes, bedId).product_role === "mattress",
        "FIT",
        "Compatibility must reference mattress size records.",
      );
    if (variant.sale) {
      sameCurrency(variant.sale.price, variant.price.currency);
      sameCurrency(variant.sale.reference_price, variant.price.currency);
      ensure(
        variant.sale.starts_at < variant.sale.ends_at &&
          variant.sale.price.amount_minor < variant.price.amount_minor &&
          variant.sale.reference_price.amount_minor ===
            variant.price.amount_minor,
        "SALE",
        "Sale dates and current/reference prices must be coherent.",
      );
    }
    const previous = state.variants.find((v) => v.id === variant.id);
    if (previous)
      ensure(
        previous.product_id === variant.product_id &&
          canonicalJSON(previous.availability) ===
            canonicalJSON(variant.availability),
        "INVENTORY_REFERENCE",
        "Product editing cannot replace an existing stock identity.",
      );
    for (const insertId of variant.compatible_insert_variant_ids) {
      const insert = others.find((v) => v.id === insertId);
      ensure(insert, "INSERT_FIT", "A compatible insert SKU does not exist.");
      const insertSize = find(state.sizes, insert.size_id);
      ensure(
        ["duvet_cover", "cushion_cover"].includes(product.product_role) &&
          insertSize.product_role ===
            (product.product_role === "duvet_cover"
              ? "duvet_insert"
              : "pillow_insert") &&
          insertSize.width_mm === size.width_mm &&
          insertSize.length_mm === size.length_mm,
        "INSERT_FIT",
        "Insert compatibility must match the cover's actual dimensions.",
      );
    }
  }
}
function addStandalone(
  state: CommerceState,
  variantId: string,
  quantity: number,
  runtime: CommandRuntime,
) {
  const variant = activeVariant(state, variantId);
  sameCurrency(variant.price, state.cart.currency);
  let line = state.cart.lines.find(
    (l) => l.variant_id === variantId && l.bundle_instance_id === null,
  );
  if (!line) {
    line = {
      id: runtime.newId(),
      variant_id: variantId,
      quantity: 0,
      bundle_instance_id: null,
      slot_ids: [],
      insert_for_line_id: null,
    };
    state.cart.lines.push(line);
  }
  ensure(
    line.quantity + quantity <= 99,
    "QUANTITY",
    "A cart line may contain at most 99 sale units.",
  );
  const total =
    state.cart.lines
      .filter((l) => l.variant_id === variantId)
      .reduce((sum, l) => sum + l.quantity, 0) + quantity;
  ensure(
    total <= available(state, variant),
    "INSUFFICIENT_STOCK",
    "This quantity exceeds available stock.",
  );
  line.quantity += quantity;
  return line;
}
function touchCart(state: CommerceState, runtime: CommandRuntime) {
  state.cart.revision++;
  state.cart.updated_at = runtime.now;
  state.cart.latest_quote_id = null;
}
function updateCartLine(
  state: CommerceState,
  lineId: string,
  quantity: number,
) {
  const line = find(state.cart.lines, lineId);
  if (!line.bundle_instance_id) {
    line.quantity = quantity;
    state.cart.lines = state.cart.lines.filter((l) => l.quantity > 0);
    return;
  }
  const bundle = find(state.cart.bundles, line.bundle_instance_id);
  const selection = bundle.selection;
  if (line.insert_for_line_id) {
    ensure(
      quantity <= line.quantity,
      "INSERT_EDIT",
      "Add inserts by explicitly editing compatible cover positions in the bed builder.",
    );
    const removeSlots = line.slot_ids.slice(quantity);
    selection.insert_links = selection.insert_links.filter(
      (i) => !removeSlots.includes(i.slot_id),
    );
  } else {
    const extra = quantity - line.quantity;
    if (extra > 0) {
      ensure(
        line.slot_ids.every((s) => s.startsWith("cushion_")),
        "SLOT_LIMIT",
        "Foundation, main top and throw have at most one sale unit per bundle.",
      );
      const empty = selection.slots.filter(
        (s) => s.slot_id.startsWith("cushion_") && s.state === "skipped",
      );
      ensure(
        empty.length >= extra,
        "CUSHION_LIMIT",
        "This bundle has no remaining decorative cushion positions.",
      );
      empty.slice(0, extra).forEach((s) => {
        s.variant_id = line.variant_id;
        s.state = "selected";
      });
    } else {
      const removeSlots = line.slot_ids.slice(quantity);
      selection.slots
        .filter((s) => removeSlots.includes(s.slot_id))
        .forEach((s) => {
          s.variant_id = null;
          s.state = "skipped";
        });
      selection.insert_links = selection.insert_links.filter(
        (i) => !removeSlots.includes(i.slot_id),
      );
    }
  }
  selection.selection_revision++;
  if (selection.slots.some((s) => s.state === "selected")) {
    const rebuilt = selectionLines(state, selection, bundle.id, false);
    state.cart.lines = [
      ...state.cart.lines.filter((l) => l.bundle_instance_id !== bundle.id),
      ...rebuilt,
    ];
    bundle.complete_bed = isCompleteBed(selection);
  } else {
    state.cart.bundles = state.cart.bundles.filter((b) => b.id !== bundle.id);
    state.cart.lines = state.cart.lines.filter(
      (l) => l.bundle_instance_id !== bundle.id,
    );
  }
}
function expireRecords(state: CommerceState, now: string) {
  state.undo_records = state.undo_records.filter(
    (u) => Date.parse(u.expires_at) > Date.parse(now),
  );
  state.saved_looks = state.saved_looks.filter(
    (look) =>
      !look.purge_after || Date.parse(look.purge_after) > Date.parse(now),
  );
  for (const order of state.orders)
    if (
      order.payment_state === "pending" &&
      order.reservation_expires_at &&
      Date.parse(order.reservation_expires_at) <= Date.parse(now)
    ) {
      for (const line of order.lines) {
        const variant = find(
          state.variants,
          find(order.quote_snapshot.lines, line.line_id).variant_id,
        );
        const inventory = find(
          state.inventory,
          variant.availability.inventory_id,
        );
        inventory.reserved -= line.reserved;
        inventory.revision++;
        line.reserved = 0;
        line.cancelled = line.quantity - line.shipped;
      }
      order.payment_state = "expired";
      order.fulfillment_state = "cancelled";
      order.reservation_expires_at = null;
      order.revision++;
      order.updated_at = now;
      order.timeline.push({
        id: `expiry-${order.id}-${order.revision}`,
        type: "reservation_expired",
        at: now,
        actor_id: "qa-maintenance",
        message:
          "The unpaid QA stock hold expired; all remaining reservations were released.",
        evidence: null,
      });
    }
}
export function validateState(value: unknown): CommerceState {
  const state = safeParse<CommerceState>(stateSchema, value);
  for (const rows of [
    state.products,
    state.variants,
    state.sizes,
    state.colors,
    state.inventory,
    state.orders,
    state.addresses,
    state.saved_looks,
    state.wishlist,
    state.bed_preferences,
    state.hero_banners,
    state.promos,
  ])
    ensure(
      new Set(rows.map((r) => r.id)).size === rows.length,
      "DUPLICATE_ID",
      "Persisted records contain duplicate identities.",
    );
  ensure(
    new Set(state.variants.map((v) => v.sku.toUpperCase())).size ===
      state.variants.length,
    "DUPLICATE_SKU",
    "Published and archived SKUs must retain unique identities.",
  );
  ensure(
    state.markets.every((m) => CURRENCY_PRECISION[m.currency] === m.precision),
    "CURRENCY",
    "Market currency precision is invalid.",
  );
  ensure(
    state.cart.owner_id === state.profile.id &&
      [
        ...state.addresses,
        ...state.saved_looks,
        ...state.wishlist,
        ...state.bed_preferences,
        ...state.orders,
      ].every((r) => r.owner_id === state.profile.id),
    "OWNER",
    "Private records must remain in this QA customer scope.",
  );
  ensure(
    state.addresses.filter((a) => a.default_shipping).length <= 1 &&
      state.addresses.filter((a) => a.default_billing).length <= 1 &&
      state.bed_preferences.filter((b) => b.is_default).length <= 1,
    "DEFAULT_CONFLICT",
    "Only one default may exist in each category.",
  );
  const reserved = new Map<string, number>();
  for (const order of state.orders) {
    const financial = order.financial_events ?? [];
    ensure(
      new Set(financial.map((e) => e.id)).size === financial.length,
      "FINANCIAL_EVENT",
      "Financial event identities must be unique.",
    );
    financial.forEach((e) => sameCurrency(e.amount, order.captured.currency));
    ensure(
      sumMinor(
        financial
          .filter((e) => e.type === "capture")
          .map((e) => e.amount.amount_minor),
      ) <= order.captured.amount_minor &&
        sumMinor(
          financial
            .filter((e) => e.type === "refund")
            .map((e) => e.amount.amount_minor),
        ) <= order.refunded.amount_minor,
      "FINANCIAL_EVENT",
      "Recorded financial events cannot exceed reconciled order balances.",
    );
    ensure(
      order.refunded.amount_minor <= order.captured.amount_minor &&
        order.captured.amount_minor <= order.quote_snapshot.total.amount_minor,
      "PAYMENT_INTEGRITY",
      "Refunded/captured money cannot exceed the accepted order.",
    );
    for (const line of order.lines) {
      ensure(
        line.shipped + line.cancelled <= line.quantity &&
          line.delivered <= line.shipped &&
          line.returned <= line.delivered &&
          line.reserved <= line.quantity - line.shipped - line.cancelled,
        "ORDER_QUANTITIES",
        "Order quantities violate fulfillment conservation.",
      );
      const purchased = find(order.quote_snapshot.lines, line.line_id);
      reserved.set(
        purchased.variant_id,
        (reserved.get(purchased.variant_id) ?? 0) + line.reserved,
      );
    }
  }
  for (const variant of state.variants) {
    find(state.products, variant.product_id);
    find(state.sizes, variant.size_id);
    find(state.colors, variant.color_id);
    const balance = find(state.inventory, variant.availability.inventory_id);
    ensure(
      balance.variant_id === variant.id &&
        balance.warehouse_id === variant.availability.warehouse_id,
      "INVENTORY_REFERENCE",
      "Stock identity does not match the variant.",
    );
  }
  state.inventory.forEach((i) =>
    ensure(
      i.reserved <= i.on_hand &&
        i.reserved === (reserved.get(i.variant_id) ?? 0),
      "INVENTORY_INTEGRITY",
      "Stock reservations must reconcile exactly to committed order quantities.",
    ),
  );
  ensure(
    new Set(state.command_receipts.map((r) => r.key)).size ===
      state.command_receipts.length,
    "IDEMPOTENCY",
    "Command keys must be unique.",
  );
  ensure(
    new Set(state.orders.map((o) => `${o.cart_id}:${o.cart_revision}`)).size ===
      state.orders.length,
    "CHECKOUT_BINDING",
    "A cart revision may create only one checkout.",
  );
  return state;
}

export function executeCommand(
  previous: CommerceState,
  input: CommerceCommand,
  optionsInput: CommandOptions,
  runtime: CommandRuntime,
): { state: CommerceState; result: CommandResult } {
  const command = safeParse<CommerceCommand>(commandSchema, input);
  const options = safeParse<CommandOptions>(commandOptionsSchema, optionsInput);
  ensure(
    Number.isFinite(Date.parse(runtime.now)),
    "TIME",
    "Commands require a valid UTC clock.",
  );
  owner(previous, runtime);
  if (command.type === "bed.quote") {
    const current = structuredClone(previous);
    expireRecords(current, runtime.now);
    return {
      state: previous,
      result: {
        quote: quoteSelection(current, command.selection, {
          now: runtime.now,
          quote_id: runtime.newId(),
        }),
      },
    };
  }
  if (
    command.type.startsWith("catalog.") &&
    command.type !== "catalog.featured"
  )
    authorize(runtime.role, ["catalog_editor"]);
  if (command.type === "catalog.featured") authorize(runtime.role, []);
  if (command.type.startsWith("inventory."))
    authorize(runtime.role, ["inventory_manager"]);
  if (
    command.type.startsWith("promo.") ||
    command.type.startsWith("policy.") ||
    command.type.startsWith("hero.")
  )
    authorize(runtime.role, ["marketing_manager"]);
  if (
    [
      "promo.publish",
      "promo.archive",
      "policy.publish",
      "hero.publish",
      "hero.archive",
      "hero.rollback",
    ].includes(command.type)
  )
    authorize(runtime.role, []);
  if (command.type === "order.transition")
    authorize(runtime.role, ["fulfillment_operator", "finance"]);
  if (command.type === "order.transition") {
    const financial = ["fixture_capture", "fixture_refund"].includes(
      command.transition.action,
    );
    authorize(runtime.role, financial ? ["finance"] : ["fulfillment_operator"]);
  }
  const fingerprint = canonicalJSON({ command, actor_id: runtime.actor_id });
  ensure(
    fingerprint.length <= 200000,
    "REQUEST_SIZE",
    "This commerce command is too large.",
  );
  const receipt = previous.command_receipts.find(
    (r) => r.key === options.idempotency_key,
  );
  if (receipt) {
    ensure(
      receipt.fingerprint === fingerprint,
      "IDEMPOTENCY_CONFLICT",
      "This command key was already used with different inputs.",
    );
    return { state: previous, result: structuredClone(receipt.result) };
  }
  if (options.expected_revision !== undefined)
    expected(previous.revision, options.expected_revision);
  // A private working copy is committed only after every mutation and invariant succeeds.
  const state = structuredClone(previous);
  expireRecords(state, runtime.now);
  let result: CommandResult = {};
  const q = (cart = state.cart) =>
    quoteCart(state, cart, { now: runtime.now, quote_id: runtime.newId() });
  switch (command.type) {
    case "catalog.swatch_save": {
      expected(state.revision, command.expected_state_revision);
      ensure(
        !state.colors.some(
          (c) =>
            c.id !== command.color.id &&
            c.name.toLowerCase() === command.color.name.toLowerCase(),
        ),
        "COLOR_NAME",
        "Use a unique color name.",
      );
      state.colors = [
        ...state.colors.filter((c) => c.id !== command.color.id),
        command.color,
      ];
      result.id = command.color.id;
      break;
    }
    case "catalog.delete_draft": {
      const draft = find(
        state.product_drafts.map((d) => ({ ...d, id: d.product.id })),
        command.product_id,
      );
      expected(draft.product.revision, command.expected_product_revision);
      ensure(
        !state.products.some((p) => p.id === command.product_id),
        "REFERENCED_PRODUCT",
        "Published and historical products must be archived. Only an unpublished draft can be permanently deleted.",
      );
      state.product_drafts = state.product_drafts.filter(
        (d) => d.product.id !== command.product_id,
      );
      result.id = command.product_id;
      break;
    }
    case "catalog.featured": {
      expected(state.revision, command.expected_state_revision);
      ensure(
        new Set(command.product_ids).size === command.product_ids.length,
        "FEATURED",
        "Featured products must be unique.",
      );
      command.product_ids.forEach((id) =>
        ensure(
          find(state.products, id).status === "published",
          "FEATURED",
          "Only published products may be featured.",
        ),
      );
      state.products.forEach((p) => {
        const rank = command.product_ids.indexOf(p.id);
        p.featured_rank = rank < 0 ? 0 : rank + 1;
        p.revision++;
        p.updated_at = runtime.now;
      });
      break;
    }
    case "inventory.threshold": {
      const balance = find(state.inventory, command.inventory_id);
      expected(balance.revision, command.expected_inventory_revision);
      balance.reorder_threshold = command.threshold;
      balance.revision++;
      result.id = balance.id;
      break;
    }
    case "cart.add_items": {
      expected(state.cart.revision, command.expected_cart_revision);
      command.items.forEach((item) => {
        const variant = activeVariant(state, item.variant_id);
        const current =
          variant.sale &&
          inWindow(runtime.now, variant.sale.starts_at, variant.sale.ends_at)
            ? variant.sale.price
            : variant.price;
        if (item.expected_unit_price)
          ensure(
            canonicalJSON(current) === canonicalJSON(item.expected_unit_price),
            "PRICE_CHANGED",
            "A buy-again price changed. Review the updated prices before adding these items.",
          );
        addStandalone(state, item.variant_id, item.quantity, runtime);
      });
      touchCart(state, runtime);
      result.quote = q();
      break;
    }
    case "catalog.save_draft": {
      const source =
        state.product_drafts.find(
          (d) => d.product.id === command.draft.product.id,
        )?.product ??
        state.products.find((p) => p.id === command.draft.product.id);
      expected(source?.revision ?? 0, command.expected_product_revision);
      validateCatalog(state, command.draft);
      const draft = structuredClone(command.draft);
      draft.product.status = "draft";
      draft.product.revision = (source?.revision ?? 0) + 1;
      draft.product.updated_at = runtime.now;
      state.product_drafts = [
        ...state.product_drafts.filter(
          (d) => d.product.id !== draft.product.id,
        ),
        draft,
      ];
      result.id = draft.product.id;
      break;
    }
    case "catalog.publish": {
      const draft = state.product_drafts.find(
        (d) => d.product.id === command.product_id,
      );
      ensure(
        draft,
        "DRAFT_REQUIRED",
        "Save a complete product draft before publication.",
      );
      expected(draft.product.revision, command.expected_product_revision);
      validateCatalog(state, draft);
      draft.product.status = "published";
      draft.product.revision++;
      draft.product.updated_at = runtime.now;
      state.products = [
        ...state.products.filter((p) => p.id !== command.product_id),
        draft.product,
      ];
      const removed = state.variants.filter(
        (v) =>
          v.product_id === command.product_id &&
          !draft.variants.some((next) => next.id === v.id),
      );
      removed.forEach((v) => {
        v.active = false;
        v.revision++;
      });
      const published = draft.variants.map((v) => {
        const old = state.variants.find((o) => o.id === v.id);
        return { ...v, revision: (old?.revision ?? 0) + 1 };
      });
      state.variants = [
        ...state.variants.filter((v) => v.product_id !== command.product_id),
        ...removed,
        ...published,
      ];
      for (const v of published)
        if (!state.inventory.some((i) => i.id === v.availability.inventory_id))
          state.inventory.push({
            id: v.availability.inventory_id,
            variant_id: v.id,
            warehouse_id: v.availability.warehouse_id,
            revision: 1,
            on_hand: 0,
            reserved: 0,
            reorder_threshold: 4,
          });
      state.product_drafts = state.product_drafts.filter(
        (d) => d.product.id !== command.product_id,
      );
      result.id = command.product_id;
      break;
    }
    case "catalog.archive": {
      const p = find(state.products, command.product_id);
      expected(p.revision, command.expected_product_revision);
      p.status = "archived";
      p.revision++;
      p.updated_at = runtime.now;
      state.variants
        .filter((v) => v.product_id === p.id)
        .forEach((v) => {
          v.active = false;
          v.revision++;
        });
      result.id = p.id;
      break;
    }
    case "inventory.adjust": {
      const balance = find(state.inventory, command.inventory_id);
      expected(balance.revision, command.expected_inventory_revision);
      ensure(
        command.delta !== 0 &&
          balance.on_hand + command.delta >= balance.reserved &&
          Number.isSafeInteger(balance.on_hand + command.delta),
        "STOCK_ADJUSTMENT",
        "The adjustment must change stock without consuming reserved units.",
      );
      balance.on_hand += command.delta;
      balance.revision++;
      result.id = balance.id;
      break;
    }
    case "cart.add_item": {
      const line = addStandalone(
        state,
        command.variant_id,
        command.quantity,
        runtime,
      );
      touchCart(state, runtime);
      result = { id: line.id, quote: q() };
      break;
    }
    case "cart.add_to_bundle": {
      expected(state.cart.revision, command.expected_cart_revision);
      const bundle = find(state.cart.bundles, command.bundle_id),
        variant = activeVariant(state, command.variant_id);
      ensure(
        productFor(state, variant).product_role === "cushion_cover",
        "UPSELL_ROLE",
        "Only a compatible decorative cushion can fill this suggested slot.",
      );
      const slot = bundle.selection.slots.find(
        (s) => s.slot_id.startsWith("cushion_") && s.state === "skipped",
      );
      ensure(
        slot,
        "CUSHION_LIMIT",
        "This bundle has no empty decorative cushion positions.",
      );
      slot.variant_id = variant.id;
      slot.state = "selected";
      bundle.selection.selection_revision++;
      const rebuilt = selectionLines(state, bundle.selection, bundle.id);
      state.cart.lines = [
        ...state.cart.lines.filter((l) => l.bundle_instance_id !== bundle.id),
        ...rebuilt,
      ];
      bundle.complete_bed = isCompleteBed(bundle.selection);
      touchCart(state, runtime);
      const quote = q();
      ensure(
        !quote.warnings.some((w) => w.blocking),
        "CART_INVALID",
        "The suggested cushion cannot be added at the current stock or compatibility.",
      );
      result = { id: bundle.id, quote };
      break;
    }
    case "cart.add_bundle":
    case "cart.replace_bundle": {
      ensure(
        !command.selection.step_intent ||
          Object.values(command.selection.step_intent).every(
            (s) => s !== "open",
          ),
        "OPEN_BED_STEPS",
        "Configure or explicitly skip each bed step before adding the selection.",
      );
      expected(state.cart.revision, command.expected_cart_revision);
      acceptQuote(
        command.quote,
        quoteSelection(state, command.selection, {
          now: runtime.now,
          quote_id: command.quote.quote_id,
        }),
        runtime.now,
      );
      const bundleId =
        command.type === "cart.replace_bundle"
          ? find(state.cart.bundles, command.bundle_id).id
          : runtime.newId();
      if (command.type === "cart.replace_bundle") {
        state.cart.bundles = state.cart.bundles.filter(
          (b) => b.id !== bundleId,
        );
        state.cart.lines = state.cart.lines.filter(
          (l) => l.bundle_instance_id !== bundleId,
        );
      }
      state.cart.bundles.push({
        id: bundleId,
        name: command.name,
        selection: structuredClone(command.selection),
        complete_bed: isCompleteBed(command.selection),
      });
      state.cart.lines.push(
        ...selectionLines(state, command.selection, bundleId),
      );
      touchCart(state, runtime);
      const quote = q();
      ensure(
        !quote.warnings.some((w) => w.blocking),
        "BUNDLE_ATOMIC_FAILURE",
        "No bundle was added because at least one required item is unavailable.",
      );
      result = { id: bundleId, quote };
      break;
    }
    case "cart.update_line": {
      expected(state.cart.revision, command.expected_cart_revision);
      const priorQuantity = find(state.cart.lines, command.line_id).quantity;
      updateCartLine(state, command.line_id, command.quantity);
      touchCart(state, runtime);
      const quote = q();
      ensure(
        command.quantity <= priorQuantity ||
          !quote.warnings.some((w) => w.blocking),
        "CART_INVALID",
        "The changed cart cannot be purchased at the requested quantities.",
      );
      result.quote = quote;
      break;
    }
    case "cart.remove_bundle": {
      expected(state.cart.revision, command.expected_cart_revision);
      find(state.cart.bundles, command.bundle_id);
      state.cart.bundles = state.cart.bundles.filter(
        (b) => b.id !== command.bundle_id,
      );
      state.cart.lines = state.cart.lines.filter(
        (l) => l.bundle_instance_id !== command.bundle_id,
      );
      touchCart(state, runtime);
      result.quote = q();
      break;
    }
    case "cart.set_destination": {
      expected(state.cart.revision, command.expected_cart_revision);
      state.cart.destination = command.destination;
      touchCart(state, runtime);
      result.quote = q();
      break;
    }
    case "cart.apply_promo": {
      expected(state.cart.revision, command.expected_cart_revision);
      state.cart.promo_code = command.code?.trim().toUpperCase() ?? null;
      touchCart(state, runtime);
      const quote = q();
      const promoIssue = quote.warnings.find(
        (w) => w.code === "PROMO_INELIGIBLE",
      );
      ensure(
        !command.code || !promoIssue,
        "PROMO_INELIGIBLE",
        promoIssue?.message ?? "This promotion is not eligible for this cart.",
      );
      result.quote = quote;
      break;
    }
    case "builder.save": {
      expected(
        state.builder_selection.selection_revision,
        command.expected_selection_revision,
      );
      validateSelection(state, command.selection, false);
      state.builder_selection = {
        ...command.selection,
        selection_revision: state.builder_selection.selection_revision + 1,
      };
      break;
    }
    case "wishlist.add": {
      find(state.products, command.product_id);
      if (command.variant_id)
        ensure(
          find(state.variants, command.variant_id).product_id ===
            command.product_id,
          "WISHLIST_VARIANT",
          "The saved option must belong to this product.",
        );
      const existing = state.wishlist.find(
        (w) =>
          w.product_id === command.product_id &&
          w.variant_id === command.variant_id,
      );
      if (existing) result.id = existing.id;
      else {
        const entry = {
          id: runtime.newId(),
          owner_id: runtime.actor_id,
          product_id: command.product_id,
          variant_id: command.variant_id,
          created_at: runtime.now,
        };
        state.wishlist.push(entry);
        result.id = entry.id;
      }
      break;
    }
    case "wishlist.remove": {
      find(state.wishlist, command.entry_id);
      state.wishlist = state.wishlist.filter((w) => w.id !== command.entry_id);
      break;
    }
    case "wishlist.move": {
      expected(state.cart.revision, command.expected_cart_revision);
      const entry = find(state.wishlist, command.entry_id);
      const variant = activeVariant(state, command.variant_id);
      ensure(
        variant.product_id === entry.product_id &&
          (!entry.variant_id || entry.variant_id === variant.id),
        "WISHLIST_VARIANT",
        "Choose the saved product's exact options before moving it.",
      );
      const line = addStandalone(state, variant.id, 1, runtime);
      touchCart(state, runtime);
      state.wishlist = state.wishlist.filter((w) => w.id !== entry.id);
      const undoId = runtime.newId();
      state.undo_records.push({
        id: undoId,
        owner_id: runtime.actor_id,
        kind: "wishlist_move",
        expires_at: new Date(Date.parse(runtime.now) + 10000).toISOString(),
        entry: structuredClone(entry),
        look_id: null,
        cart_id: state.cart.id,
        cart_revision_after: state.cart.revision,
        line_id: line.id,
        quantity_delta: 1,
      });
      result = { id: line.id, undo_id: undoId, quote: q() };
      break;
    }
    case "undo": {
      const undo = find(state.undo_records, command.undo_id);
      ensure(
        Date.parse(undo.expires_at) > Date.parse(runtime.now),
        "UNDO_EXPIRED",
        "The 10-second undo window has closed.",
      );
      if (undo.kind === "look_delete") {
        const look = find(state.saved_looks, undo.look_id!);
        ensure(look.deleted_at, "LOOK_STATE", "This look is already restored.");
        look.deleted_at = null;
        look.purge_after = null;
        look.revision++;
        look.updated_at = runtime.now;
        result.id = look.id;
      } else {
        const entry = undo.entry!;
        if (
          !state.wishlist.some(
            (w) =>
              w.product_id === entry.product_id &&
              w.variant_id === entry.variant_id,
          )
        )
          state.wishlist.push(entry);
        const line = state.cart.lines.find((l) => l.id === undo.line_id);
        if (
          state.cart.id === undo.cart_id &&
          state.cart.revision === undo.cart_revision_after &&
          line &&
          line.quantity >= undo.quantity_delta
        ) {
          line.quantity -= undo.quantity_delta;
          state.cart.lines = state.cart.lines.filter((l) => l.quantity > 0);
          touchCart(state, runtime);
          result.message =
            "Saved item restored; only the moved quantity was removed from the cart.";
        } else
          result.message =
            "Saved item restored. The cart or checkout changed, so its items and any order were retained.";
      }
      state.undo_records = state.undo_records.filter((u) => u.id !== undo.id);
      break;
    }
    case "look.save": {
      validateSelection(state, command.selection, false);
      const existing = command.look_id
        ? find(state.saved_looks, command.look_id)
        : null;
      expected(existing?.revision ?? 0, command.expected_look_revision);
      ensure(
        !existing?.deleted_at,
        "LOOK_DELETED",
        "Restore this archived look before editing.",
      );
      const labels = Object.fromEntries(
        command.selection.slots
          .filter((s) => s.variant_id)
          .map((s) => {
            const variant = state.variants.find((v) => v.id === s.variant_id);
            return [
              s.slot_id,
              variant
                ? productFor(state, variant).title
                : (s.source_label ?? "Unavailable saved option"),
            ];
          }),
      );
      const urls = [
        ...new Set(
          command.selection.slots
            .filter((s) => s.variant_id)
            .flatMap((s) => {
              const v = state.variants.find((v) => v.id === s.variant_id);
              return v ? [productFor(state, v).media[0].url] : [];
            }),
        ),
      ];
      const look: CommerceState["saved_looks"][number] = {
        schema_version: 1,
        id: existing?.id ?? runtime.newId(),
        owner_id: runtime.actor_id,
        name: command.name,
        selection: structuredClone(command.selection),
        source_labels: labels,
        revision: (existing?.revision ?? 0) + 1,
        thumbnail: {
          status: urls.length ? "item_collage" : "unavailable",
          urls,
        },
        deleted_at: null,
        purge_after: null,
        created_at: existing?.created_at ?? runtime.now,
        updated_at: runtime.now,
      };
      state.saved_looks = [
        ...state.saved_looks.filter((l) => l.id !== look.id),
        look,
      ];
      result.id = look.id;
      break;
    }
    case "look.duplicate":
    case "look.delete":
    case "look.restore": {
      const look = find(state.saved_looks, command.look_id);
      expected(look.revision, command.expected_look_revision);
      if (command.type === "look.duplicate") {
        ensure(
          !look.deleted_at,
          "LOOK_DELETED",
          "Restore this archived look before duplicating.",
        );
        const copy = {
          ...structuredClone(look),
          id: runtime.newId(),
          name: `${look.name.slice(0, 53)} (copy)`,
          revision: 1,
          created_at: runtime.now,
          updated_at: runtime.now,
        };
        state.saved_looks.push(copy);
        result.id = copy.id;
      } else if (command.type === "look.restore") {
        ensure(look.deleted_at, "LOOK_STATE", "This look is already active.");
        look.deleted_at = null;
        look.purge_after = null;
        look.revision++;
        look.updated_at = runtime.now;
        state.undo_records = state.undo_records.filter(
          (u) => u.look_id !== look.id,
        );
        result.id = look.id;
      } else {
        ensure(
          !look.deleted_at,
          "LOOK_STATE",
          "This look is already in Recently deleted.",
        );
        look.deleted_at = runtime.now;
        look.purge_after = new Date(
          Date.parse(runtime.now) + 30 * 86400000,
        ).toISOString();
        look.revision++;
        look.updated_at = runtime.now;
        state.undo_records = state.undo_records.filter(
          (u) => u.look_id !== look.id,
        );
        const undoId = runtime.newId();
        state.undo_records.push({
          id: undoId,
          owner_id: runtime.actor_id,
          kind: "look_delete",
          expires_at: new Date(Date.parse(runtime.now) + 10000).toISOString(),
          entry: null,
          look_id: look.id,
          cart_id: null,
          cart_revision_after: null,
          line_id: null,
          quantity_delta: 0,
        });
        result = { id: look.id, undo_id: undoId };
      }
      break;
    }
    case "profile.update": {
      expected(state.profile.revision, command.expected_profile_revision);
      ensure(
        command.profile.id === runtime.actor_id &&
          command.profile.email === state.profile.email,
        "EMAIL_VERIFICATION_REQUIRED",
        "Email changes require a connected identity service and verification; the QA engine does not impersonate that service.",
      );
      state.profile = {
        ...command.profile,
        id: runtime.actor_id,
        revision: state.profile.revision + 1,
        communication_preferences: {
          ...command.profile.communication_preferences,
          consent_updated_at: runtime.now,
        },
        updated_at: runtime.now,
      };
      break;
    }
    case "address.save": {
      const existing = state.addresses.find((a) => a.id === command.address.id);
      expected(existing?.revision ?? 0, command.expected_address_revision);
      ensure(
        command.address.owner_id === runtime.actor_id,
        "OWNER",
        "Address ownership cannot be changed.",
      );
      const address = {
        ...command.address,
        owner_id: runtime.actor_id,
        revision: (existing?.revision ?? 0) + 1,
        updated_at: runtime.now,
      };
      state.addresses = state.addresses
        .filter((a) => a.id !== address.id)
        .map((a) => ({
          ...a,
          ...(address.default_shipping ? { default_shipping: false } : {}),
          ...(address.default_billing ? { default_billing: false } : {}),
          revision:
            a.revision +
            ((address.default_shipping && a.default_shipping) ||
            (address.default_billing && a.default_billing)
              ? 1
              : 0),
        }));
      state.addresses.push(address);
      result.id = address.id;
      break;
    }
    case "address.delete": {
      const address = find(state.addresses, command.address_id);
      expected(address.revision, command.expected_address_revision);
      state.addresses = state.addresses.filter((a) => a.id !== address.id);
      break;
    }
    case "preference.save": {
      const existing = state.bed_preferences.find(
        (p) => p.id === command.preference.id,
      );
      expected(existing?.revision ?? 0, command.expected_preference_revision);
      ensure(
        command.preference.owner_id === runtime.actor_id &&
          find(state.sizes, command.preference.bed_size_id).product_role ===
            "mattress" &&
          find(state.sizes, command.preference.bed_size_id).market ===
            command.preference.market,
        "PREFERENCE",
        "Preference owner, market and size must agree.",
      );
      const preference = {
        ...command.preference,
        owner_id: runtime.actor_id,
        revision: (existing?.revision ?? 0) + 1,
        updated_at: runtime.now,
      };
      state.bed_preferences = state.bed_preferences
        .filter((p) => p.id !== preference.id)
        .map((p) =>
          preference.is_default && p.is_default
            ? {
                ...p,
                is_default: false,
                revision: p.revision + 1,
                updated_at: runtime.now,
              }
            : p,
        );
      state.bed_preferences.push(preference);
      result.id = preference.id;
      break;
    }
    case "preference.delete": {
      const preference = find(state.bed_preferences, command.preference_id);
      expected(preference.revision, command.expected_preference_revision);
      state.bed_preferences = state.bed_preferences.filter(
        (p) => p.id !== preference.id,
      );
      break;
    }
    case "checkout.create": {
      const prior = state.orders.find(
        (o) =>
          o.cart_id === command.quote.cart_id &&
          o.cart_revision === command.expected_cart_revision,
      );
      if (prior) {
        ensure(
          prior.shipping_address.id === command.address_id &&
            prior.quote_snapshot.input_hash === command.quote.input_hash &&
            (!command.contact ||
              canonicalJSON(command.contact) ===
                canonicalJSON(prior.customer_snapshot)) &&
            (!command.address ||
              canonicalJSON(command.address) ===
                canonicalJSON(prior.shipping_address)),
          "CHECKOUT_BINDING",
          "This cart revision is already bound to a different accepted checkout request.",
        );
        result.id = prior.id;
        result.message =
          "The existing checkout for this cart revision was returned.";
        break;
      }
      expected(state.cart.revision, command.expected_cart_revision);
      ensure(
        state.cart.lines.length > 0 && state.cart.destination,
        "CHECKOUT_INCOMPLETE",
        "Select merchandise and a supported shipping destination before checkout.",
      );
      const fresh = q();
      acceptQuote(command.quote, fresh, runtime.now);
      const address =
        command.address ?? find(state.addresses, command.address_id);
      ensure(
        address.id === command.address_id &&
          address.owner_id === runtime.actor_id,
        "OWNER",
        "The delivery address must belong to this scoped QA checkout.",
      );
      ensure(
        address.country === state.cart.destination.country &&
          address.region === state.cart.destination.region,
        "ADDRESS_DESTINATION",
        "Refresh shipping and tax for this delivery address.",
      );
      for (const line of state.cart.lines) {
        const variant = activeVariant(state, line.variant_id);
        const inventory = find(
          state.inventory,
          variant.availability.inventory_id,
        );
        ensure(
          inventory.on_hand - inventory.reserved >= line.quantity,
          "INSUFFICIENT_STOCK",
          "The whole checkout was rejected because a required item is unavailable.",
        );
        inventory.reserved += line.quantity;
        inventory.revision++;
      }
      const id = runtime.newId();
      const quoteSnapshot = structuredClone(fresh);
      quoteSnapshot.quote_id = command.quote.quote_id;
      const order: OrderProjection = {
        schema_version: 1,
        id,
        reference: `QA-${String(state.orders.length + 1).padStart(6, "0")}`,
        owner_id: runtime.actor_id,
        revision: 1,
        cart_id: state.cart.id,
        cart_revision: state.cart.revision,
        customer_snapshot: command.contact
          ? structuredClone(command.contact)
          : {
              display_name: state.profile.display_name,
              email: state.profile.email,
            },
        shipping_address: structuredClone(address),
        destination: structuredClone(state.cart.destination),
        quote_snapshot: quoteSnapshot,
        policy_snapshot: structuredClone(state.bundle_policy),
        bundle_snapshots: structuredClone(state.cart.bundles),
        lines: state.cart.lines.map((l) => ({
          line_id: l.id,
          quantity: l.quantity,
          reserved: l.quantity,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0,
        })),
        payment_state: "pending",
        captured: money(0, state.cart.currency),
        refunded: money(0, state.cart.currency),
        fulfillment_state: "placed",
        return_state: "none",
        qc: null,
        shipments: [],
        timeline: [
          {
            id: runtime.newId(),
            type: "order_placed",
            at: runtime.now,
            actor_id: runtime.actor_id,
            message:
              "QA order committed. Payment is pending; no real funds were collected.",
            evidence: null,
          },
        ],
        reservation_expires_at: new Date(
          Date.parse(runtime.now) + 900000,
        ).toISOString(),
        created_at: runtime.now,
        updated_at: runtime.now,
        data_source: "qa_fixture",
      };
      state.orders.push(order);
      state.cart = {
        ...state.cart,
        id: runtime.newId(),
        revision: 0,
        bundles: [],
        lines: [],
        promo_code: null,
        latest_quote_id: null,
        updated_at: runtime.now,
      };
      result.id = id;
      break;
    }
    case "order.transition": {
      const order = find(state.orders, command.order_id);
      expected(order.revision, command.expected_order_revision);
      transitionOrder(state, order, command.transition, runtime);
      result.id = order.id;
      break;
    }
    case "promo.save_draft": {
      const old =
        state.promo_drafts.find((p) => p.id === command.promo.id) ??
        state.promos.find((p) => p.id === command.promo.id);
      expected(old?.revision ?? 0, command.expected_promo_revision);
      ensure(
        ![...state.promos, ...state.promo_drafts].some(
          (p) => p.id !== command.promo.id && p.code === command.promo.code,
        ),
        "PROMO_CODE",
        "This normalized promotion code is already used.",
      );
      const promo = {
        ...command.promo,
        revision: (old?.revision ?? 0) + 1,
        status: "draft" as const,
        updated_at: runtime.now,
      };
      state.promo_drafts = [
        ...state.promo_drafts.filter((p) => p.id !== promo.id),
        promo,
      ];
      result.id = promo.id;
      break;
    }
    case "promo.publish":
    case "promo.archive": {
      const source =
        command.type === "promo.publish" ? state.promo_drafts : state.promos;
      const promo = find(source, command.promo_id);
      expected(promo.revision, command.expected_promo_revision);
      promo.revision++;
      promo.version =
        (state.promos.find((p) => p.id === promo.id)?.version ?? 0) + 1;
      promo.status =
        command.type === "promo.publish" ? "published" : "archived";
      promo.updated_at = runtime.now;
      state.promos = [...state.promos.filter((p) => p.id !== promo.id), promo];
      state.promo_drafts = state.promo_drafts.filter((p) => p.id !== promo.id);
      result.id = promo.id;
      break;
    }
    case "policy.save_draft": {
      const baseVersion =
        state.bundle_policy_draft?.version ?? state.bundle_policy.version;
      expected(baseVersion, command.expected_policy_version);
      state.bundle_policy_draft = {
        ...command.policy,
        version: baseVersion + 1,
      };
      break;
    }
    case "policy.publish": {
      expected(state.bundle_policy.version, command.expected_policy_version);
      ensure(
        state.bundle_policy_draft,
        "DRAFT_REQUIRED",
        "Save a bundle policy draft first.",
      );
      expected(
        state.bundle_policy_draft.version,
        command.expected_draft_version,
      );
      state.bundle_policy = {
        ...state.bundle_policy_draft,
        version: state.bundle_policy.version + 1,
      };
      state.bundle_policy_draft = null;
      break;
    }
    case "hero.save_draft": {
      const old =
        state.hero_banner_drafts.find((b) => b.id === command.banner.id) ??
        state.hero_banners.find((b) => b.id === command.banner.id);
      expected(old?.revision ?? 0, command.expected_banner_revision);
      ensure(
        new Set(command.banner.featured_product_ids ?? []).size ===
          (command.banner.featured_product_ids ?? []).length,
        "FEATURED",
        "Featured products must be unique.",
      );
      (command.banner.featured_product_ids ?? []).forEach((id) =>
        ensure(
          find(state.products, id).status === "published",
          "FEATURED",
          "Featured products must be published.",
        ),
      );
      const banner = {
        ...command.banner,
        revision: (old?.revision ?? 0) + 1,
        status: "draft" as const,
        author_id: runtime.actor_id,
        updated_at: runtime.now,
      };
      state.hero_banner_drafts = [
        ...state.hero_banner_drafts.filter((b) => b.id !== banner.id),
        banner,
      ];
      result.id = banner.id;
      break;
    }
    case "hero.publish":
    case "hero.archive":
    case "hero.rollback": {
      let banner;
      const live = state.hero_banners.find((b) => b.id === command.banner_id);
      if (command.type === "hero.rollback") {
        ensure(
          live,
          "NOT_FOUND",
          "No published content is available to roll back.",
        );
        expected(live.revision, command.expected_banner_revision);
        banner = state.hero_history.find(
          (b) =>
            b.id === command.banner_id &&
            b.revision === command.history_revision,
        );
        ensure(
          banner,
          "HISTORY",
          "That published content version is unavailable.",
        );
        banner = structuredClone(banner);
      } else {
        banner = find(
          command.type === "hero.publish"
            ? state.hero_banner_drafts
            : state.hero_banners,
          command.banner_id,
        );
        expected(banner.revision, command.expected_banner_revision);
        banner = structuredClone(banner);
      }
      if (command.type !== "hero.archive")
        (banner.featured_product_ids ?? []).forEach((id) =>
          ensure(
            find(state.products, id).status === "published",
            "FEATURED",
            "Featured products must still be published when content is promoted.",
          ),
        );
      if (live) state.hero_history.push(structuredClone(live));
      banner.revision = Math.max(banner.revision, live?.revision ?? 0) + 1;
      banner.status =
        command.type === "hero.archive" ? "archived" : "published";
      banner.published_at = runtime.now;
      banner.updated_at = runtime.now;
      banner.author_id = runtime.actor_id;
      state.hero_banners = [
        ...state.hero_banners.filter((b) => b.id !== banner.id),
        banner,
      ];
      state.hero_banner_drafts = state.hero_banner_drafts.filter(
        (b) => b.id !== banner.id,
      );
      result.id = banner.id;
      break;
    }
    case "maintenance.expire":
      break;
    default: {
      const neverCommand: never = command;
      throw new CommerceError(
        "COMMAND",
        `Unsupported commerce command: ${String(neverCommand)}`,
      );
    }
  }
  if (result.quote) state.cart.latest_quote_id = result.quote.quote_id;
  state.revision++;
  state.updated_at = runtime.now;
  state.command_receipts.push({
    key: options.idempotency_key,
    fingerprint,
    result: structuredClone(result),
  });
  const reason =
    "reason" in command
      ? command.reason
      : "transition" in command && "reason" in command.transition
        ? command.transition.reason
        : "";
  state.audit.push({
    id: runtime.newId(),
    actor_id: runtime.actor_id,
    role: runtime.role,
    action: command.type,
    entity_id: result.id ?? state.cart.id,
    at: runtime.now,
    reason,
    before_revision: previous.revision,
    after_revision: state.revision,
  });
  return { state: validateState(state), result };
}

export function previewCommand(
  state: CommerceState,
  command: CommerceCommand,
  runtime: CommandRuntime,
) {
  let sequence = 0;
  const previewRuntime = {
    ...runtime,
    newId: () => `preview-${state.revision}-${++sequence}`,
  };
  const simulated = executeCommand(
    state,
    command,
    { idempotency_key: `preview-command-${state.revision}` },
    previewRuntime,
  );
  return {
    expected_revision: state.revision,
    result: simulated.result,
    before_cart: quoteCart(state, state.cart, {
      now: runtime.now,
      quote_id: "preview-before",
    }),
    after_cart: quoteCart(simulated.state, simulated.state.cart, {
      now: runtime.now,
      quote_id: "preview-after",
    }),
    inventory_changes: simulated.state.inventory
      .filter((i) => {
        const old = state.inventory.find((p) => p.id === i.id);
        return !old || old.on_hand !== i.on_hand || old.reserved !== i.reserved;
      })
      .map((i) => ({
        id: i.id,
        before: state.inventory.find((p) => p.id === i.id) ?? null,
        after: i,
      })),
  };
}
export function publishedBanners(
  state: CommerceState,
  now: string,
  locale = "en-US",
) {
  return state.hero_banners
    .filter(
      (b) =>
        b.status === "published" &&
        b.locale === locale &&
        inWindow(now, b.starts_at, b.ends_at),
    )
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
