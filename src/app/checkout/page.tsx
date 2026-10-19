import type { Metadata } from "next";
import Checkout from "@/components/checkout/Checkout";
import { BRAND } from "@/lib/brand";
export const metadata: Metadata = {
  title: "Checkout",
  description: `Review your bedding and delivery details at ${BRAND.name}.`,
};
export default function CheckoutPage() {
  return <Checkout />;
}
