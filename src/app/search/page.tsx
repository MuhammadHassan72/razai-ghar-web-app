import { Suspense } from "react";
import type { Metadata } from "next";
import CatalogView from "@/components/catalog/CatalogView";
import PageLoading from "@/components/ui/PageLoading";
export const metadata: Metadata = { title: "Search bedding" };
export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CatalogView search />
    </Suspense>
  );
}
