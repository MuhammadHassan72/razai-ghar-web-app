"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Maximize2, ArrowUpRight } from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import { dimensions, variantsOf, variantImage } from "@/lib/storefront";
import type { Product, SellableVariant } from "@/types/commerce";
import { StoreImage } from "../ui/StoreImage";
import { Dialog } from "../ui/Dialog";
import { ProductPurchase } from "./ProductPurchase";
import ProductCard from "./ProductCard";

export function FeelMeters({ product }: { product: Product }) {
  return (
    <section
      aria-label="Relative feel guide"
      className="rounded-card border border-divider p-5"
    >
      <h2 className="mb-5 text-base font-semibold">Relative feel guide</h2>
      <div className="space-y-5">
        {(["softness", "warmth", "breathability"] as const).map((axis) => {
          const value = product.feel[axis];
          return (
            <div key={axis}>
              <div className="mb-2 flex justify-between text-sm">
                <h3 className="capitalize">{axis}</h3>
                <span>
                  {value === null ? "Not assessed" : `${value} of 10`}
                </span>
              </div>
              {value !== null && (
                <div
                  role="meter"
                  aria-label={axis}
                  aria-valuemin={1}
                  aria-valuemax={10}
                  aria-valuenow={value}
                  className="grid grid-cols-10 gap-1"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className={`h-2 rounded-sm ${i < value ? "bg-primary" : "bg-surface-inset"}`}
                    />
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                {product.feel.notes[axis]}
              </p>
            </div>
          );
        })}
      </div>
      <details className="mt-5 border-t border-divider pt-3">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          How these assessments are made
        </summary>
        <p className="text-sm leading-6 text-ink-muted">
          {product.feel.method}. {product.feel.rubric}
        </p>
        <p className="mt-2 text-xs text-ink-muted">{product.feel.disclosure}</p>
      </details>
    </section>
  );
}
function ContentsDiagram({
  product,
  variant,
}: {
  product: Product;
  variant: SellableVariant | null;
}) {
  const { state } = useCommerce(),
    size = state.sizes.find((s) => s.id === variant?.size_id);
  return (
    <div className="rounded-card bg-surface-soft p-5">
      <h3 className="font-serif text-2xl">What is included</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {product.contents.map((part) => (
          <div
            key={part.name}
            className="flex items-center gap-3 rounded-control border border-divider bg-surface p-4"
          >
            <svg width="48" height="42" viewBox="0 0 48 42" aria-hidden="true">
              <rect
                x="4"
                y="5"
                width="36"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 10h28M9 31h27"
                stroke="currentColor"
                strokeDasharray="2 3"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">
                {part.quantity} × {part.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {part.note}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {size
          ? dimensions(size)
          : "Choose a regional size for exact sale-unit dimensions."}
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Symbolic contents diagram; not a textile photograph or a scale drawing.{" "}
        {product.product_role.endsWith("cover") && "Inserts are not included."}
      </p>
    </div>
  );
}
export default function ProductDetails({ slug }: { slug: string }) {
  const commerce = useCommerce(),
    params = useSearchParams();
  const product = commerce.state.products.find((p) => p.slug === slug);
  const [selectedVariant, setVariant] = useState<SellableVariant | null>(null),
    [gallery, setGallery] = useState("main"),
    [zoom, setZoom] = useState(false),
    [tab, setTab] = useState("fabric");
  if (!product)
    return (
      <div className="page-shell py-20">
        <h1 className="page-title">
          {commerce.hydrated
            ? "This product is unavailable."
            : "Loading your product…"}
        </h1>
        <Link href="/shop" className="text-link mt-5">
          Explore current bedding
        </Link>
      </div>
    );
  const variants = variantsOf(commerce.state, product.id),
    variant = selectedVariant
      ? (variants.find((v) => v.id === selectedVariant.id) ?? null)
      : (variants.find((v) => v.color_id === params.get("color")) ??
        variants[0] ??
        null);
  const media = variantImage(product, variant),
    texture = product.media.find(
      (m) => m.kind === "texture" && m.fidelity === "approved_variant",
    ),
    room = product.media.find((m) => m.kind === "editorial") ?? media;
  const selectedMedia =
    gallery === "room" ? room : gallery === "texture" ? texture : media;
  const compatibleIds = [
    ...new Set(
      variants
        .flatMap((v) => v.compatible_insert_variant_ids)
        .flatMap((id) => {
          const insert = commerce.state.variants.find((v) => v.id === id);
          return insert ? [insert.product_id] : [];
        }),
    ),
  ];
  const compatible = commerce.state.products
    .filter(
      (p) =>
        p.status === "published" &&
        p.id !== product.id &&
        [...product.related_product_ids, ...compatibleIds].includes(p.id),
    )
    .slice(0, 4);
  const tabs = [
    { id: "fabric", label: "About the fabric" },
    { id: "dimensions", label: "Dimensions & contents" },
    { id: "care", label: "Care & delivery" },
  ];
  return (
    <div className="page-shell py-8 pb-28 lg:py-12">
      <title>{`${product.seo?.title ?? product.title} · RAZAI GHAR`}</title>
      <meta
        name="description"
        content={product.seo?.description ?? product.description}
      />
      <nav aria-label="Breadcrumb" className="mb-7 text-sm text-ink-muted">
        <Link href="/">Home</Link> / <Link href="/shop">Bedding</Link> /{" "}
        {product.title}
      </nav>
      {product.status !== "published" && (
        <p role="alert" className="form-error">
          This product is archived or unpublished. Historical information
          remains available, and purchase is disabled.
        </p>
      )}
      <div className="grid items-start gap-7 lg:grid-cols-12 lg:gap-8">
        <section className="min-w-0 lg:col-span-7" aria-label="Product gallery">
          <div className="relative">
            {gallery === "contents" ? (
              <ContentsDiagram product={product} variant={variant} />
            ) : selectedMedia ? (
              <StoreImage
                key={`${selectedMedia.url}-${variant?.color_id}`}
                src={selectedMedia.url}
                alt={selectedMedia.alt}
                className="aspect-[4/5] rounded-panel"
                priority
                sizes="(max-width:1023px) 100vw, 58vw"
              />
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-panel bg-surface-soft p-8 text-center">
                <h2 className="font-serif text-3xl">
                  Fabric detail requires a real photograph.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
                  This QA product has no approved macro texture asset. Its
                  fiber, weave, GSM and care facts are listed below. The
                  editorial bedroom image is not a substitute for exact fabric
                  photography.
                </p>
              </div>
            )}
            {selectedMedia && gallery !== "contents" && (
              <button
                type="button"
                className="icon-button absolute bottom-4 right-4 bg-surface"
                aria-label="Zoom selected image"
                onClick={() => setZoom(true)}
              >
                <Maximize2 size={19} />
              </button>
            )}
          </div>
          <div
            className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
            aria-label="Gallery view"
          >
            {[
              { id: "main", label: "Main image" },
              { id: "room", label: "Room context" },
              { id: "texture", label: "Macro texture" },
              { id: "contents", label: "Contents diagram" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`button-secondary px-2 text-xs ${gallery === option.id ? "border-primary bg-surface-soft" : ""}`}
                aria-pressed={gallery === option.id}
                onClick={() => setGallery(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-ink-muted">
            Editorial QA imagery is a room reference, not an exact product/color
            render. No texture is recolored or invented.
          </p>
          <div className="mt-8 hidden lg:block">
            <FeelMeters product={product} />
          </div>
        </section>
        <section
          className="lg:col-span-5 lg:pl-4"
          id="purchase-options"
          aria-label="Product purchase options"
        >
          <p className="eyebrow mb-3">
            {product.category} · {product.weave}
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight lg:text-[44px]">
            {product.title}
          </h1>
          <div className="mt-5">
            <ProductPurchase
              key={product.id}
              product={product}
              initialColor={params.get("color") ?? undefined}
              onVariantChange={setVariant}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {product.gsm && (
              <span className="badge">{product.gsm} g/m² · QA</span>
            )}
            {product.thread_count && (
              <span className="badge">
                {product.thread_count.value} threads/in² · QA shell/weave
              </span>
            )}
            {product.total_weight_kg && (
              <span className="badge">
                {product.total_weight_kg} kg total weight
              </span>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            {product.fibers
              .map((f) => `${f.percentage}% ${f.fiber}`)
              .join(" · ")}
            . {product.weave} / {product.construction}.
          </p>
          <div className="mt-8 lg:hidden">
            <FeelMeters product={product} />
          </div>
        </section>
      </div>
      <section className="mt-14 border-t border-divider pt-8">
        <div
          role="tablist"
          aria-label="Product information"
          className="flex flex-wrap border-b border-divider"
        >
          {tabs.map((item, index) => (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              className="tab-button"
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight")
                  next = (index + 1) % tabs.length;
                else if (event.key === "ArrowLeft")
                  next = (index + tabs.length - 1) % tabs.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = tabs.length - 1;
                else return;
                event.preventDefault();
                setTab(tabs[next].id);
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          tabIndex={0}
          className="py-8"
        >
          {tab === "fabric" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="section-title">The fabric, in detail.</h2>
                <p className="mt-4 max-w-[65ch] leading-7 text-ink-muted">
                  {product.description}
                </p>
                <Link href="/guides/fabrics" className="text-link mt-4">
                  Understand fiber, weave & construction{" "}
                  <ArrowUpRight size={15} />
                </Link>
              </div>
              <p className="notice">
                {product.facts_evidence.disclosure}
                <br />
                <br />
                Reference: {product.facts_evidence.reference}. Supplier
                approvals and certification evidence are not provided in this QA
                catalog.
              </p>
            </div>
          )}
          {tab === "dimensions" && (
            <>
              <ContentsDiagram product={product} variant={variant} />
              <div
                className="mt-6 overflow-x-auto"
                role="region"
                aria-label="Available product dimensions"
                tabIndex={0}
              >
                <table className="w-full min-w-[480px] text-left text-sm">
                  <caption className="mb-3 text-left font-medium">
                    Available regional dimensions · tolerance shown per size
                  </caption>
                  <thead>
                    <tr>
                      <th className="p-3">Size</th>
                      <th className="p-3">Actual dimensions</th>
                      <th className="p-3">Tolerance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commerce.state.sizes
                      .filter((s) => variants.some((v) => v.size_id === s.id))
                      .map((s) => (
                        <tr key={s.id} className="border-t border-divider">
                          <th className="p-3 font-medium">{s.label}</th>
                          <td className="p-3">{dimensions(s)}</td>
                          <td className="p-3">
                            ±{s.measurement_tolerance.plus_minus_mm} mm
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "care" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="font-serif text-3xl">Make the feeling last.</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {Object.entries({
                    Washing:
                      product.care.wash_celsius === null
                        ? "See specialist cleaning guidance"
                        : `${product.care.wash_celsius}°C`,
                    Drying: product.care.drying,
                    Bleaching: product.care.bleaching,
                    Ironing: product.care.ironing,
                    Limitations: product.care.limitations,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-semibold">{label}</dt>
                      <dd className="mt-1 leading-6 text-ink-muted">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="notice">
                <h3 className="font-semibold text-ink">
                  Delivery & returns in this QA store
                </h3>
                <p className="mt-3">
                  No real delivery, return service or payment is offered. The
                  configured US test method costs $15 below $350 in discounted
                  eligible merchandise and $0 above it. Tax is zero only in the
                  QA policy. A destination is required to confirm these test
                  totals.
                </p>
                <p className="mt-3">
                  Actual care labels, commercial delivery promises and return
                  terms require merchant approval before a live launch.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
      {compatible.length > 0 && (
        <section className="section-space border-t border-divider">
          <p className="eyebrow mb-3">Consider the next layer</p>
          <h2 className="section-title mb-8">Made to go together.</h2>
          <p className="mb-6 max-w-2xl text-sm text-ink-muted">
            Inserts are separately priced. Confirm the exact cover and insert
            dimensions; recommendations do not automatically add anything to
            your cart.
          </p>
          <div className="product-grid">
            {compatible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-divider bg-surface px-4 pt-3 lg:hidden">
        <p className="max-w-[45%] truncate text-sm font-medium">
          {product.title}
        </p>
        <a
          href="#purchase-options"
          className="button-primary"
          onClick={() =>
            document.getElementById(`size-${product.id}-false`)?.focus()
          }
        >
          Choose size & add
        </a>
      </div>
      <Dialog
        open={zoom}
        onClose={() => setZoom(false)}
        title={
          selectedMedia?.kind === "texture"
            ? "Fabric detail"
            : "Editorial image zoom"
        }
        wide
      >
        {selectedMedia && (
          <StoreImage
            src={selectedMedia.url}
            alt={selectedMedia.alt}
            className="aspect-[4/3] rounded-card"
            sizes="960px"
          />
        )}
        <p className="mt-3 text-sm text-ink-muted">
          {selectedMedia?.fidelity === "approved_variant"
            ? "Approved variant image."
            : "Editorial reference. This does not certify an exact product, color or fabric texture."}
        </p>
      </Dialog>
    </div>
  );
}
