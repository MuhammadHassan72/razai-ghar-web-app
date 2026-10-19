import { Suspense } from "react";
import { notFound } from "next/navigation";
import CatalogView from "@/components/catalog/CatalogView";
import { CATEGORIES } from "@/lib/storefront";
import PageLoading from "@/components/ui/PageLoading";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return {
    title:
      CATEGORIES.find((c) => c.slug === category)?.label ?? "Bedding category",
  };
}
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}
async function Category({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!CATEGORIES.some((c) => c.slug === category)) notFound();
  return <CatalogView categorySlug={category} />;
}
export default function CategoryPage(props: {
  params: Promise<{ category: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Category {...props} />
    </Suspense>
  );
}
