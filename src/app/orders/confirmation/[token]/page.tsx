import { Suspense } from "react";
import OrderReceipt from "@/components/checkout/OrderReceipt";
import PageLoading from "@/components/ui/PageLoading";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
export const metadata: Metadata = {
  title: "Order receipt",
  description: `Your ${BRAND.name} order receipt and purchased bedding details.`,
};
async function Receipt({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OrderReceipt token={token} />;
}
export default function ConfirmationPage(props: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Receipt {...props} />
    </Suspense>
  );
}
