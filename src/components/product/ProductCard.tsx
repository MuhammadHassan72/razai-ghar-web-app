"use client";
import Link from "next/link";
import { Heart, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import {
  formatMoney,
  priceOf,
  stockOf,
  variantImage,
  variantsOf,
} from "@/lib/storefront";
import type { Product } from "@/types/commerce";
import { StoreImage } from "../ui/StoreImage";
import { ColorSwatches } from "./ColorSwatches";

export default function ProductCard({ product }: { product: Product }) {
  const commerce = useCommerce(),
    ui = useStorefront(),
    action = useCommerceAction();
  const variants = variantsOf(commerce.state, product.id),
    colors = commerce.state.colors.filter((c) =>
      variants.some((v) => v.color_id === c.id),
    );
  const [colorId, setColor] = useState(colors[0]?.id ?? "");
  const color = colors.find((c) => c.id === colorId) ?? colors[0];
  const matching = variants.filter((v) => v.color_id === color?.id),
    variant = matching[0];
  if (!variant || !color) return null;
  const prices = matching.map((v) => priceOf(v, commerce.clock).amount_minor),
    minimum = Math.min(...prices),
    price = { ...priceOf(variant, commerce.clock), amount_minor: minimum };
  const image = variantImage(product, variant),
    saved = commerce.state.wishlist.find(
      (w) => w.product_id === product.id && w.variant_id === null,
    );
  const inStock = matching.some((v) => stockOf(commerce.state, v) > 0);
  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          href={`/products/${product.slug}?color=${color.id}`}
          className="block overflow-hidden rounded-card"
          aria-label={`${product.title}, ${color.name}`}
        >
          <StoreImage
            key={`${image.url}-${color.id}`}
            src={image.url}
            alt={image.alt}
            className="aspect-[4/5] transition-transform duration-200 group-hover:scale-[1.015]"
          />
        </Link>
        <button
          type="button"
          className={`icon-button absolute right-2 top-2 bg-surface/95 ${saved ? "text-accent" : ""}`}
          aria-label={`${saved ? "Remove" : "Save"} ${product.title} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={!!saved}
          disabled={action.pending || commerce.persistence !== "ready"}
          onClick={() => {
            void action.run(
              saved
                ? { type: "wishlist.remove", entry_id: saved.id }
                : {
                    type: "wishlist.add",
                    product_id: product.id,
                    variant_id: null,
                  },
              saved ? "Removed from wishlist" : "Saved to your wishlist",
            );
          }}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {!inStock && (
          <span className="badge absolute bottom-3 left-3">Out of stock</span>
        )}
        <span className="absolute bottom-3 right-3 rounded bg-surface/95 px-2 py-1 text-[10px] font-medium uppercase tracking-wider">
          Editorial image
        </span>
      </div>
      <div className="pt-4">
        <p className="eyebrow mb-2">
          {product.fibers[0].fiber} · {product.weave}
        </p>
        <h3 className="text-base font-medium leading-6 lg:text-lg">
          <Link href={`/products/${product.slug}?color=${color.id}`}>
            {product.title}
          </Link>
        </h3>
        <p className="price mt-2 text-base font-semibold">
          {new Set(prices).size > 1 ? "From " : ""}
          {formatMoney(price)}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {product.thread_count
            ? `${product.thread_count.value} TC · QA shell/weave specification`
            : product.gsm
              ? `${product.gsm} g/m² · QA specification`
              : product.category}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2">
          <span className="text-sm text-ink-muted">{color.name}</span>
          <ColorSwatches
            colors={colors}
            selected={color.id}
            onChange={setColor}
            limit={2}
            availability={(id) =>
              variants.some(
                (v) => v.color_id === id && stockOf(commerce.state, v) > 0,
              )
            }
          />
          {colors.length > 2 && (
            <button
              type="button"
              className="text-link text-xs"
              onClick={() =>
                ui.setOverlay({
                  kind: "quick",
                  product_id: product.id,
                  color_id: color.id,
                })
              }
            >
              +{colors.length - 2} colors
            </button>
          )}
        </div>
        <button
          type="button"
          className="text-link w-full justify-between border-t border-divider"
          onClick={() =>
            ui.setOverlay({
              kind: "quick",
              product_id: product.id,
              color_id: color.id,
            })
          }
        >
          Choose options <ArrowUpRight size={16} />
        </button>
        <ActionError message={action.error} />
      </div>
    </article>
  );
}
