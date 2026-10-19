"use client";
import { useState } from "react";
import Link from "next/link";
import type {
  BedSelection,
  BedSlotId,
  CommerceState,
  Product,
} from "@/types/commerce";
import {
  BED_POSITIONS,
  fitsBed,
  setBedSlot,
  slotRoles,
} from "@/lib/bed-builder";
import {
  dimensions,
  formatMoney,
  priceOf,
  stockOf,
  variantImage,
} from "@/lib/storefront";
import { ColorSwatches } from "../product/ColorSwatches";
import { StoreImage } from "../ui/StoreImage";

const GUIDANCE = [
  { label: "Egyptian cotton", fiber: "Egyptian Cotton", weave: "" },
  { label: "French linen", fiber: "French Linen", weave: "" },
  { label: "Crisp percale", fiber: "", weave: "Percale" },
  { label: "Smooth sateen", fiber: "", weave: "Sateen" },
];
export function SlotSelector({
  state,
  selection,
  slotId,
  at,
  onChange,
  onTexture,
}: {
  state: CommerceState;
  selection: BedSelection;
  slotId: BedSlotId;
  at: string;
  onChange: (s: BedSelection) => void;
  onTexture: (id: BedSlotId) => void;
}) {
  const slot = selection.slots.find((s) => s.slot_id === slotId)!,
    chosen = state.variants.find((v) => v.id === slot.variant_id);
  const [roleFilter, setRoleFilter] = useState(""),
    [guidance, setGuidance] = useState(""),
    [insertChoice, setInsertChoice] = useState("");
  const productId =
      slot.pending_options?.product_id ?? chosen?.product_id ?? "",
    product = state.products.find((p) => p.id === productId);
  const colorId = slot.pending_options?.color_id ?? chosen?.color_id ?? "",
    sizeId = slot.pending_options?.size_id ?? chosen?.size_id ?? "";
  const allowed = state.variants.filter(
    (v) =>
      v.active &&
      fitsBed(state, v, selection.bed_size_id) &&
      state.products.some(
        (p) =>
          p.id === v.product_id &&
          p.status === "published" &&
          slotRoles(slotId).includes(p.product_role),
      ),
  );
  const guided = GUIDANCE.find((g) => g.label === guidance);
  const families = state.products.filter(
    (p) =>
      allowed.some((v) => v.product_id === p.id) &&
      (!roleFilter ||
        p.product_role === roleFilter ||
        p.weave === roleFilter ||
        p.construction === roleFilter) &&
      (!guided ||
        ((!guided.fiber || p.fibers.some((f) => f.fiber === guided.fiber)) &&
          (!guided.weave || p.weave === guided.weave))),
  );
  const variants = allowed.filter((v) => v.product_id === productId),
    colors = state.colors.filter((c) =>
      variants.some((v) => v.color_id === c.id),
    ),
    sizes = state.sizes.filter((s) => variants.some((v) => v.size_id === s.id));
  const linked = selection.insert_links.find((i) => i.slot_id === slotId),
    currentInsert = state.variants.find((v) => v.id === linked?.variant_id);
  const inserts =
    chosen?.compatible_insert_variant_ids.flatMap((id) => {
      const v = state.variants.find((v) => v.id === id),
        size = state.sizes.find((s) => s.id === v?.size_id),
        cover = state.sizes.find((s) => s.id === chosen.size_id);
      return v?.active &&
        size &&
        cover &&
        size.width_mm === cover.width_mm &&
        size.length_mm === cover.length_mm &&
        state.products.some(
          (p) => p.id === v.product_id && p.status === "published",
        )
        ? [v]
        : [];
    }) ?? [];
  const offered =
    inserts.find((v) => v.id === (linked?.variant_id ?? insertChoice)) ??
    inserts[0];
  function options(
    familyId: string,
    color: string | null,
    size: string | null,
  ) {
    const family = state.products.find((p) => p.id === familyId),
      familyVariants = allowed.filter((v) => v.product_id === familyId);
    const colorIds = [...new Set(familyVariants.map((v) => v.color_id))],
      sizeIds = [
        ...new Set(
          familyVariants
            .filter((v) => !color || v.color_id === color)
            .map((v) => v.size_id),
        ),
      ];
    const nextColor = color ?? (colorIds.length === 1 ? colorIds[0] : null),
      nextSize = size ?? (sizeIds.length === 1 ? sizeIds[0] : null);
    const exact = familyVariants.find(
      (v) => v.color_id === nextColor && v.size_id === nextSize,
    );
    if (exact) {
      onChange(setBedSlot(selection, slotId, exact.id, state));
      return;
    }
    const next = structuredClone(selection),
      target = next.slots.find((s) => s.slot_id === slotId)!;
    target.state = "unresolved";
    target.variant_id = null;
    target.source_label = family?.title;
    target.pending_options = {
      product_id: familyId,
      color_id: nextColor,
      size_id: nextSize,
    };
    if (next.step_intent)
      next.step_intent[
        slotId === "foundation"
          ? "foundation"
          : slotId.startsWith("cushion_")
            ? "cushions"
            : "top"
      ] = "configured";
    next.insert_links = next.insert_links.filter((i) => i.slot_id !== slotId);
    onChange(next);
  }
  const selectedSize = state.sizes.find((s) => s.id === sizeId),
    selectedColor = state.colors.find((c) => c.id === colorId);
  function addInsert(include: boolean) {
    if (include && !offered) return;
    const next = structuredClone(selection);
    next.insert_links = next.insert_links.filter((i) => i.slot_id !== slotId);
    if (include && offered)
      next.insert_links.push({
        slot_id: slotId,
        variant_id: offered.id,
        quantity: 1,
      });
    const target = next.slots.find((s) => s.slot_id === slotId)!;
    if (chosen && fitsBed(state, chosen, selection.bed_size_id))
      target.state = "selected";
    onChange(next);
  }
  const roleLabels: Partial<Record<Product["product_role"], string>> = {
    sheet_set: "Sheet set",
    fitted_sheet: "Fitted sheet only",
    duvet_cover: "Duvet cover",
    blanket: "Blanket",
  };
  return (
    <section
      className="rounded-card border border-divider bg-surface p-4 sm:p-5"
      aria-labelledby={`builder-slot-${slotId}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h3
          id={`builder-slot-${slotId}`}
          tabIndex={-1}
          className="font-serif text-2xl outline-none focus-visible:outline-2 focus-visible:outline-focus"
        >
          {BED_POSITIONS[slotId].label}
        </h3>
        <button
          type="button"
          className="text-link text-xs"
          onClick={() => onChange(setBedSlot(selection, slotId, null, state))}
        >
          {slotId === "throw"
            ? "None / remove throw"
            : "Remove / explicitly skip"}
        </button>
      </div>
      {slot.state === "unresolved" && slot.variant_id && (
        <p className="form-error mb-4">
          The original choice is retained for inspection. Choose a compatible
          option below or explicitly remove it.
        </p>
      )}
      <fieldset
        disabled={!selection.fit_confirmed}
        className="min-w-0 space-y-5 disabled:opacity-60"
      >
        <legend className="sr-only">
          Choose {BED_POSITIONS[slotId].label}
        </legend>
        {!selection.fit_confirmed && (
          <p className="notice">
            Confirm your market and actual mattress size first.
          </p>
        )}
        {slotId !== "throw" && !slotId.startsWith("cushion_") && (
          <label className="block">
            <span className="field-label">
              {slotId === "foundation"
                ? "Foundation type"
                : "Top type / construction"}
            </span>
            <select
              className="field"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All compatible types</option>
              {slotRoles(slotId).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
              {slotId === "main_top" &&
                ["Chunky Knit", "Sherpa Fleece", "Waffle", "weighted"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {v === "weighted" ? "Weighted blanket" : v}
                    </option>
                  ),
                )}
            </select>
          </label>
        )}
        {slotId === "foundation" && (
          <div>
            <p className="field-label">Guided fiber & weave choices</p>
            <div className="flex flex-wrap gap-2">
              {GUIDANCE.map((g) => (
                <button
                  type="button"
                  key={g.label}
                  aria-pressed={guidance === g.label}
                  className={`builder-chip ${guidance === g.label ? "is-selected" : ""}`}
                  onClick={() =>
                    setGuidance(guidance === g.label ? "" : g.label)
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Fiber and weave are separate attributes. These shortcuts filter
              options without replacing a selected item.
            </p>
          </div>
        )}
        <label className="block">
          <span className="field-label">
            {slotId === "throw" ? "Optional throw" : "Product"}
          </span>
          <select
            className="field"
            value={productId}
            onChange={(e) => {
              if (e.target.value) options(e.target.value, null, null);
            }}
          >
            <option value="">
              {slotId === "throw"
                ? "None selected — choose a throw if wanted"
                : "Choose a product"}
            </option>
            {product && !families.some((p) => p.id === product.id) && (
              <option value={product.id}>
                {product.title} · retained selection
              </option>
            )}
            {families.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        {!families.length && (
          <p className="notice">
            No compatible products match these filters.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setRoleFilter("");
                setGuidance("");
              }}
            >
              Clear filters
            </button>
          </p>
        )}
        {product && (
          <>
            <div className="flex gap-3">
              <StoreImage
                src={variantImage(product, chosen).url}
                alt={variantImage(product, chosen).alt}
                className="aspect-square w-20 shrink-0 rounded-control"
                sizes="80px"
              />
              <div className="min-w-0 text-xs leading-5">
                <p className="font-medium">
                  {product.fibers
                    .map((f) => `${f.percentage}% ${f.fiber}`)
                    .join(", ")}{" "}
                  · {product.weave}
                </p>
                <p>
                  {product.gsm !== null
                    ? `${product.gsm} g/m²${product.construction === "weighted" ? " shell" : ""}`
                    : ""}
                  {product.thread_count
                    ? ` · ${product.thread_count.value} threads/in²`
                    : ""}
                </p>
                <p className="text-ink-muted">
                  Editorial reference; not exact variant photography.
                </p>
                <Link href={`/products/${product.slug}`} className="text-link">
                  Product facts
                </Link>
              </div>
            </div>
            <div>
              <p className="field-label">
                Color: {selectedColor?.name ?? "Choose a named color"}
              </p>
              <ColorSwatches
                colors={colors}
                selected={colorId}
                onChange={(id) =>
                  options(
                    productId,
                    id,
                    sizes.some((s) => s.id === sizeId) ? sizeId : null,
                  )
                }
                availability={(id) =>
                  variants.some(
                    (v) => v.color_id === id && stockOf(state, v) > 0,
                  )
                }
              />
              {colorId && !colors.some((c) => c.id === colorId) && (
                <p className="form-error">
                  The original color is unavailable. No replacement color has
                  been selected.
                </p>
              )}
            </div>
            <label className="block">
              <span className="field-label">
                {slotId.startsWith("cushion_")
                  ? "Actual cushion dimensions"
                  : "Regional size & actual dimensions"}
              </span>
              <select
                className="field"
                value={sizeId}
                onChange={(e) =>
                  options(productId, colorId || null, e.target.value || null)
                }
              >
                <option value="">Choose dimensions</option>
                {selectedSize &&
                  !sizes.some((s) => s.id === selectedSize.id) && (
                    <option value={selectedSize.id} disabled>
                      {selectedSize.label} · incompatible saved size
                    </option>
                  )}
                {sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {dimensions(s)}
                  </option>
                ))}
              </select>
            </label>
            {selectedSize && (
              <p className="text-xs leading-5 text-ink-muted">
                {dimensions(selectedSize)} · tolerance ±
                {selectedSize.measurement_tolerance.plus_minus_mm} mm.{" "}
                {selectedSize.measurement_tolerance.basis}
              </p>
            )}
            {chosen && slot.state === "selected" && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="price text-lg font-semibold">
                  {formatMoney(priceOf(chosen, at))}
                </p>
                <p
                  className={`text-xs ${stockOf(state, chosen) > 0 ? "text-success" : "text-danger"}`}
                >
                  {stockOf(state, chosen) > 0
                    ? "Available in QA inventory"
                    : "Out of stock · selection retained"}
                </p>
              </div>
            )}
            {product.product_role === "sheet_set" ||
            product.product_role === "fitted_sheet" ? (
              <div className="notice">
                <strong>
                  One stocked{" "}
                  {product.product_role === "sheet_set"
                    ? "sheet set"
                    : "fitted sheet"}
                  .
                </strong>
                <ul className="mt-2 list-inside list-disc">
                  {product.contents.map((c) => (
                    <li key={c.name}>
                      {c.quantity} × {c.name} · {c.note}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  Sleeping pillows and inserts{" "}
                  {product.insert_included
                    ? "follow the included-parts record"
                    : "are excluded"}
                  . The set is charged once.
                </p>
              </div>
            ) : product.product_role.endsWith("cover") ? (
              <p className="notice">
                Cover only. A compatible insert is a separate, explicitly
                selected sale unit.
              </p>
            ) : null}
            {slotId === "throw" && (
              <p className="notice">
                One foot-of-bed accent. Its actual dimensions determine
                coverage; it is not sold as a main bed-covering layer and does
                not create an additional discount group.
              </p>
            )}
            {product.construction === "weighted" && (
              <div className="notice">
                <strong>
                  Total blanket weight: {product.total_weight_kg} kg.
                </strong>
                <p className="mt-2">
                  GSM describes shell fabric only. Weight is fixed for this SKU;
                  this builder does not prescribe a body-weight ratio or make
                  therapeutic claims.
                </p>
                <p className="mt-2">
                  Care & usage limits: {product.care.limitations}.{" "}
                  {product.care.drying}. Supplier usage evidence is synthetic in
                  this QA catalog; confirm approved instructions before real
                  use.
                </p>
              </div>
            )}
            {chosen && chosen.compatible_insert_variant_ids.length > 0 && (
              <div className="rounded-control border border-divider p-3">
                {inserts.length > 1 && (
                  <label>
                    <span className="field-label">
                      Compatible insert choice · not added until checked
                    </span>
                    <select
                      className="field"
                      value={offered?.id ?? ""}
                      onChange={(e) => {
                        setInsertChoice(e.target.value);
                        if (linked) {
                          const next = structuredClone(selection);
                          next.insert_links = next.insert_links.map((i) =>
                            i.slot_id === slotId
                              ? { ...i, variant_id: e.target.value }
                              : i,
                          );
                          next.slots.find((s) => s.slot_id === slotId)!.state =
                            "selected";
                          onChange(next);
                        }
                      }}
                    >
                      {inserts.map((v) => (
                        <option key={v.id} value={v.id}>
                          {
                            state.products.find((p) => p.id === v.product_id)
                              ?.title
                          }{" "}
                          · {formatMoney(priceOf(v, at))}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="filter-option items-start">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!linked}
                    disabled={!offered && !linked}
                    onChange={(e) => addInsert(e.target.checked)}
                  />
                  <span>
                    {offered
                      ? `Add ${state.products.find((p) => p.id === offered.product_id)?.title} · +${formatMoney(priceOf(offered, at))}`
                      : "Remove unavailable saved insert"}
                    <span className="mt-1 block text-xs text-ink-muted">
                      {offered &&
                      state.sizes.find((s) => s.id === offered.size_id)
                        ? dimensions(
                            state.sizes.find((s) => s.id === offered.size_id)!,
                          )
                        : "No purchasable compatible insert"}
                      . Separately priced and stocked.
                    </span>
                  </span>
                </label>
                {linked && !inserts.some((v) => v.id === linked.variant_id) && (
                  <p className="form-error">
                    The saved insert {currentInsert?.sku ?? linked.variant_id}{" "}
                    is no longer compatible. Choose an offered insert or uncheck
                    it; purchase remains blocked.
                  </p>
                )}
                {linked &&
                  currentInsert &&
                  stockOf(state, currentInsert) === 0 && (
                    <p className="form-error">
                      The selected insert is out of stock. Remove or explicitly
                      replace it.
                    </p>
                  )}
              </div>
            )}
            {chosen && (
              <button
                type="button"
                className="text-link"
                onClick={() => onTexture(slotId)}
              >
                Inspect {chosen.weave.toLowerCase()} & material facts
              </button>
            )}
          </>
        )}
        {slot.state === "unresolved" && !slot.variant_id && (
          <p className="text-xs text-warning">
            Choose the required color and dimensions, or explicitly skip this
            position.
          </p>
        )}
      </fieldset>
    </section>
  );
}
