import { Suspense } from "react";
import ProductDetails from "@/components/product/ProductDetails";
import PageLoading from "@/components/ui/PageLoading";
import { createSeedState } from "@/lib/seed-data";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = createSeedState().products.find((p) => p.slug === slug);
  return {
    title: product?.seo?.title ?? product?.title ?? "Bedding product",
    description: product?.seo?.description ?? product?.description,
  };
}
export function generateStaticParams() {
  return createSeedState().products.map((p) => ({ slug: p.slug }));
}
async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetails slug={slug} />;
}
export default function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProductRoute {...props} />
    </Suspense>
  );
}
