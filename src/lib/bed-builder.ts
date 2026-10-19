import type {
  BedSelection,
  BedSlotId,
  CommerceState,
  Product,
  OrderProjection,
  SellableVariant,
} from "@/types/commerce";
import { emptyBedSelection } from "./seed-data";
import { canonicalJSON } from "./commerce-engine";
import { dimensions, formatMoney, priceOf } from "./storefront";

export const BED_STEPS = ["Foundation", "Top layer", "Cushions"] as const;
export const BED_POSITIONS: Record<
  BedSlotId,
  { label: string; x: number; y: number; z: number }
> = {
  foundation: { label: "Foundation", x: 0.5, y: 0.67, z: 10 },
  main_top: { label: "Main top layer", x: 0.5, y: 0.67, z: 30 },
  throw: { label: "Foot-of-bed throw", x: 0.5, y: 0.82, z: 40 },
  cushion_1: { label: "Rear left cushion", x: 0.37, y: 0.4, z: 60 },
  cushion_2: { label: "Rear right cushion", x: 0.63, y: 0.4, z: 61 },
  cushion_3: { label: "Middle left cushion", x: 0.44, y: 0.48, z: 62 },
  cushion_4: { label: "Middle right cushion", x: 0.57, y: 0.48, z: 63 },
  cushion_5: { label: "Front / lumbar cushion", x: 0.5, y: 0.56, z: 64 },
};
export function normalizeBed(selection: BedSelection): BedSelection {
  const next = structuredClone(selection);
  next.slots = next.slots.map((slot) => ({
    ...slot,
    position: {
      x: BED_POSITIONS[slot.slot_id].x,
      y: BED_POSITIONS[slot.slot_id].y,
      z: BED_POSITIONS[slot.slot_id].z,
    },
  }));
  next.step_intent ??= {
    foundation: next.slots.some(
      (s) => s.slot_id === "foundation" && s.state !== "skipped",
    )
      ? "configured"
      : "skipped",
    top: next.slots.some(
      (s) => ["main_top", "throw"].includes(s.slot_id) && s.state !== "skipped",
    )
      ? "configured"
      : "skipped",
    cushions: next.slots.some(
      (s) => s.slot_id.startsWith("cushion_") && s.state !== "skipped",
    )
      ? "configured"
      : "skipped",
  };
  return next;
}
export function newBed(
  bedSizeId = "us-queen",
  confirmed = false,
): BedSelection {
  const selection = normalizeBed(emptyBedSelection(bedSizeId));
  selection.fit_confirmed = confirmed;
  selection.step_intent = { foundation: "open", top: "open", cushions: "open" };
  return selection;
}
export function stepSlots(step: number) {
  return (Object.keys(BED_POSITIONS) as BedSlotId[]).filter((id) =>
    step === 0
      ? id === "foundation"
      : step === 1
        ? ["main_top", "throw"].includes(id)
        : id.startsWith("cushion_"),
  );
}
export function slotRoles(id: BedSlotId): Product["product_role"][] {
  return id === "foundation"
    ? ["sheet_set", "fitted_sheet"]
    : id === "main_top"
      ? ["duvet_cover", "blanket"]
      : id === "throw"
        ? ["throw"]
        : ["cushion_cover"];
}
export function fitsBed(
  state: CommerceState,
  variant: SellableVariant,
  bedId: string,
) {
  const size = state.sizes.find((s) => s.id === variant.size_id);
  const bed = state.sizes.find((s) => s.id === bedId);
  const product = state.products.find((p) => p.id === variant.product_id);
  if (
    !bed ||
    !size ||
    !product ||
    size.market !== bed.market ||
    !variant.compatible_bed_size_ids.includes(bedId)
  )
    return false;
  if (["sheet_set", "fitted_sheet"].includes(product.product_role))
    return (
      !!size.pocket_depth_mm &&
      Math.abs(size.width_mm - bed.width_mm) <=
        size.measurement_tolerance.plus_minus_mm &&
      Math.abs(size.length_mm - bed.length_mm) <=
        size.measurement_tolerance.plus_minus_mm
    );
  if (["duvet_cover", "blanket"].includes(product.product_role))
    return size.width_mm >= bed.width_mm && size.length_mm >= bed.length_mm;
  return true;
}
export function bedItems(state: CommerceState, selection: BedSelection) {
  return selection.slots
    .filter((s) => s.state !== "skipped" && (s.variant_id || s.pending_options))
    .map((slot) => {
      const variant = state.variants.find((v) => v.id === slot.variant_id);
      return {
        slot,
        variant,
        product: state.products.find(
          (p) =>
            p.id === (variant?.product_id ?? slot.pending_options?.product_id),
        ),
        color: state.colors.find(
          (c) => c.id === (variant?.color_id ?? slot.pending_options?.color_id),
        ),
        size: state.sizes.find(
          (s) => s.id === (variant?.size_id ?? slot.pending_options?.size_id),
        ),
        insert: state.variants.find(
          (v) =>
            v.id ===
            selection.insert_links.find((i) => i.slot_id === slot.slot_id)
              ?.variant_id,
        ),
      };
    });
}
export function setBedSlot(
  selection: BedSelection,
  id: BedSlotId,
  variantId: string | null,
  state: CommerceState,
): BedSelection {
  const next = structuredClone(selection);
  const slot = next.slots.find((s) => s.slot_id === id)!;
  slot.variant_id = variantId;
  slot.state = variantId ? "selected" : "skipped";
  delete slot.pending_options;
  const variant = state.variants.find((v) => v.id === variantId);
  slot.source_label = state.products.find(
    (p) => p.id === variant?.product_id,
  )?.title;
  next.insert_links = next.insert_links.filter(
    (i) =>
      i.slot_id !== id ||
      !!variant?.compatible_insert_variant_ids.includes(i.variant_id),
  );
  const step =
    id === "foundation"
      ? "foundation"
      : id.startsWith("cushion_")
        ? "cushions"
        : "top";
  if (next.step_intent)
    next.step_intent[step] = next.slots.some(
      (s) =>
        (step === "foundation"
          ? s.slot_id === "foundation"
          : step === "top"
            ? ["main_top", "throw"].includes(s.slot_id)
            : s.slot_id.startsWith("cushion_")) && s.state !== "skipped",
    )
      ? "configured"
      : "skipped";
  return next;
}
export function skipBedStep(
  selection: BedSelection,
  step: number,
  state: CommerceState,
) {
  let next = structuredClone(selection);
  for (const id of stepSlots(step)) next = setBedSlot(next, id, null, state);
  if (next.step_intent)
    next.step_intent[
      step === 0 ? "foundation" : step === 1 ? "top" : "cushions"
    ] = "skipped";
  return next;
}
export interface SizeChange {
  slot: BedSlotId;
  message: string;
  kind: "preserved" | "replaced" | "unresolved";
}
export function changeBedSize(
  state: CommerceState,
  selection: BedSelection,
  bedId: string,
  at: string,
) {
  const next = normalizeBed(selection),
    bed = state.sizes.find((s) => s.id === bedId);
  if (!bed || bed.product_role !== "mattress")
    throw new Error("Choose a configured mattress size.");
  next.bed_size_id = bedId;
  next.market = bed.market;
  next.fit_confirmed = true;
  const changes: SizeChange[] = [];
  for (const slot of next.slots) {
    if (slot.pending_options && slot.state === "unresolved") {
      slot.pending_options.size_id = null;
      changes.push({
        slot: slot.slot_id,
        kind: "unresolved",
        message:
          "Product and any named color are retained. Confirm dimensions for the new mattress size.",
      });
    }
    if (!slot.variant_id || slot.state === "skipped") continue;
    const old = state.variants.find((v) => v.id === slot.variant_id);
    const product = state.products.find((p) => p.id === old?.product_id);
    if (
      old &&
      old.active &&
      product?.status === "published" &&
      fitsBed(state, old, bedId)
    ) {
      slot.state = "selected";
      changes.push({
        slot: slot.slot_id,
        kind: "preserved",
        message: "Exact SKU and named color retained.",
      });
      continue;
    }
    const equivalent =
      old &&
      state.variants.filter(
        (v) =>
          v.active &&
          v.product_id === old.product_id &&
          v.color_id === old.color_id &&
          v.weave === old.weave &&
          canonicalJSON(v.fibers) === canonicalJSON(old.fibers) &&
          product?.status === "published" &&
          fitsBed(state, v, bedId),
      );
    if (equivalent && equivalent.length === 1) {
      const replacement = equivalent[0],
        size = state.sizes.find((s) => s.id === replacement.size_id)!;
      slot.variant_id = replacement.id;
      slot.state = "selected";
      changes.push({
        slot: slot.slot_id,
        kind: "replaced",
        message: `Same product, fabric and color → ${dimensions(size)}. ${formatMoney(priceOf(old!, at))} → ${formatMoney(priceOf(replacement, at))}. Review this price change.`,
      });
      const link = next.insert_links.find((i) => i.slot_id === slot.slot_id);
      if (
        link &&
        !replacement.compatible_insert_variant_ids.includes(link.variant_id)
      ) {
        const original = state.variants.find((v) => v.id === link.variant_id);
        const options = state.variants.filter(
          (v) =>
            replacement.compatible_insert_variant_ids.includes(v.id) &&
            v.active &&
            v.product_id === original?.product_id &&
            v.color_id === original.color_id &&
            v.weave === original.weave &&
            canonicalJSON(v.fibers) === canonicalJSON(original.fibers),
        );
        if (options.length === 1) {
          link.variant_id = options[0].id;
          changes.push({
            slot: slot.slot_id,
            kind: "replaced",
            message: `Attached insert also changes size: ${formatMoney(priceOf(original!, at))} → ${formatMoney(priceOf(options[0], at))}.`,
          });
        } else {
          slot.state = "unresolved";
          changes.push({
            slot: slot.slot_id,
            kind: "unresolved",
            message:
              "The original insert has no unique verified equivalent. It remains listed; choose a compatible insert or explicitly remove it.",
          });
        }
      }
    } else {
      slot.state = "unresolved";
      changes.push({
        slot: slot.slot_id,
        kind: "unresolved",
        message:
          "No unique equivalent in the same fabric and color. Original selection retained for review; choose a compatible size or remove it.",
      });
    }
  }
  return { selection: next, changes };
}
export function resolveBedEntry(
  state: CommerceState,
  params: Pick<URLSearchParams, "get">,
) {
  const kinds = ["bundle", "look", "recipe", "sku", "order"] as const;
  const requested = kinds.filter((k) => params.get(k));
  if (requested.length > 1)
    return {
      selection: normalizeBed(state.builder_selection),
      name: "Your bed look",
      error:
        "This link contains conflicting entry contexts. Choose one recipe, SKU, look or cart bundle.",
      source: "Saved device draft",
    };
  const kind = requested[0],
    value = kind && params.get(kind);
  const bundle =
    kind === "bundle"
      ? state.cart.bundles.find((b) => b.id === value)
      : undefined;
  const look =
    kind === "look"
      ? state.saved_looks.find(
          (l) =>
            l.id === value && l.owner_id === state.profile.id && !l.deleted_at,
        )
      : undefined;
  const recipe =
    kind === "recipe" ? state.recipes.find((r) => r.id === value) : undefined;
  const sku =
    kind === "sku"
      ? state.variants.find((v) => v.id === value || v.sku === value)
      : undefined;
  const order =
    kind === "order"
      ? state.orders.find(
          (o) => o.id === value && o.owner_id === state.profile.id,
        )
      : undefined;
  if (kind && !(bundle || look || recipe || sku || order))
    return {
      selection: normalizeBed(state.builder_selection),
      name: "Your bed look",
      error:
        "This linked composition is unavailable on this device. Your existing draft is preserved.",
      source: "Unavailable entry",
    };
  let selection = normalizeBed(
    bundle?.selection ??
      look?.selection ??
      recipe?.selection ??
      (order
        ? purchasedBedSelection(
            order,
            state.variants.find(
              (v) =>
                v.id ===
                order.quote_snapshot.lines.find((l) =>
                  ["sheet_set", "fitted_sheet"].includes(l.product_role),
                )?.variant_id,
            )?.compatible_bed_size_ids[0],
          )
        : undefined) ??
      state.builder_selection,
  );
  if (
    !kind &&
    selection.fit_confirmed === undefined &&
    !selection.slots.some((s) => s.variant_id)
  )
    selection = newBed(selection.bed_size_id);
  if (kind) selection.fit_confirmed = selection.fit_confirmed ?? true;
  if (sku) {
    const product = state.products.find((p) => p.id === sku.product_id);
    const id = (Object.keys(BED_POSITIONS) as BedSlotId[]).find((s) =>
      slotRoles(s).includes(product!.product_role),
    );
    if (!id)
      return {
        selection,
        name: "Your bed look",
        error:
          "An insert needs its compatible cover. Choose the cover first; no unrelated SKU was substituted.",
        source: "Unsupported standalone insert",
      };
    const bed = state.sizes.find(
      (s) => s.id === sku.compatible_bed_size_ids[0],
    );
    selection = newBed(bed?.id);
    selection.market = bed?.market ?? selection.market;
    selection = setBedSlot(selection, id, sku.id, state);
    selection.fit_confirmed = sku.compatible_bed_size_ids.length === 1;
  }
  return {
    selection,
    name:
      bundle?.name ??
      look?.name ??
      recipe?.name ??
      (order ? `Purchased bed · ${order.reference}` : "Your bed look"),
    error: "",
    source: bundle
      ? "Editing cart bundle"
      : look
        ? "Saved bed look"
        : recipe
          ? "Shop this bed recipe"
          : sku
            ? "Exact product SKU"
            : order
              ? "Purchased bed draft"
              : "Device draft",
    bundle,
    look,
  };
}
export function purchasedBedSelection(
  order: OrderProjection,
  bedSizeId = "us-queen",
): BedSelection {
  if (order.bundle_snapshots?.[0])
    return structuredClone(order.bundle_snapshots[0].selection);
  const selection = emptyBedSelection(bedSizeId);
  for (const line of order.quote_snapshot.lines) {
    if (["pillow_insert", "duvet_insert"].includes(line.product_role)) continue;
    const units =
      line.product_role === "cushion_cover" ? Math.min(5, line.quantity) : 1;
    for (let i = 0; i < units; i++) {
      const slot = selection.slots.find(
        (s) =>
          s.state === "skipped" &&
          slotRoles(s.slot_id).includes(line.product_role),
      );
      if (slot) {
        slot.variant_id = line.variant_id;
        slot.state = "selected";
        slot.source_label = line.title;
      }
    }
  }
  selection.selection_revision = 1;
  return selection;
}
export function quoteContextKey(state: CommerceState, at: string) {
  return canonicalJSON({
    products: state.products,
    variants: state.variants,
    inventory: state.inventory,
    sizes: state.sizes,
    colors: state.colors,
    policy: state.bundle_policy,
    promos: state.promos,
    markets: state.markets,
    promo: state.cart.promo_code,
    destination: state.cart.destination,
    currency: state.cart.currency,
    windows: state.variants.map((v) => priceOf(v, at).amount_minor),
    policyActive:
      Date.parse(at) >= Date.parse(state.bundle_policy.starts_at) &&
      (!state.bundle_policy.ends_at ||
        Date.parse(at) < Date.parse(state.bundle_policy.ends_at)),
  });
}
