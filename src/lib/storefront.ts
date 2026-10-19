import type {
  CommerceState,
  Money,
  Product,
  SellableVariant,
  SizeSpec,
} from "@/types/commerce";

export const CATEGORIES = [
  {
    slug: "sheets",
    label: "Sheets",
    description: "Begin with a foundation that feels right against your skin.",
  },
  {
    slug: "duvet-covers",
    label: "Duvet Covers",
    description:
      "Airy linen and smooth cotton, made for an inviting top layer.",
  },
  {
    slug: "blankets-throws",
    label: "Blankets & Throws",
    description: "Texture, warmth and a little something to pull closer.",
  },
  {
    slug: "cushions",
    label: "Cushions",
    description:
      "The finishing touches, in actual square, Euro and lumbar sizes.",
  },
  {
    slug: "inserts",
    label: "Inserts",
    description: "Separate, dimension-matched inserts for your covers.",
  },
] as const;
export function formatMoney(value: Money, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: value.precision,
    maximumFractionDigits: value.precision,
  }).format(value.amount_minor / 10 ** value.precision);
}
export function priceOf(variant: SellableVariant, at: string): Money {
  return variant.sale &&
    Date.parse(at) >= Date.parse(variant.sale.starts_at) &&
    Date.parse(at) < Date.parse(variant.sale.ends_at)
    ? variant.sale.price
    : variant.price;
}
export function stockOf(state: CommerceState, variant: SellableVariant) {
  const balance = state.inventory.find(
    (i) => i.id === variant.availability.inventory_id,
  );
  return variant.active && balance
    ? Math.max(0, balance.on_hand - balance.reserved)
    : 0;
}
export function variantsOf(state: CommerceState, productId: string) {
  return state.variants.filter((v) => v.product_id === productId && v.active);
}
export function dimensions(
  size: SizeSpec,
  units: "both" | "metric" | "imperial" = "both",
) {
  const mm = `${size.width_mm.toLocaleString("en-US")} × ${size.length_mm.toLocaleString("en-US")} mm`;
  const inches = `${size.display_inches.width} × ${size.display_inches.length} in`;
  const pocket = size.pocket_depth_mm
    ? ` · pocket ${size.pocket_depth_mm} mm / ${size.display_inches.pocket_depth} in`
    : "";
  return `${units === "metric" ? mm : units === "imperial" ? inches : `${inches} / ${mm}`}${pocket}`;
}
export function variantImage(
  product: Product,
  variant?: SellableVariant | null,
) {
  return (
    product.media.find((m) => variant?.media_ids.includes(m.id)) ??
    product.media[0]
  );
}
export const FEEL_LINKS = [
  {
    label: "Light & airy",
    query: "breathability=7-10&warmth=1-4",
    note: "Higher airflow, lighter warmth",
  },
  {
    label: "Crisp & cool",
    query: "weave=Percale&warmth=1-4",
    note: "Matte percale, lighter warmth",
  },
  {
    label: "Soft & draping",
    query: "softness=7-10&drape=1",
    note: "Supple sateen or relaxed linen",
  },
  {
    label: "Warm & cozy",
    query: "warmth=7-10",
    note: "More insulating layers",
  },
];
export const FILTER_KEYS = [
  "category",
  "role",
  "size",
  "min_width",
  "min_length",
  "depth",
  "fiber",
  "weave",
  "construction",
  "color",
  "warmth",
  "breathability",
  "softness",
  "min_price",
  "max_price",
  "stock",
  "drape",
  "q",
];
function within(value: number | null, bands: string[]) {
  return (
    !bands.length ||
    (value !== null &&
      bands.some((band) => {
        const [min, max] = band.split("-").map(Number);
        return (
          Number.isFinite(min) &&
          Number.isFinite(max) &&
          value >= min &&
          value <= max
        );
      }))
  );
}
export function filterCatalog(
  state: CommerceState,
  params: URLSearchParams,
  fixedCategory?: string,
  at = state.updated_at,
) {
  const values = (key: string) => params.getAll(key).filter(Boolean);
  const matches = (key: string, value: string) =>
    !values(key).length || values(key).includes(value);
  const numeric = (key: string) => {
    const raw = params.get(key);
    return raw !== null &&
      raw !== "" &&
      Number.isFinite(Number(raw)) &&
      Number(raw) >= 0
      ? Number(raw)
      : null;
  };
  const q = (params.get("q") ?? "")
    .trim()
    .toLocaleLowerCase("en-US")
    .slice(0, 160);
  const products = state.products.filter((p) => {
    if (
      p.status !== "published" ||
      (fixedCategory && p.category !== fixedCategory) ||
      !matches("category", p.category) ||
      !matches("role", p.product_role) ||
      !matches("weave", p.weave) ||
      !matches("construction", p.construction)
    )
      return false;
    if (
      values("fiber").length &&
      !p.fibers.some((f) => values("fiber").includes(f.fiber))
    )
      return false;
    if (
      !within(p.feel.warmth, values("warmth")) ||
      !within(p.feel.breathability, values("breathability")) ||
      !within(p.feel.softness, values("softness"))
    )
      return false;
    if (
      params.get("drape") === "1" &&
      p.weave !== "Sateen" &&
      !p.fibers.some((f) => f.fiber === "French Linen")
    )
      return false;
    return variantsOf(state, p.id).some((v) => {
      const size = state.sizes.find((s) => s.id === v.size_id)!,
        color = state.colors.find((c) => c.id === v.color_id)!;
      const price = priceOf(v, at).amount_minor / 10 ** v.price.precision;
      const minPrice = numeric("min_price"),
        maxPrice = numeric("max_price"),
        minWidth = numeric("min_width"),
        minLength = numeric("min_length"),
        depth = numeric("depth");
      if (
        !matches("size", size.id) ||
        !matches("color", color.family) ||
        (minPrice !== null && price < minPrice) ||
        (maxPrice !== null && price > maxPrice) ||
        (minWidth !== null && size.width_mm < minWidth) ||
        (minLength !== null && size.length_mm < minLength) ||
        (depth !== null &&
          (!size.pocket_depth_mm || size.pocket_depth_mm < depth))
      )
        return false;
      if (params.get("stock") === "1" && stockOf(state, v) < 1) return false;
      return (
        !q ||
        `${p.title} ${p.description} ${p.category} ${p.product_role.replaceAll("_", " ")} ${p.weave} ${p.fibers.map((f) => f.fiber).join(" ")} ${v.sku} ${color.name} ${size.label}`
          .toLocaleLowerCase("en-US")
          .includes(q)
      );
    });
  });
  const min = (p: Product) =>
    Math.min(
      ...variantsOf(state, p.id).map((v) => priceOf(v, at).amount_minor),
    );
  return products.sort((a, b) =>
    params.get("sort") === "price-low"
      ? min(a) - min(b) || a.id.localeCompare(b.id)
      : params.get("sort") === "price-high"
        ? min(b) - min(a) || a.id.localeCompare(b.id)
        : params.get("sort") === "newest"
          ? b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)
          : a.featured_rank - b.featured_rank || a.id.localeCompare(b.id),
  );
}
