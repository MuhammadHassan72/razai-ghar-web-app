"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useCommerce } from "@/context/CommerceContext";
import { CATEGORIES, FILTER_KEYS, filterCatalog } from "@/lib/storefront";
import { Dialog } from "../ui/Dialog";
import ProductCard from "../product/ProductCard";

export default function CatalogView({
  categorySlug,
  search = false,
}: {
  categorySlug?: string;
  search?: boolean;
}) {
  const commerce = useCommerce(),
    params = useSearchParams(),
    path = usePathname(),
    router = useRouter(),
    [mobile, setMobile] = useState(false);
  const category = CATEGORIES.find((c) => c.slug === categorySlug),
    query = params.toString();
  const products = useMemo(
    () =>
      filterCatalog(
        commerce.state,
        new URLSearchParams(query),
        category?.label,
        commerce.clock,
      ),
    [commerce.state, query, category?.label, commerce.clock],
  );
  const base = commerce.state.products.filter(
    (p) =>
      p.status === "published" && (!category || p.category === category.label),
  );
  function update(key: string, value: string, multi = false) {
    const next = new URLSearchParams(query);
    if (multi) {
      const prior = next.getAll(key);
      next.delete(key);
      (prior.includes(value)
        ? prior.filter((v) => v !== value)
        : [...prior, value]
      ).forEach((v) => next.append(key, v));
    } else {
      next.delete(key);
      if (value) next.set(key, value);
    }
    if (key !== "page") next.delete("page");
    router.push(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  const facetGroups = [
    ...(!category
      ? [
          {
            key: "category",
            title: "Category",
            options: CATEGORIES.map((c) => ({
              value: c.label,
              label: c.label,
            })),
          },
        ]
      : []),
    {
      key: "role",
      title: "Product type",
      options: [...new Set(base.map((p) => p.product_role))].map((v) => ({
        value: v,
        label: v.replaceAll("_", " "),
      })),
    },
    {
      key: "size",
      title: "Regional size & dimensions",
      options: commerce.state.sizes
        .filter((s) =>
          commerce.state.variants.some(
            (v) =>
              v.size_id === s.id && base.some((p) => p.id === v.product_id),
          ),
        )
        .map((s) => ({
          value: s.id,
          label: `${s.label} · ${s.display_inches.width} × ${s.display_inches.length} in`,
        })),
    },
    {
      key: "fiber",
      title: "Fiber",
      options: [
        ...new Set(base.flatMap((p) => p.fibers.map((f) => f.fiber))),
      ].map((v) => ({ value: v, label: v })),
    },
    {
      key: "weave",
      title: "Weave / surface",
      options: [...new Set(base.map((p) => p.weave))].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "construction",
      title: "Construction",
      options: [...new Set(base.map((p) => p.construction))].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "color",
      title: "Color family",
      options: [
        ...new Set(
          commerce.state.colors
            .filter((c) =>
              commerce.state.variants.some(
                (v) =>
                  v.color_id === c.id &&
                  base.some((p) => p.id === v.product_id),
              ),
            )
            .map((c) => c.family),
        ),
      ].map((v) => ({ value: v, label: v })),
    },
    ...(["warmth", "breathability", "softness"] as const)
      .filter((key) => base.some((p) => p.feel[key] !== null))
      .map((key) => ({
        key,
        title: key.charAt(0).toUpperCase() + key.slice(1),
        options: [
          { value: "1-3", label: "1–3 · lower band" },
          { value: "4-6", label: "4–6 · middle band" },
          { value: "7-10", label: "7–10 · higher band" },
        ],
      })),
  ];
  const facets = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Refine your layers</h2>
        <button
          type="button"
          className="text-link text-xs"
          onClick={() => router.push(path, { scroll: false })}
        >
          Clear all
        </button>
      </div>
      {facetGroups.map((facet) => (
        <details
          key={facet.key}
          open={
            facet.key === "category" ||
            facet.key === "fiber" ||
            facet.key === "role"
          }
          className="border-t border-divider pt-4"
        >
          <summary className="min-h-11 cursor-pointer text-sm font-medium">
            {facet.title}
          </summary>
          <div className="max-h-72 overflow-y-auto pr-2">
            {facet.options.map((option) => {
              const comparison = new URLSearchParams(query);
              comparison.delete(facet.key);
              comparison.set(facet.key, option.value);
              const count = filterCatalog(
                commerce.state,
                comparison,
                category?.label,
                commerce.clock,
              ).length;
              return (
                <label className="filter-option" key={option.value}>
                  <input
                    type="checkbox"
                    checked={params.getAll(facet.key).includes(option.value)}
                    onChange={() => update(facet.key, option.value, true)}
                  />
                  <span className="flex-1">{option.label}</span>
                  <span className="text-xs text-ink-muted">{count}</span>
                </label>
              );
            })}
          </div>
        </details>
      ))}
      <details className="border-t border-divider pt-4">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          Price, dimensions & fitted depth
        </summary>
        <div className="space-y-3">
          {[
            { key: "min_price", label: "Minimum price (USD)" },
            { key: "max_price", label: "Maximum price (USD)" },
            { key: "min_width", label: "Minimum width (mm)" },
            { key: "min_length", label: "Minimum length (mm)" },
            { key: "depth", label: "Minimum fitted pocket (mm)" },
          ].map((field) => (
            <label key={`${field.key}-${params.get(field.key)}`}>
              <span className="field-label">{field.label}</span>
              <input
                className="field"
                type="number"
                min={0}
                step={field.key.includes("price") ? "0.01" : "0.1"}
                defaultValue={params.get(field.key) ?? ""}
                onBlur={(event) => {
                  if (
                    event.target.validity.valid &&
                    event.target.value !== (params.get(field.key) ?? "")
                  )
                    update(field.key, event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
          ))}
        </div>
      </details>
      <label className="filter-option border-t border-divider pt-4">
        <input
          type="checkbox"
          checked={params.get("stock") === "1"}
          onChange={(event) => update("stock", event.target.checked ? "1" : "")}
        />
        In stock only
      </label>
      <p className="text-xs leading-5 text-ink-muted">
        Feel bands are relative QA merchandising assessments, not laboratory or
        medical ratings.
      </p>
    </div>
  );
  const chips = [...params.entries()].filter(([key]) =>
    FILTER_KEYS.includes(key),
  );
  const pageCount = Math.max(
    1,
    Math.min(100, Number.parseInt(params.get("page") ?? "1", 10) || 1),
  );
  const nextPage = new URLSearchParams(query);
  nextPage.set("page", String(pageCount + 1));
  return (
    <div className="page-shell py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-7 text-sm text-ink-muted">
        <Link href="/">Home</Link> /{" "}
        {category ? (
          <>
            <Link href="/shop">Bedding</Link> / {category.label}
          </>
        ) : search ? (
          "Search"
        ) : (
          "Bedding"
        )}
      </nav>
      <p className="eyebrow">Made for your everyday</p>
      <h1 className="page-title mt-3">
        {search
          ? params.get("q")
            ? `Results for “${params.get("q")?.slice(0, 160)}”`
            : "Find your kind of comfort"
          : (category?.label ?? "Bedding, thoughtfully layered.")}
      </h1>
      <p className="mt-4 max-w-[65ch] text-ink-muted">
        {category?.description ??
          "Start with a feeling. Narrow it down by fiber, weave, dimensions and the little details that make a bed yours."}
      </p>
      {search && (
        <form className="mt-6 flex max-w-xl gap-3" action="/search">
          <label className="sr-only" htmlFor="catalog-search">
            Search bedding
          </label>
          <input
            id="catalog-search"
            className="field"
            name="q"
            defaultValue={params.get("q") ?? ""}
            maxLength={160}
          />
          <button className="button-primary" type="submit">
            Search
          </button>
        </form>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-divider py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="button-secondary lg:hidden"
            onClick={() => setMobile(true)}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          <p className="text-sm" role="status">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span>Sort by</span>
          <select
            className="min-h-11 rounded-control border border-control-border bg-surface px-3"
            value={params.get("sort") ?? "featured"}
            onChange={(event) => update("sort", event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>
      {chips.length > 0 && (
        <div className="my-5 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map(([key, value], index) => (
            <button
              key={`${key}-${value}-${index}`}
              className="badge min-h-11 gap-2"
              type="button"
              onClick={() => update(key, value, true)}
              aria-label={`Remove ${key.replaceAll("_", " ")} ${value}`}
            >
              {key.replaceAll("_", " ")}:{" "}
              {key === "size"
                ? (commerce.state.sizes.find((s) => s.id === value)?.label ??
                  value)
                : value}
              <X size={13} />
            </button>
          ))}
        </div>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Catalog filters">
          {facets}
        </aside>
        <div>
          {products.length ? (
            <>
              <div className="product-grid">
                {products.slice(0, 24 * pageCount).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {products.length > 24 * pageCount && (
                <div className="mt-10 text-center">
                  <Link
                    className="button-secondary"
                    href={`${path}?${nextPage}`}
                    scroll={false}
                  >
                    Load more products
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-panel bg-surface-soft px-6 py-14 text-center">
              <h2 className="font-serif text-3xl">No layers match just yet.</h2>
              <p className="mt-3 text-sm text-ink-muted">
                Your filters are still here. Remove one above or clear them to
                begin again.
              </p>
              <button
                type="button"
                className="button-secondary mt-6"
                onClick={() => router.push(path)}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={mobile}
        onClose={() => setMobile(false)}
        title="Find your layers"
        drawer
      >
        {facets}
        <button
          type="button"
          className="button-primary mt-6 w-full"
          onClick={() => setMobile(false)}
        >
          Show {products.length} products
        </button>
      </Dialog>
    </div>
  );
}
