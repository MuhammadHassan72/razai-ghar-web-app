"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { CATEGORIES, label } from "@/lib/backoffice";
import { catalogDraftSchema } from "@/lib/commerce-contracts";
import { formatMoney, dimensions, stockOf } from "@/lib/storefront";
import type {
  CatalogDraft,
  Fiber,
  Product,
  SellableVariant,
  SwatchColor,
  Weave,
} from "@/types/commerce";
import { Check, Field, Panel, Select, TextArea, Time } from "../ui/Panel";
import { Dialog } from "../ui/Dialog";
import { StoreImage } from "../ui/StoreImage";
import { InventoryManager } from "./Operations";
const fibers: Fiber[] = [
  "Egyptian Cotton",
  "French Linen",
  "Organic Cotton",
  "Cotton",
  "Merino Wool",
  "Cashmere",
  "Recycled Polyester",
  "European Down",
  "Feather",
];
const weaves: Weave[] = [
  "Percale",
  "Sateen",
  "Chunky Knit",
  "Sherpa Fleece",
  "Waffle",
  "Plain Weave",
  "Twill",
];
const roles: Product["product_role"][] = [
  "sheet_set",
  "fitted_sheet",
  "duvet_cover",
  "blanket",
  "throw",
  "cushion_cover",
  "pillow_insert",
  "duvet_insert",
];
const tabs = [
  "Overview",
  "Materials & feel",
  "Variants & pricing",
  "Inventory",
  "Media & preview",
  "Care & fit",
  "SEO & publishing",
];
export default function ProductManager({ id }: { id?: string }) {
  const c = useCommerce(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [fiber, setFiber] = useState("all"),
    [page, setPage] = useState(0),
    [template, setTemplate] = useState(c.state.products[0]?.id ?? ""),
    [created, setCreated] = useState<CatalogDraft | null>(null);
  const drafts = c.state.product_drafts,
    combined = [
      ...c.state.products.filter(
        (p) => !drafts.some((d) => d.product.id === p.id),
      ),
      ...drafts.map((d) => d.product),
    ];
  if (id === "new") {
    if (created)
      return <ProductEditor key={created.product.id} source={created} />;
    return (
      <Panel title="Create a product draft">
        <p>
          Start from an existing QA product family, then review every tab before
          publishing. Copied material assessments remain labelled as QA fixture
          data. New variants start with zero stock.
        </p>
        <Select
          label="Template product family"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        >
          {c.state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <button
          className="button-primary"
          disabled={!["administrator", "catalog_editor"].includes(c.role)}
          onClick={() => {
            const p = structuredClone(
              c.state.products.find((p) => p.id === template)!,
            );
            const newId = crypto.randomUUID();
            const variants = c.state.variants
              .filter((v) => v.product_id === p.id)
              .map((v) => ({
                ...structuredClone(v),
                id: crypto.randomUUID(),
                revision: 0,
                product_id: newId,
                sku: `NEW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                availability: {
                  ...v.availability,
                  inventory_id: crypto.randomUUID(),
                },
              }));
            setCreated({
              product: {
                ...p,
                id: newId,
                revision: 0,
                title: "",
                slug: "",
                status: "draft",
                featured_rank: 0,
                created_at: c.clock,
                updated_at: c.clock,
              },
              variants,
            });
          }}
        >
          Create editable draft
        </button>
      </Panel>
    );
  }
  if (id) {
    const draft = drafts.find((d) => d.product.id === id);
    const product = c.state.products.find((p) => p.id === id);
    return draft || product ? (
      <ProductEditor
        key={id}
        source={
          draft ?? {
            product: product!,
            variants: c.state.variants.filter((v) => v.product_id === id),
          }
        }
      />
    ) : (
      <Panel title="Product unavailable">
        <Link className="text-link" href="/admin/products">
          Return to products
        </Link>
      </Panel>
    );
  }
  const rows = combined.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (category === "all" || p.category === category) &&
      (fiber === "all" || p.fibers.some((f) => f.fiber === fiber)) &&
      `${p.title} ${c.state.variants
        .filter((v) => v.product_id === p.id)
        .map((v) => v.sku)
        .join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1));
  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Search title / SKU"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <Select
            label="Publication"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["all", "draft", "published", "archived"].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
          <Select
            label="Fiber"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
          >
            <option value="all">All fibers</option>
            {fibers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
        </div>
        <Link className="button-primary" href="/admin/products/new">
          Create product
        </Link>
      </Panel>
      <div className="overflow-x-auto rounded-control border border-divider">
        <table className="admin-table">
          <thead>
            <tr>
              {[
                "Product / role",
                "State",
                "Variants",
                "Price range",
                "Available units",
                "Modified",
                "Action",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 25, (current + 1) * 25).map((p) => {
              const vs =
                drafts.find((d) => d.product.id === p.id)?.variants ??
                c.state.variants.filter((v) => v.product_id === p.id);
              const amounts = vs.map((v) => v.price.amount_minor);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex min-w-60 gap-3">
                      {p.media[0] && (
                        <StoreImage
                          className="size-14 shrink-0 rounded-control"
                          src={p.media[0].url}
                          alt={p.media[0].alt}
                          sizes="56px"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{p.title}</p>
                        <p className="text-xs text-admin-muted">
                          {p.category} · {label(p.product_role)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.status}
                    {drafts.some((d) => d.product.id === p.id) && (
                      <p className="text-xs text-warning">Draft changes</p>
                    )}
                  </td>
                  <td>{vs.length}</td>
                  <td className="whitespace-nowrap">
                    {vs[0]
                      ? `${formatMoney({ ...vs[0].price, amount_minor: Math.min(...amounts) })} – ${formatMoney({ ...vs[0].price, amount_minor: Math.max(...amounts) })}`
                      : "No variants"}
                  </td>
                  <td>{vs.reduce((sum, v) => sum + stockOf(c.state, v), 0)}</td>
                  <td className="text-xs">
                    <Time at={p.updated_at} />
                  </td>
                  <td>
                    <Link
                      className="text-link min-h-11 inline-flex items-center"
                      href={`/admin/products/${p.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="bg-admin-surface p-8">No matching products.</p>
        )}
      </div>
      <div className="flex justify-between">
        <button
          className="button-secondary"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <p className="content-center text-sm">
          {rows.length} products · page {current + 1}
        </p>
        <button
          className="button-secondary"
          disabled={(current + 1) * 25 >= rows.length}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
function ProductEditor({ source }: { source: CatalogDraft }) {
  const c = useCommerce(),
    router = useRouter(),
    action = useCommerceAction(),
    [draft, setDraft] = useState(() => structuredClone(source)),
    [tab, setTab] = useState(0),
    [dirty, setDirty] = useState(false),
    [issues, setIssues] = useState<string[]>([]),
    [variantId, setVariantId] = useState(source.variants[0]?.id ?? ""),
    [swatch, setSwatch] = useState(false),
    [preview, setPreview] = useState(false),
    [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const p = draft.product,
    v = draft.variants.find((v) => v.id === variantId),
    canEdit = ["administrator", "catalog_editor"].includes(c.role),
    persisted = c.state.product_drafts.find((d) => d.product.id === p.id),
    live = c.state.products.find((x) => x.id === p.id),
    currentRevision = persisted?.product.revision ?? live?.revision ?? 0,
    conflict = currentRevision !== draft.product.revision;
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (
        a &&
        !window.confirm(
          "Leave this product editor? Unsaved changes will be lost.",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  function product(patch: Partial<Product>) {
    setDraft((d) => ({ ...d, product: { ...d.product, ...patch } }));
    setDirty(true);
  }
  function variant(patch: Partial<SellableVariant>) {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((x) =>
        x.id === variantId ? { ...x, ...patch } : x,
      ),
    }));
    setDirty(true);
  }
  async function save() {
    const next = {
      ...draft,
      variants: draft.variants.map((v) => ({
        ...v,
        fibers: draft.product.fibers,
        weave: draft.product.weave,
      })),
    };
    const parsed = catalogDraftSchema.safeParse(next);
    if (!parsed.success) {
      setIssues(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      );
      setTab(0);
      return;
    }
    setIssues([]);
    const result = await action.run(
      {
        type: "catalog.save_draft",
        draft: parsed.data,
        expected_product_revision: draft.product.revision,
      },
      "Complete product draft saved",
    );
    if (result) {
      setDirty(false);
      if (source.product.revision === 0)
        window.history.replaceState(null, "", `/admin/products/${result.id}`);
      setDraft({
        ...next,
        product: { ...next.product, revision: draft.product.revision + 1 },
      });
    }
  }
  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-control border border-divider bg-admin-surface p-4 shadow-soft">
        <div>
          <h2 className="text-lg font-semibold">
            {p.title || "New product draft"}
          </h2>
          <p className="text-xs text-admin-muted">
            {dirty ? "Unsaved changes" : "Saved revision"} · r
            {draft.product.revision} · {p.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="button-secondary"
            onClick={() => {
              const parsed = catalogDraftSchema.safeParse({
                ...draft,
                variants: draft.variants.map((v) => ({
                  ...v,
                  fibers: p.fibers,
                  weave: p.weave,
                })),
              });
              if (parsed.success) setPreview(true);
              else
                setIssues(
                  parsed.error.issues.map(
                    (i) => `${i.path.join(".")}: ${i.message}`,
                  ),
                );
            }}
          >
            Preview
          </button>
          <button
            className="button-secondary"
            disabled={!canEdit || action.pending || conflict}
            onClick={() => void save()}
          >
            Save draft
          </button>
          <button
            className="button-primary"
            disabled={
              !canEdit || dirty || !persisted || action.pending || conflict
            }
            onClick={() =>
              void action
                .run(
                  {
                    type: "catalog.publish",
                    product_id: p.id,
                    expected_product_revision: persisted!.product.revision,
                    reason: "Staff reviewed all seven product tabs",
                  },
                  "Product published across Storefront and Builder",
                )
                .then((result) => {
                  if (result) {
                    setDraft((d) => ({
                      ...d,
                      product: {
                        ...d.product,
                        status: "published",
                        revision: persisted!.product.revision + 1,
                      },
                    }));
                    setDirty(false);
                  }
                })
            }
          >
            Publish
          </button>
        </div>
      </div>
      {conflict && (
        <Panel title="This product changed">
          <p>
            The latest revision is {currentRevision}. Your draft is based on{" "}
            {draft.product.revision}. Reload before saving, or create a new
            product to keep a separate copy.
          </p>
          <button
            className="button-secondary"
            onClick={() => {
              setDirty(false);
              setDraft(structuredClone(source));
              setIssues([]);
            }}
          >
            Reload latest
          </button>
        </Panel>
      )}
      <ActionError message={action.error} />
      {issues.length > 0 && (
        <div
          className="rounded-control bg-danger-soft p-4 text-danger"
          role="alert"
        >
          <p className="font-semibold">
            Complete these fields across the editor tabs:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Product editor"
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            id={`product-tab-${i}`}
            aria-controls={`product-panel-${i}`}
            role="tab"
            aria-selected={i === tab}
            tabIndex={i === tab ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 6
                      : (tab + (e.key === "ArrowRight" ? 1 : 6)) % 7;
                setTab(next);
                document.getElementById(`product-tab-${next}`)?.focus();
              }
            }}
            className={`min-h-11 rounded-control border px-4 text-sm ${tab === i ? "border-admin-nav bg-admin-nav text-admin-on-nav" : "border-divider bg-admin-surface"}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`product-panel-${tab}`}
        aria-labelledby={`product-tab-${tab}`}
      >
        <fieldset disabled={!canEdit || action.pending} className="min-w-0">
          <Panel title={tabs[tab]}>
            {tab === 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Product title"
                    required
                    maxLength={160}
                    value={p.title}
                    onChange={(e) => product({ title: e.target.value })}
                  />
                  <Field
                    label="URL slug"
                    required
                    value={p.slug}
                    onChange={(e) => product({ slug: e.target.value })}
                  />
                  <Select
                    label="Category"
                    value={p.category}
                    onChange={(e) =>
                      product({
                        category: e.target.value as Product["category"],
                      })
                    }
                  >
                    {CATEGORIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                  <Select
                    label="Sellable product role"
                    value={p.product_role}
                    onChange={(e) =>
                      product({
                        product_role: e.target.value as Product["product_role"],
                      })
                    }
                  >
                    {roles.map((x) => (
                      <option value={x} key={x}>
                        {label(x)}
                      </option>
                    ))}
                  </Select>
                </div>
                <TextArea
                  label="Product description"
                  value={p.description}
                  onChange={(value) => product({ description: value })}
                />
                <Check
                  checked={p.insert_included}
                  onChange={(value) => product({ insert_included: value })}
                >
                  Insert included in the sale unit
                </Check>
                <fieldset className="space-y-3">
                  <legend className="field-label">Exact included parts</legend>
                  {p.contents.map((part, i) => (
                    <div
                      key={i}
                      className="grid gap-3 rounded-control border border-divider p-3 sm:grid-cols-[1fr_80px_1fr_auto]"
                    >
                      <Field
                        label="Part name"
                        value={part.name}
                        onChange={(e) =>
                          product({
                            contents: p.contents.map((x, n) =>
                              n === i ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Quantity"
                        type="number"
                        min="1"
                        max="99"
                        value={part.quantity}
                        onChange={(e) =>
                          product({
                            contents: p.contents.map((x, n) =>
                              n === i
                                ? { ...x, quantity: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Disclosure"
                        value={part.note}
                        onChange={(e) =>
                          product({
                            contents: p.contents.map((x, n) =>
                              n === i ? { ...x, note: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        className="text-link min-h-11 text-danger"
                        onClick={() =>
                          product({
                            contents: p.contents.filter((_, n) => n !== i),
                          })
                        }
                      >
                        Remove part
                      </button>
                    </div>
                  ))}
                  <button
                    className="button-secondary"
                    onClick={() =>
                      product({
                        contents: [
                          ...p.contents,
                          { name: "", quantity: 1, note: "" },
                        ],
                      })
                    }
                  >
                    Add included part
                  </button>
                </fieldset>
              </>
            ) : tab === 1 ? (
              <>
                <h3 className="font-semibold">
                  Fiber composition · total{" "}
                  {p.fibers.reduce((n, f) => n + f.percentage, 0)}%
                </h3>
                {p.fibers.map((f, i) => (
                  <div
                    className="grid gap-3 rounded-control border border-divider p-3 sm:grid-cols-2"
                    key={i}
                  >
                    <Select
                      label="Fiber"
                      value={f.fiber}
                      onChange={(e) =>
                        product({
                          fibers: p.fibers.map((x, n) =>
                            n === i
                              ? { ...x, fiber: e.target.value as Fiber }
                              : x,
                          ),
                        })
                      }
                    >
                      {fibers.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </Select>
                    <Field
                      label="Composition %"
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={f.percentage}
                      onChange={(e) =>
                        product({
                          fibers: p.fibers.map((x, n) =>
                            n === i
                              ? { ...x, percentage: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Origin (optional)"
                      value={f.origin ?? ""}
                      onChange={(e) =>
                        product({
                          fibers: p.fibers.map((x, n) =>
                            n === i ? { ...x, origin: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Evidence reference"
                      value={f.evidence_reference}
                      onChange={(e) =>
                        product({
                          fibers: p.fibers.map((x, n) =>
                            n === i
                              ? { ...x, evidence_reference: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="text-link min-h-11 text-danger"
                      onClick={() =>
                        product({ fibers: p.fibers.filter((_, n) => n !== i) })
                      }
                    >
                      Remove fiber
                    </button>
                  </div>
                ))}
                <button
                  className="button-secondary"
                  onClick={() =>
                    product({
                      fibers: [
                        ...p.fibers,
                        {
                          fiber: "Cotton",
                          percentage: 0,
                          evidence_reference: "",
                        },
                      ],
                    })
                  }
                >
                  Add fiber
                </button>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Weave"
                    value={p.weave}
                    onChange={(e) =>
                      product({ weave: e.target.value as Weave })
                    }
                  >
                    {weaves.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                  <Select
                    label="Construction"
                    value={p.construction}
                    onChange={(e) =>
                      product({
                        construction: e.target.value as Product["construction"],
                        thread_count: [
                          "knitted",
                          "fleece",
                          "weighted",
                        ].includes(e.target.value)
                          ? null
                          : p.thread_count,
                      })
                    }
                  >
                    {["woven", "knitted", "fleece", "quilted", "weighted"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </Select>
                  <Field
                    label="GSM · blank means not assessed"
                    type="number"
                    min="1"
                    max="5000"
                    value={p.gsm ?? ""}
                    onChange={(e) =>
                      product({
                        gsm: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  {["woven", "quilted"].includes(p.construction) && (
                    <Field
                      label="Threads per square inch · optional"
                      type="number"
                      min="50"
                      max="1500"
                      value={p.thread_count?.value ?? ""}
                      onChange={(e) =>
                        product({
                          thread_count: e.target.value
                            ? {
                                value: Number(e.target.value),
                                basis: "threads_per_square_inch",
                              }
                            : null,
                        })
                      }
                    />
                  )}
                  {p.construction === "weighted" && (
                    <Field
                      label="Total blanket mass (kg)"
                      type="number"
                      min="0.1"
                      max="30"
                      step="0.1"
                      value={p.total_weight_kg ?? ""}
                      onChange={(e) =>
                        product({
                          total_weight_kg: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  )}
                </div>
                {(["softness", "warmth", "breathability"] as const).map(
                  (axis) => (
                    <div className="space-y-2" key={axis}>
                      <label className="field-label" htmlFor={`feel-${axis}`}>
                        {label(axis)} · {p.feel[axis] ?? "Not assessed"} / 10
                      </label>
                      <input
                        id={`feel-${axis}`}
                        className="w-full accent-primary"
                        type="range"
                        min="1"
                        max="10"
                        value={p.feel[axis] ?? 5}
                        onChange={(e) =>
                          product({
                            feel: { ...p.feel, [axis]: Number(e.target.value) },
                          })
                        }
                      />
                      <Check
                        checked={p.feel[axis] === null}
                        onChange={(value) =>
                          product({
                            feel: { ...p.feel, [axis]: value ? null : 5 },
                          })
                        }
                      >
                        Not assessed
                      </Check>
                      <TextArea
                        label={`${label(axis)} assessor notes`}
                        value={p.feel.notes[axis]}
                        onChange={(value) =>
                          product({
                            feel: {
                              ...p.feel,
                              notes: { ...p.feel.notes, [axis]: value },
                            },
                          })
                        }
                      />
                    </div>
                  ),
                )}
                <TextArea
                  label="Assessment method"
                  value={p.feel.method}
                  onChange={(value) =>
                    product({ feel: { ...p.feel, method: value } })
                  }
                />
                <TextArea
                  label="Rubric"
                  value={p.feel.rubric}
                  onChange={(value) =>
                    product({ feel: { ...p.feel, rubric: value } })
                  }
                />
                <Field
                  label="Assessment date (UTC)"
                  type="date"
                  value={p.feel.assessed_at.slice(0, 10)}
                  onChange={(e) =>
                    e.target.value &&
                    product({
                      feel: {
                        ...p.feel,
                        assessed_at: `${e.target.value}T00:00:00.000Z`,
                      },
                    })
                  }
                />
                <Field
                  label="Assessment evidence"
                  value={p.feel.evidence_reference}
                  onChange={(e) =>
                    product({
                      feel: { ...p.feel, evidence_reference: e.target.value },
                    })
                  }
                />
                <TextArea
                  label="Assessment disclosure"
                  value={p.feel.disclosure}
                  onChange={(value) =>
                    product({ feel: { ...p.feel, disclosure: value } })
                  }
                />
                <Field
                  label="Technical facts evidence reference"
                  value={p.facts_evidence.reference}
                  onChange={(e) =>
                    product({
                      facts_evidence: {
                        ...p.facts_evidence,
                        reference: e.target.value,
                      },
                    })
                  }
                />
                <TextArea
                  label="Technical facts disclosure · QA-only"
                  value={p.facts_evidence.disclosure}
                  onChange={(value) =>
                    product({
                      facts_evidence: {
                        ...p.facts_evidence,
                        disclosure: value,
                      },
                    })
                  }
                />
              </>
            ) : tab === 2 ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="button-secondary"
                    onClick={() => {
                      const template = draft.variants[0];
                      if (!template) return;
                      const id = crypto.randomUUID();
                      const next = {
                        ...structuredClone(template),
                        id,
                        revision: 0,
                        sku: `SKU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                        availability: {
                          ...template.availability,
                          inventory_id: crypto.randomUUID(),
                        },
                      };
                      setDraft({
                        ...draft,
                        variants: [...draft.variants, next],
                      });
                      setVariantId(id);
                      setDirty(true);
                    }}
                  >
                    Add variant
                  </button>
                  <button
                    className="button-secondary"
                    onClick={() => setSwatch(true)}
                  >
                    Create named color swatch
                  </button>
                </div>
                <Select
                  label="Variant to edit"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                >
                  {draft.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.sku} ·{" "}
                      {c.state.colors.find((s) => s.id === v.color_id)?.name} ·{" "}
                      {c.state.sizes.find((s) => s.id === v.size_id)?.label}
                    </option>
                  ))}
                </Select>
                {v && (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Unique SKU"
                        value={v.sku}
                        onChange={(e) =>
                          variant({ sku: e.target.value.toUpperCase() })
                        }
                      />
                      <Select
                        label="Named color"
                        value={v.color_id}
                        onChange={(e) => variant({ color_id: e.target.value })}
                      >
                        {c.state.colors.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} · {x.hex}
                          </option>
                        ))}
                      </Select>
                      <Select
                        label="Canonical dimensions & pocket depth"
                        value={v.size_id}
                        onChange={(e) =>
                          variant({
                            size_id: e.target.value,
                            compatible_insert_variant_ids: [],
                          })
                        }
                      >
                        {c.state.sizes
                          .filter((s) => s.product_role === p.product_role)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label} · {dimensions(s)}
                            </option>
                          ))}
                      </Select>
                      <Select
                        label="Sale unit"
                        value={v.sale_uom}
                        onChange={(e) =>
                          variant({
                            sale_uom: e.target
                              .value as SellableVariant["sale_uom"],
                          })
                        }
                      >
                        <option value="each">Each</option>
                        <option value="set">Set</option>
                      </Select>
                      <Field
                        label={`Base price · ${v.price.currency} minor units (precision ${v.price.precision})`}
                        type="number"
                        min="1"
                        step="1"
                        value={v.price.amount_minor}
                        onChange={(e) =>
                          variant({
                            price: {
                              ...v.price,
                              amount_minor: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <p className="font-semibold">
                      Displayed base price: {formatMoney(v.price)}
                    </p>
                    <Check
                      checked={v.active}
                      onChange={(value) => variant({ active: value })}
                    >
                      Enabled variant
                    </Check>
                    <Check
                      checked={v.bundle_eligible}
                      onChange={(value) => variant({ bundle_eligible: value })}
                    >
                      Bundle eligible
                    </Check>
                    <Check
                      checked={v.shipping_eligible}
                      onChange={(value) =>
                        variant({ shipping_eligible: value })
                      }
                    >
                      Counts toward free shipping
                    </Check>
                    <Check
                      checked={!!v.sale}
                      onChange={(value) =>
                        variant({
                          sale: value
                            ? {
                                price: {
                                  ...v.price,
                                  amount_minor: Math.max(
                                    1,
                                    v.price.amount_minor - 100,
                                  ),
                                },
                                reference_price: v.price,
                                starts_at: c.clock,
                                ends_at: "2099-12-31T00:00:00.000Z",
                              }
                            : null,
                        })
                      }
                    >
                      Scheduled sale
                    </Check>
                    {v.sale && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field
                          label="Sale price · minor units"
                          type="number"
                          min="1"
                          max={v.price.amount_minor - 1}
                          value={v.sale.price.amount_minor}
                          onChange={(e) =>
                            variant({
                              sale: {
                                ...v.sale!,
                                price: {
                                  ...v.price,
                                  amount_minor: Number(e.target.value),
                                },
                                reference_price: v.price,
                              },
                            })
                          }
                        />
                        <Field
                          label="Sale starts (UTC)"
                          type="datetime-local"
                          value={v.sale.starts_at.slice(0, 16)}
                          onChange={(e) =>
                            e.target.value &&
                            variant({
                              sale: {
                                ...v.sale!,
                                starts_at: `${e.target.value}:00.000Z`,
                              },
                            })
                          }
                        />
                        <Field
                          label="Sale ends (UTC)"
                          type="datetime-local"
                          value={v.sale.ends_at.slice(0, 16)}
                          onChange={(e) =>
                            e.target.value &&
                            variant({
                              sale: {
                                ...v.sale!,
                                ends_at: `${e.target.value}:00.000Z`,
                              },
                            })
                          }
                        />
                      </div>
                    )}
                    <fieldset>
                      <legend className="field-label">
                        Verified compatible mattress sizes
                      </legend>
                      {c.state.sizes
                        .filter((s) => s.product_role === "mattress")
                        .map((s) => (
                          <Check
                            key={s.id}
                            checked={v.compatible_bed_size_ids.includes(s.id)}
                            onChange={(value) =>
                              variant({
                                compatible_bed_size_ids: value
                                  ? [...v.compatible_bed_size_ids, s.id]
                                  : v.compatible_bed_size_ids.filter(
                                      (x) => x !== s.id,
                                    ),
                              })
                            }
                          >
                            {s.label} · {dimensions(s)}
                          </Check>
                        ))}
                    </fieldset>
                    {["duvet_cover", "cushion_cover"].includes(
                      p.product_role,
                    ) && (
                      <fieldset>
                        <legend className="field-label">
                          Dimension-matched insert SKUs
                        </legend>
                        {c.state.variants
                          .filter((insert) => {
                            const s = c.state.sizes.find(
                                (s) => s.id === insert.size_id,
                              ),
                              cover = c.state.sizes.find(
                                (s) => s.id === v.size_id,
                              );
                            return (
                              s?.product_role ===
                                (p.product_role === "duvet_cover"
                                  ? "duvet_insert"
                                  : "pillow_insert") &&
                              s.width_mm === cover?.width_mm &&
                              s.length_mm === cover.length_mm
                            );
                          })
                          .map((insert) => (
                            <Check
                              key={insert.id}
                              checked={v.compatible_insert_variant_ids.includes(
                                insert.id,
                              )}
                              onChange={(value) =>
                                variant({
                                  compatible_insert_variant_ids: value
                                    ? [
                                        ...v.compatible_insert_variant_ids,
                                        insert.id,
                                      ]
                                    : v.compatible_insert_variant_ids.filter(
                                        (id) => id !== insert.id,
                                      ),
                                })
                              }
                            >
                              {insert.sku}
                            </Check>
                          ))}
                      </fieldset>
                    )}
                    <fieldset>
                      <legend className="field-label">
                        Media assigned to this variant
                      </legend>
                      {p.media.map((m) => (
                        <Check
                          key={m.id}
                          checked={v.media_ids.includes(m.id)}
                          onChange={(value) =>
                            variant({
                              media_ids: value
                                ? [...v.media_ids, m.id]
                                : v.media_ids.filter((id) => id !== m.id),
                            })
                          }
                        >
                          {m.alt}
                        </Check>
                      ))}
                    </fieldset>
                    <button
                      className="text-link min-h-11 text-danger"
                      onClick={() => {
                        if (c.state.variants.some((x) => x.id === v.id)) {
                          variant({ active: false });
                          return;
                        }
                        setDraft({
                          ...draft,
                          variants: draft.variants.filter((x) => x.id !== v.id),
                        });
                        setVariantId(
                          draft.variants.find((x) => x.id !== v.id)?.id ?? "",
                        );
                        setDirty(true);
                      }}
                    >
                      {c.state.variants.some((x) => x.id === v.id)
                        ? "Disable variant · preserve stock identity"
                        : "Remove unpublished variant"}
                    </button>
                  </div>
                )}
              </>
            ) : tab === 3 ? (
              <>
                <p className="text-sm text-admin-muted">
                  Catalog editing never overwrites physical stock balances.
                  Publish new variants first, then reconcile through the
                  inventory workflow with an authorized Inventory Manager role.
                </p>
              </>
            ) : tab === 4 ? (
              <>
                <p className="text-sm text-admin-muted">
                  Use approved Unsplash image URLs. Editorial references remain
                  labelled; product approval requires supplier rights and
                  variant binding.
                </p>
                {p.media.map((m, i) => (
                  <div
                    className="space-y-3 rounded-control border border-divider p-4"
                    key={m.id}
                  >
                    <Field
                      label="Image URL"
                      type="url"
                      value={m.url}
                      onChange={(e) =>
                        product({
                          media: p.media.map((x, n) =>
                            n === i ? { ...x, url: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Descriptive alt text"
                      value={m.alt}
                      onChange={(e) =>
                        product({
                          media: p.media.map((x, n) =>
                            n === i ? { ...x, alt: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Rights / source reference"
                      value={m.rights_reference}
                      onChange={(e) =>
                        product({
                          media: p.media.map((x, n) =>
                            n === i
                              ? { ...x, rights_reference: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Select
                        label="Media kind"
                        value={m.kind}
                        onChange={(e) =>
                          product({
                            media: p.media.map((x, n) =>
                              n === i
                                ? {
                                    ...x,
                                    kind: e.target.value as typeof m.kind,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {["editorial", "product", "texture"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </Select>
                      <Field
                        label="Pixel width"
                        type="number"
                        min="1"
                        value={m.width}
                        onChange={(e) =>
                          product({
                            media: p.media.map((x, n) =>
                              n === i
                                ? { ...x, width: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Pixel height"
                        type="number"
                        min="1"
                        value={m.height}
                        onChange={(e) =>
                          product({
                            media: p.media.map((x, n) =>
                              n === i
                                ? { ...x, height: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      className="text-link min-h-11 text-danger"
                      onClick={() => {
                        product({ media: p.media.filter((_, n) => n !== i) });
                        setDraft((d) => ({
                          ...d,
                          variants: d.variants.map((v) => ({
                            ...v,
                            media_ids: v.media_ids.filter((id) => id !== m.id),
                          })),
                        }));
                      }}
                    >
                      Remove image
                    </button>
                  </div>
                ))}
                <button
                  className="button-secondary"
                  onClick={() =>
                    product({
                      media: [
                        ...p.media,
                        {
                          id: crypto.randomUUID(),
                          url: "",
                          alt: "",
                          width: 1600,
                          height: 1200,
                          kind: "editorial",
                          rights_reference: "",
                          fidelity: "editorial_reference",
                        },
                      ],
                    })
                  }
                >
                  Add media
                </button>
              </>
            ) : tab === 5 ? (
              <>
                <Field
                  label="Wash temperature · °C, blank if not applicable"
                  type="number"
                  min="0"
                  max="95"
                  value={p.care.wash_celsius ?? ""}
                  onChange={(e) =>
                    product({
                      care: {
                        ...p.care,
                        wash_celsius: e.target.value
                          ? Number(e.target.value)
                          : null,
                      },
                    })
                  }
                />
                {(
                  ["drying", "bleaching", "ironing", "limitations"] as const
                ).map((key) => (
                  <TextArea
                    key={key}
                    label={label(key)}
                    value={p.care[key]}
                    onChange={(value) =>
                      product({ care: { ...p.care, [key]: value } })
                    }
                  />
                ))}
                <p className="text-sm text-admin-muted">
                  Fitted pocket depths and actual mm/inch dimensions are
                  selected per variant. Compatibility is checked again by the
                  shared Builder quote engine.
                </p>
              </>
            ) : (
              <>
                <Field
                  label="SEO title · maximum 70 characters"
                  maxLength={70}
                  value={p.seo?.title ?? p.title}
                  onChange={(e) =>
                    product({
                      seo: {
                        title: e.target.value,
                        description:
                          p.seo?.description ?? p.description.slice(0, 180),
                      },
                    })
                  }
                />
                <TextArea
                  label="SEO description · maximum 180 characters"
                  maxLength={180}
                  value={p.seo?.description ?? p.description.slice(0, 180)}
                  onChange={(value) =>
                    product({
                      seo: {
                        title: p.seo?.title ?? p.title,
                        description: value,
                      },
                    })
                  }
                />
                <p className="text-sm">
                  URL: /products/{p.slug} · QA fixture source · Current state:{" "}
                  {p.status}
                </p>
                <p className="text-sm text-admin-muted">
                  Save a complete draft, review Preview, then Publish.
                  Publication updates the Storefront and Builder atomically;
                  existing order snapshots stay unchanged.
                </p>
                {live && (
                  <button
                    className="button-secondary text-danger"
                    onClick={() => setConfirm("archive")}
                  >
                    Archive product
                  </button>
                )}
                {!live && persisted && (
                  <button
                    className="button-secondary text-danger"
                    onClick={() => setConfirm("delete")}
                  >
                    Permanently delete unpublished draft
                  </button>
                )}
                <Link
                  className="text-link min-h-11 inline-flex items-center"
                  href="/admin/products"
                >
                  Return to product manager
                </Link>
              </>
            )}
          </Panel>
        </fieldset>
        {tab === 3 && <InventoryManager productId={p.id} />}
      </div>
      <Dialog
        open={preview}
        wide
        title="Product draft preview"
        onClose={() => setPreview(false)}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {p.media[0]?.url && (
            <StoreImage
              src={p.media[0].url}
              alt={p.media[0].alt}
              className="aspect-[4/3]"
            />
          )}
          <div className="space-y-3">
            <h3 className="font-serif text-3xl">{p.title}</h3>
            <p>{p.description}</p>
            <p>
              {p.fibers.map((f) => `${f.percentage}% ${f.fiber}`).join(", ")} ·{" "}
              {p.weave}
            </p>
            <p>
              {p.insert_included
                ? "Insert included"
                : "Cover products exclude inserts unless selected separately"}
            </p>
            <p className="text-sm">{p.facts_evidence.disclosure}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {draft.variants.map((v) => (
            <li key={v.id}>
              {v.sku} · {c.state.colors.find((s) => s.id === v.color_id)?.name}{" "}
              · {formatMoney(v.price)} ·{" "}
              {c.state.sizes.find((s) => s.id === v.size_id)?.label}
            </li>
          ))}
        </ul>
      </Dialog>
      <Dialog
        open={!!confirm}
        title={
          confirm === "archive"
            ? "Archive product?"
            : "Delete unpublished draft?"
        }
        onClose={() => setConfirm(null)}
      >
        <p>
          {confirm === "archive"
            ? "This product will leave public shopping and Builder choices. Historical order references and stock identities remain intact."
            : "This draft has never been published. Permanently remove its unpublished metadata and variants?"}
        </p>
        <ActionError message={action.error} />
        <button
          className="button-primary mt-5"
          disabled={action.pending}
          onClick={() => {
            const command =
              confirm === "archive"
                ? {
                    type: "catalog.archive" as const,
                    product_id: p.id,
                    expected_product_revision: live!.revision,
                    reason: "Archived by catalog staff after impact review",
                  }
                : {
                    type: "catalog.delete_draft" as const,
                    product_id: p.id,
                    expected_product_revision: persisted!.product.revision,
                    reason: "Unpublished draft deletion confirmed",
                  };
            try {
              c.preview(command);
              void action.run(command, "Product change committed").then((r) => {
                if (r) {
                  setDirty(false);
                  router.push("/admin/products");
                }
              });
            } catch (e) {
              setIssues([
                e instanceof Error ? e.message : "Unable to validate deletion",
              ]);
              setConfirm(null);
            }
          }}
        >
          Confirm {confirm}
        </button>
      </Dialog>
      <Dialog
        open={swatch}
        title="Create a named swatch"
        onClose={() => setSwatch(false)}
      >
        <SwatchEditor onDone={() => setSwatch(false)} />
      </Dialog>
    </div>
  );
}
function SwatchEditor({ onDone }: { onDone: () => void }) {
  const c = useCommerce(),
    action = useCommerceAction(),
    [name, setName] = useState(""),
    [hex, setHex] = useState("#F2EEE6"),
    [family, setFamily] = useState<SwatchColor["family"]>("White");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action
          .run(
            {
              type: "catalog.swatch_save",
              color: {
                id: crypto.randomUUID(),
                name,
                hex: hex.toUpperCase() as SwatchColor["hex"],
                family,
                screen_disclosure:
                  "Screen colours are a digital reference. Compare a physical fabric swatch for approval.",
              },
              expected_state_revision: c.state.revision,
            },
            "Named swatch created",
          )
          .then((r) => {
            if (r) onDone();
          });
      }}
    >
      <Field
        label="Color name · 2–40 characters"
        required
        minLength={2}
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex items-end gap-3">
        <Field
          label="HEX · #RRGGBB"
          pattern="#[0-9A-Fa-f]{6}"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
        />
        <input
          aria-label="Choose color"
          className="size-12"
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#F2EEE6"}
          onChange={(e) => setHex(e.target.value)}
        />
      </div>
      <Select
        label="Color family"
        value={family}
        onChange={(e) => setFamily(e.target.value as SwatchColor["family"])}
      >
        {[
          "White",
          "Beige",
          "Tan",
          "Taupe",
          "Terracotta",
          "Pink",
          "Green",
          "Blue",
          "Gray",
        ].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <ActionError message={action.error} />
      <button className="button-primary" disabled={action.pending}>
        Save swatch
      </button>
    </form>
  );
}
