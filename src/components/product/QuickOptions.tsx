"use client";
import { useCommerce } from "@/context/CommerceContext";
import { useStorefront } from "@/context/StorefrontContext";
import { Dialog } from "../ui/Dialog";
import { ProductPurchase } from "./ProductPurchase";
export function QuickOptions() {
  const { state } = useCommerce(),
    { overlay, setOverlay } = useStorefront();
  const selection = overlay?.kind === "quick" ? overlay : null,
    product = selection
      ? state.products.find((p) => p.id === selection.product_id)
      : null;
  return (
    <Dialog
      open={!!selection}
      onClose={() => setOverlay(null)}
      title="Choose your options"
      drawer
    >
      {product && selection ? (
        <ProductPurchase
          key={`${product.id}-${selection.color_id}`}
          product={product}
          initialColor={selection.color_id}
          wishlistEntryId={selection.wishlist_entry_id}
          compact
        />
      ) : (
        <p>This product is no longer available. Browse the current catalog.</p>
      )}
    </Dialog>
  );
}
