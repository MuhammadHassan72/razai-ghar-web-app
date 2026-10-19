import { Suspense } from "react";
import type { Metadata } from "next";
import BedBuilder from "@/components/builder/BedBuilder";
import PageLoading from "@/components/ui/PageLoading";
import { BRAND } from "@/lib/brand";
export const metadata: Metadata = {
  title: "Create your own bed",
  description: `Create your own ${BRAND.name} bed: choose fabrics, verify dimensions, customize five cushion positions and review every bundle price.`,
};
export default function CreateBedPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <BedBuilder />
    </Suspense>
  );
}
