import type { Metadata } from "next";
import CartContents from "@/components/cart/CartContents";
export const metadata: Metadata = { title: "Your cart" };
export default function CartPage() {
  return (
    <div className="page-shell py-12 lg:py-16">
      <p className="eyebrow">A bed, coming together</p>
      <h1 className="page-title mb-10 mt-3">Your cart</h1>
      <CartContents fullPage />
    </div>
  );
}
