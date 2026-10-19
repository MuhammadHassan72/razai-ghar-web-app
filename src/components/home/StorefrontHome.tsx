"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Layers,
  Ruler,
  Wind,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { CATEGORIES, FEEL_LINKS, dimensions } from "@/lib/storefront";
import { StoreImage } from "../ui/StoreImage";
import ProductCard from "../product/ProductCard";

export default function StorefrontHome() {
  const commerce = useCommerce(),
    action = useCommerceAction(),
    router = useRouter();
  const [recipeIndex, setRecipeIndex] = useState(0),
    [highlight, setHighlight] = useState("");
  const hero = commerce.banners.find(
    (b) => b.page === "/" && b.placement === "hero",
  );
  const products = commerce.state.products
      .filter(
        (p) =>
          p.status === "published" &&
          (hero?.featured_product_ids
            ? hero.featured_product_ids.includes(p.id)
            : p.featured_rank > 0),
      )
      .sort((a, b) =>
        hero?.featured_product_ids
          ? hero.featured_product_ids.indexOf(a.id) -
            hero.featured_product_ids.indexOf(b.id)
          : a.featured_rank - b.featured_rank,
      ),
    recipe = commerce.state.recipes[recipeIndex] ?? commerce.state.recipes[0];
  const items =
    recipe?.selection.slots
      .filter((s) => s.state === "selected" && s.variant_id)
      .map((slot) => {
        const variant = commerce.state.variants.find(
          (v) => v.id === slot.variant_id,
        );
        return {
          slot,
          variant,
          product: commerce.state.products.find(
            (p) => p.id === variant?.product_id,
          ),
          size: commerce.state.sizes.find((s) => s.id === variant?.size_id),
          color: commerce.state.colors.find((c) => c.id === variant?.color_id),
        };
      }) ?? [];
  return (
    <>
      {hero && (
        <section className="page-shell pt-5 md:pt-7">
          <div className="grid overflow-hidden rounded-panel bg-surface-soft lg:grid-cols-12">
            <div className="relative lg:col-span-7">
              <StoreImage
                key={hero.revision}
                src={hero.desktop_media!.url}
                mobileSrc={hero.mobile_media?.url}
                mobilePosition={`${hero.focal_points.mobile.x * 100}% ${hero.focal_points.mobile.y * 100}%`}
                alt={hero.decorative ? "" : hero.desktop_media!.alt}
                className="aspect-[4/3] h-full lg:aspect-auto lg:min-h-[580px]"
                priority
                sizes="(max-width:1023px) 100vw, 58vw"
                position={`${hero.focal_points.desktop.x * 100}% ${hero.focal_points.desktop.y * 100}%`}
              />
              <span className="absolute bottom-5 left-5 rounded-full bg-surface/95 px-3 py-2 text-[10px] uppercase tracking-widest text-ink-muted">
                Editorial inspiration · styling only
              </span>
            </div>
            <div className="flex flex-col justify-center px-7 py-10 sm:px-10 lg:col-span-5 lg:px-12">
              <p className="eyebrow mb-5">For the way you unwind</p>
              <h1 className="max-w-[11ch] font-serif text-[48px] font-medium leading-[1.02] tracking-[-0.025em] sm:text-[60px] xl:text-[72px]">
                {hero.headline}
              </h1>
              <p className="mt-6 max-w-[32ch] text-base leading-7 text-ink-muted lg:text-lg">
                {hero.supporting_copy}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {hero.primary_cta && (
                  <Link className="button-primary" href={hero.primary_cta.href}>
                    {hero.primary_cta.label} <ArrowUpRight size={17} />
                  </Link>
                )}
                {hero.secondary_cta && (
                  <Link className="text-link" href={hero.secondary_cta.href}>
                    {hero.secondary_cta.label}
                  </Link>
                )}
              </div>
              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 border-t border-divider pt-5 text-xs text-ink-muted">
                <span className="flex items-center gap-2">
                  <Layers size={15} /> Layer by layer
                </span>
                <span className="flex items-center gap-2">
                  <Ruler size={15} /> Fit, made clear
                </span>
                <span className="flex items-center gap-2">
                  <Check size={15} /> Every item, itemized
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
      <section
        className="page-shell py-8 md:py-10"
        aria-label="Shop by relative feel"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="mr-3 font-serif text-2xl">How do you like to feel?</p>
          {FEEL_LINKS.map((feel) => (
            <Link
              key={feel.label}
              href={`/shop?${feel.query}`}
              title={feel.note}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-divider bg-surface px-4 text-sm transition-colors hover:border-primary hover:bg-surface-soft"
            >
              {feel.label}
              <ArrowUpRight size={13} />
            </Link>
          ))}
        </div>
      </section>
      <section className="page-shell section-space border-t border-divider">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Good days begin here</p>
            <h2 className="section-title">Find your everyday layers.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Shop all bedding <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORIES.slice(0, 4).map((category) => {
            const product = products.find((p) => p.category === category.label);
            return product ? (
              <Link
                href={`/shop/${category.slug}`}
                key={category.slug}
                className="group"
              >
                <StoreImage
                  src={product.media[0].url}
                  alt={`${category.label} editorial inspiration`}
                  className="aspect-[4/5] rounded-card"
                />
                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="font-serif text-2xl sm:text-3xl">
                    {category.label}
                  </h3>
                  <ArrowUpRight size={18} />
                </div>
              </Link>
            ) : null;
          })}
        </div>
      </section>
      <section className="bg-surface-soft">
        <div className="page-shell section-space">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">A considered collection</p>
              <h2 className="section-title">The pieces you’ll reach for.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-ink-muted">
              Crisp, softly draping, or richly textured. Start with the feeling,
              then find your fit.
            </p>
          </div>
          <div className="product-grid">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
      {recipe && (
        <section className="page-shell section-space">
          <div className="mb-8">
            <p className="eyebrow mb-3">A little inspiration, made yours</p>
            <h2 className="section-title">Shop this bed.</h2>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {commerce.state.recipes.map((r, index) => (
              <button
                type="button"
                key={r.id}
                className={`badge min-h-11 px-4 ${recipeIndex === index ? "border-primary bg-primary text-on-primary" : ""}`}
                aria-pressed={recipeIndex === index}
                onClick={() => {
                  setRecipeIndex(index);
                  setHighlight("");
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="grid gap-7 lg:grid-cols-12">
            <div className="relative lg:col-span-7">
              <StoreImage
                src={recipe.image.url}
                alt={recipe.image.alt}
                className="aspect-[4/3] rounded-panel"
                sizes="(max-width:1023px) 100vw, 58vw"
              />
              {items.map((item, index) => (
                <button
                  key={item.slot.slot_id}
                  type="button"
                  className={`absolute flex size-11 items-center justify-center rounded-full border-2 border-surface bg-primary font-semibold text-on-primary shadow-float ${highlight === item.slot.slot_id ? "outline-2 outline-offset-4 outline-focus" : ""}`}
                  style={{
                    left: `${[30, 62, 47, 70, 23][index % 5]}%`,
                    top: `${[63, 48, 28, 72, 35][index % 5]}%`,
                  }}
                  aria-label={`Highlight item ${index + 1}: ${item.product?.title ?? "Unavailable option"}`}
                  aria-pressed={highlight === item.slot.slot_id}
                  onClick={() => setHighlight(item.slot.slot_id)}
                >
                  {index + 1}
                </button>
              ))}
              <p className="mt-3 text-xs text-ink-muted">
                Editorial room inspiration. Hotspots correspond to the recipe
                list, not exact pictured SKU photography. Furniture is styling
                only.
              </p>
            </div>
            <div className="flex flex-col justify-center lg:col-span-5 lg:pl-6">
              <h3 className="font-serif text-4xl">{recipe.name}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {recipe.description}
              </p>
              <ol className="mt-5 divide-y divide-divider">
                {items.map((item, index) => (
                  <li
                    key={item.slot.slot_id}
                    className={`flex gap-3 py-4 ${highlight === item.slot.slot_id ? "rounded-control bg-surface-soft px-3" : ""}`}
                  >
                    <button
                      type="button"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-control-border"
                      aria-label={`Highlight item ${index + 1}`}
                      onClick={() => setHighlight(item.slot.slot_id)}
                    >
                      {index + 1}
                    </button>
                    <div>
                      {item.product ? (
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="text-sm font-medium"
                        >
                          {item.product.title}
                        </Link>
                      ) : (
                        <p>Unavailable recipe item</p>
                      )}
                      <p className="mt-1 text-xs text-ink-muted">
                        {item.color?.name} ·{" "}
                        {item.size && dimensions(item.size)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="button-primary mt-5"
                disabled={action.pending || commerce.persistence !== "ready"}
                onClick={() => {
                  void action
                    .run({
                      type: "builder.save",
                      selection: recipe.selection,
                      expected_selection_revision:
                        commerce.state.builder_selection.selection_revision,
                    })
                    .then((result) => {
                      if (result)
                        router.push(`/create-your-bed?recipe=${recipe.id}`);
                    });
                }}
              >
                {action.pending ? "Opening look…" : "Customize this look"}
                <ArrowUpRight size={16} />
              </button>
              <ActionError message={action.error} />
            </div>
          </div>
        </section>
      )}
      <section className="bg-surface">
        <div className="page-shell section-space">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">A feel for the finer things</p>
              <h2 className="section-title">Know what you’re sleeping in.</h2>
            </div>
            <Link href="/guides/fabrics" className="text-link">
              The fabric guide <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Crisp percale",
                label: "The fresh-sheet feeling",
                text: "A matte woven finish with a more structured hand. Explore cotton percale and check each product’s own assessment.",
                query: "weave=Percale",
              },
              {
                title: "Relaxed linen",
                label: "An easy, textured drape",
                text: "French linen describes the fiber and origin, not the weave. These QA pieces use a plain weave and an openly textured hand.",
                query: "fiber=French+Linen",
              },
              {
                title: "Smooth sateen",
                label: "A softer kind of lustre",
                text: "Cotton in a different weave: a smoother surface, a fluid drape, and a gently reflective finish.",
                query: "weave=Sateen",
              },
            ].map((fabric) => (
              <Link
                className="rounded-card border border-divider bg-canvas p-6 md:p-8"
                href={`/shop?${fabric.query}`}
                key={fabric.title}
              >
                <Wind className="mb-6 text-primary" size={27} strokeWidth={1} />
                <p className="eyebrow mb-3">{fabric.label}</p>
                <h3 className="font-serif text-3xl">{fabric.title}</h3>
                <p className="mt-4 text-sm leading-6 text-ink-muted">
                  {fabric.text}
                </p>
                <span className="text-link mt-4">
                  Explore the feeling <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="page-shell py-14 text-center">
        <p className="eyebrow">Customer stories</p>
        <h2 className="mt-3 font-serif text-3xl">
          Room for honest experiences.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink-muted">
          There are no verified customer reviews in this QA catalog.
          Verified-purchase stories and consented photos will appear here when a
          connected review source provides them.
        </p>
        <Link className="text-link mt-4" href="/guides/sizes">
          Start with the facts: fabrics, fit & contents{" "}
          <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}
