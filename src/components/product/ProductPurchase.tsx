"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import {
  dimensions,
  formatMoney,
  priceOf,
  stockOf,
  variantImage,
  variantsOf,
} from "@/lib/storefront";
import type { Product, SellableVariant } from "@/types/commerce";
import { ColorSwatches } from "./ColorSwatches";
import { StoreImage } from "../ui/StoreImage";

export function ProductPurchase({
  product,
  initialColor,
  compact = false,
  wishlistEntryId,
  onVariantChange,
}: {
  product: Product;
  initialColor?: string;
  compact?: boolean;
  wishlistEntryId?: string;
  onVariantChange?: (variant: SellableVariant | null) => void;
}) {
  const commerce = useCommerce(),
    ui = useStorefront(),
    action = useCommerceAction();
  const variants = variantsOf(commerce.state, product.id),
    colors = commerce.state.colors.filter((c) =>
      variants.some((v) => v.color_id === c.id),
    );
  const [selectedColor, setColor] = useState(
    initialColor ?? colors[0]?.id ?? "",
  );
  const colorId = colors.some((c) => c.id === selectedColor)
    ? selectedColor
    : colors[0]?.id;
  const sizeIds = [...new Set(variants.map((v) => v.size_id))];
  const [sizeId, setSize] = useState(sizeIds.length === 1 ? sizeIds[0] : ""),
    [quantity, setQuantity] = useState(1);
  const variant =
    variants.find((v) => v.color_id === colorId && v.size_id === sizeId) ??
    null;
  const previewVariant =
      variant ?? variants.find((v) => v.color_id === colorId),
    color = colors.find((c) => c.id === colorId);
  const image = variantImage(product, previewVariant),
    size = commerce.state.sizes.find((s) => s.id === sizeId);
  const price = previewVariant ? priceOf(previewVariant, commerce.clock) : null;
  const stock = variant ? stockOf(commerce.state, variant) : 0;
  const ready =
    commerce.persistence === "ready" && product.status === "published";
  const updateColor = (next: string) => {
    setColor(next);
    const nextVariant =
      variants.find((v) => v.color_id === next && v.size_id === sizeId) ?? null;
    if (!nextVariant && sizeId) setSize("");
    onVariantChange?.(
      nextVariant ?? variants.find((v) => v.color_id === next) ?? null,
    );
  };
  return (
    <div className="space-y-5">
      {compact && (
        <>
          <StoreImage
            key={`${image.url}-${colorId}`}
            src={image.url}
            alt={image.alt}
            className="aspect-[4/3] rounded-card"
            sizes="480px"
          />
          <p className="text-xs text-ink-muted">
            Editorial reference; selected variants are described below.
          </p>
          <h3 className="font-serif text-3xl">{product.title}</h3>
        </>
      )}
      {price && (
        <p className="price text-2xl font-semibold">
          {variant ? "" : "From "}
          {formatMoney(price)}{" "}
          {variant?.sale && price.amount_minor < variant.price.amount_minor && (
            <span className="ml-2 text-base font-normal text-ink-muted line-through">
              {formatMoney(variant.price)}
            </span>
          )}
        </p>
      )}
      <p className="text-sm leading-6 text-ink-muted">{product.description}</p>
      <div className="notice">
        <strong className="text-ink">
          {product.product_role.endsWith("cover")
            ? "Cover only — insert sold separately."
            : product.product_role === "sheet_set"
              ? "One stocked sheet set. Sleeping pillowcases included; pillows and decorative cushions excluded."
              : product.product_role === "fitted_sheet"
                ? "Fitted sheet only. No flat sheet or pillowcases."
                : "One separate sale unit at the dimensions you select."}
        </strong>
      </div>
      <div>
        <p className="field-label">Color: {color?.name}</p>
        <ColorSwatches
          colors={colors}
          selected={colorId ?? ""}
          onChange={updateColor}
          availability={(id) =>
            variants.some(
              (v) => v.color_id === id && stockOf(commerce.state, v) > 0,
            )
          }
        />
        <p className="mt-2 text-xs text-ink-muted">
          Screen colors may vary. Editorial imagery does not show exact fixture
          colors.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label
            className="field-label"
            htmlFor={`size-${product.id}-${compact}`}
          >
            Regional size & actual dimensions
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() => ui.setOverlay({ kind: "sizes" })}
          >
            Size guide
          </button>
        </div>
        <select
          id={`size-${product.id}-${compact}`}
          className="field"
          value={sizeId}
          onChange={(event) => {
            setSize(event.target.value);
            onVariantChange?.(
              variants.find(
                (v) =>
                  v.color_id === colorId && v.size_id === event.target.value,
              ) ?? null,
            );
          }}
        >
          <option value="">Choose a size</option>
          {sizeIds.map((id) => {
            const s = commerce.state.sizes.find((s) => s.id === id)!;
            const option = variants.find(
              (v) => v.size_id === id && v.color_id === colorId,
            );
            return (
              <option key={id} value={id} disabled={!option}>
                {s.label} · {s.display_inches.width} × {s.display_inches.length}{" "}
                in
                {!option
                  ? " · unavailable in this color"
                  : stockOf(commerce.state, option) === 0
                    ? " · out of stock"
                    : ""}
              </option>
            );
          })}
        </select>
        {size && (
          <p className="mt-2 text-sm text-ink-muted">
            {dimensions(size)}
            <br />
            Tolerance ±{size.measurement_tolerance.plus_minus_mm} mm. Check your
            actual mattress and cover dimensions.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="w-24">
          <span className="field-label">Quantity</span>
          <input
            type="number"
            className="field"
            value={quantity}
            min={1}
            max={99}
            step={1}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <p className="pb-3 text-sm" role="status">
          {!variant
            ? "Choose size to check availability"
            : stock > 0
              ? "Available in QA inventory"
              : "Out of stock — keep or change your selection"}
        </p>
      </div>
      <button
        className="button-primary w-full"
        type="button"
        disabled={
          !ready ||
          action.pending ||
          !variant ||
          stock < quantity ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > 99
        }
        onClick={() => {
          if (!variant) return;
          void action
            .run(
              wishlistEntryId
                ? {
                    type: "wishlist.move",
                    entry_id: wishlistEntryId,
                    variant_id: variant.id,
                    expected_cart_revision: commerce.state.cart.revision,
                  }
                : { type: "cart.add_item", variant_id: variant.id, quantity },
              wishlistEntryId
                ? "Moved to cart. Undo is available in your cart for 10 seconds."
                : "Added to your cart",
            )
            .then((result) => {
              if (result) ui.setOverlay({ kind: "cart" });
            });
        }}
      >
        {action.pending
          ? "Adding…"
          : !variant
            ? "Choose size to add"
            : wishlistEntryId
              ? "Move to cart"
              : "Add to cart"}
      </button>
      <ActionError message={action.error} />
      <div className="flex flex-wrap justify-between gap-2">
        {variant ? (
          <Link
            href={`/create-your-bed?sku=${encodeURIComponent(variant.id)}`}
            className="text-link"
            onClick={() => ui.setOverlay(null)}
          >
            Build around this
          </Link>
        ) : (
          <p className="py-3 text-sm text-ink-muted">
            Choose a size to build around this.
          </p>
        )}
        {compact && (
          <Link
            className="text-link"
            href={`/products/${product.slug}?color=${colorId}`}
            onClick={() => ui.setOverlay(null)}
          >
            View full details
          </Link>
        )}
      </div>
      <p className="text-xs leading-5 text-ink-muted">
        QA catalog and care facts. No real payment or delivery. Review actual
        contents and supplier care instructions before commercial use.
      </p>
    </div>
  );
}
