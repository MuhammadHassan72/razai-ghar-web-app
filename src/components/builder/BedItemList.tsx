"use client";
import Link from "next/link";
import { useCommerce } from "@/context/CommerceContext";
import type { BedSelection, BedSlotId, CommerceState } from "@/types/commerce";
import { BED_POSITIONS, bedItems } from "@/lib/bed-builder";
import { dimensions, formatMoney, priceOf } from "@/lib/storefront";

export function BedItemList({
  state,
  selection,
  onEdit,
  compact = false,
}: {
  state: CommerceState;
  selection: BedSelection;
  onEdit?: (slot: BedSlotId) => void;
  compact?: boolean;
}) {
  const { clock } = useCommerce();
  const items = bedItems(state, selection);
  return (
    <div>
      {!items.length ? (
        <p className="text-sm text-ink-muted">
          No merchandise selected. Empty and explicitly skipped positions are
          not charged.
        </p>
      ) : (
        <ol
          className={compact ? "space-y-3" : "space-y-5"}
          aria-label="Selected bed items and dimensions"
        >
          {items.map(({ slot, variant, product, color, size, insert }) => (
            <li
              key={slot.slot_id}
              className="border-b border-divider pb-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-ink-muted">
                    {BED_POSITIONS[slot.slot_id].label}
                  </p>
                  <p className="mt-1 font-medium">
                    1 ×{" "}
                    {product?.title ??
                      slot.source_label ??
                      "Unavailable saved item"}
                  </p>
                </div>
                {onEdit && (
                  <button
                    type="button"
                    className="text-link shrink-0"
                    onClick={() => onEdit(slot.slot_id)}
                    aria-label={`Edit ${BED_POSITIONS[slot.slot_id].label}`}
                  >
                    Edit
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {color?.name ?? "Original color unavailable"} ·{" "}
                {variant?.fibers
                  .map((f) => `${f.percentage}% ${f.fiber}`)
                  .join(", ")}{" "}
                · {variant?.weave}
                <br />
                {size ? dimensions(size) : "Original dimensions unavailable"}
              </p>
              {variant && (
                <p className="price mt-1 text-sm">
                  {formatMoney(priceOf(variant, clock))} ·{" "}
                  {product?.product_role.endsWith("cover")
                    ? insert
                      ? "Cover + separate insert below"
                      : "Cover only; insert excluded"
                    : "One stocked sale unit"}
                </p>
              )}
              {product?.product_role === "sheet_set" && (
                <p className="mt-1 text-xs leading-5">
                  Includes{" "}
                  {product.contents
                    .map((c) => `${c.quantity} ${c.name.toLowerCase()}`)
                    .join(", ")}
                  . Sleeping pillows/inserts are{" "}
                  {product.insert_included
                    ? "included as specified"
                    : "excluded"}
                  .
                </p>
              )}
              {insert && (
                <p className="mt-2 text-xs leading-5">
                  + 1 ×{" "}
                  {state.products.find((p) => p.id === insert.product_id)
                    ?.title ?? "Saved insert"}{" "}
                  ·{" "}
                  {state.sizes.find((s) => s.id === insert.size_id)
                    ? dimensions(
                        state.sizes.find((s) => s.id === insert.size_id)!,
                      )
                    : "Dimensions unavailable"}{" "}
                  · {formatMoney(priceOf(insert, clock))}
                </p>
              )}
              {slot.slot_id === "throw" && (
                <p className="mt-1 text-xs text-ink-muted">
                  Foot-of-bed accent; not a full-bed substitute.
                </p>
              )}
              {slot.state === "unresolved" && (
                <p className="form-error">
                  Choose a compatible option or remove this position. It cannot
                  be purchased as shown.
                </p>
              )}
              {!compact && product && (
                <Link
                  className="text-link mt-1"
                  href={`/products/${product.slug}`}
                >
                  Product facts & care
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        Layer preview unavailable for exact QA variants: the stage is
        illustrative. Editorial references and this exact item list remain
        available. Only the listed sale units enter your cart.
      </p>
    </div>
  );
}
