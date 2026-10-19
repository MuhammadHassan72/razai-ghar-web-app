import { Suspense } from "react";
import type { Metadata } from "next";
import CatalogView from "@/components/catalog/CatalogView";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = { title: "Shop bedding" };
export default function ShopPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CatalogView />
    </Suspense>
  );
}
