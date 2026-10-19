"use client";
import { useCommerce } from "@/context/CommerceContext";
import { useStorefront } from "@/context/StorefrontContext";
import { Dialog } from "../ui/Dialog";
import CartContents from "./CartContents";
export default function CartDrawer() {
  const { cart_count } = useCommerce(),
    ui = useStorefront();
  return (
    <Dialog
      open={ui.overlay?.kind === "cart"}
      onClose={() => ui.setOverlay(null)}
      title={`Your cart · ${cart_count} sale units`}
      drawer
    >
      <CartContents />
    </Dialog>
  );
}
