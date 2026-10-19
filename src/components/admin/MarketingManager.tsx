"use client";
import { useState } from "react";
import Link from "next/link";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { money, quoteCart, quoteSelection } from "@/lib/commerce-engine";
import {
  policySchema,
  promoSchema,
  heroSchema,
} from "@/lib/commerce-contracts";
import { CATEGORIES } from "@/lib/backoffice";
import { formatMoney } from "@/lib/storefront";
import type {
  BundlePolicy,
  CommerceQuote,
  HeroBannerConfig,
  PromoCode,
} from "@/types/commerce";
import { Check, Field, Panel, Select, TextArea, Time } from "../ui/Panel";
import { StoreImage } from "../ui/StoreImage";
import { Dialog } from "../ui/Dialog";
function QuoteSimulation({ quote }: { quote: CommerceQuote }) {
  return (
    <div className="space-y-2 rounded-control bg-surface-soft p-4">
      <p className="font-semibold">
        Simulated total {formatMoney(quote.total)} · savings{" "}
        {formatMoney(quote.discount)}
      </p>
      <p className="text-sm">{quote.comparison.explanation}</p>
      {quote.lines.map((l) => (
        <div className="flex justify-between gap-4 text-xs" key={l.id}>
          <span>
            {l.title} × {l.quantity}
          </span>
          <span>
            Discount {formatMoney(l.discount)} · {l.discount_source}
          </span>
        </div>
      ))}
      {quote.warnings.map((w, i) => (
        <p className="text-xs text-warning" key={i}>
          {w.message}
        </p>
      ))}
    </div>
  );
}
function AdvancedRecord<T>({
  value,
  onChange,
}: {
  value: T;
  onChange: (value: T) => void;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2)),
    [error, setError] = useState("");
  return (
    <details>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">
        Advanced typed record · dates, exclusions & limits
      </summary>
      <p className="mb-3 text-xs text-admin-muted">
        Edit the complete record. Apply to the form, then validate & save.
        Unknown fields and invalid values are rejected by the command schema.
      </p>
      <textarea
        className="field min-h-80 font-mono text-xs"
        aria-label="Advanced record JSON"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="button-secondary mt-3"
        type="button"
        onClick={() => {
          try {
            const parsed: unknown = JSON.parse(text);
            if (!parsed || typeof parsed !== "object")
              throw new Error("An object is required.");
            onChange(parsed as T);
            setError("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid JSON");
          }
        }}
      >
        Apply record to form
      </button>
      <ActionError message={error} />
    </details>
  );
}
export function Promotions() {
  const c = useCommerce(),
    [creating, setCreating] = useState<PromoCode | null>(null);
  const all = [
    ...c.state.promos.filter(
      (p) => !c.state.promo_drafts.some((d) => d.id === p.id),
    ),
    ...c.state.promo_drafts,
  ];
  return (
    <div className="space-y-6">
      <Panel title="Promotion codes">
        <p className="text-sm text-admin-muted">
          Non-stacking promotions compete with bundle savings for the better
          whole-cart payable. Changes remain drafts until an Administrator
          publishes.
        </p>
        <button
          className="button-primary"
          disabled={!["administrator", "marketing_manager"].includes(c.role)}
          onClick={() =>
            setCreating({
              schema_version: 1,
              id: crypto.randomUUID(),
              revision: 0,
              version: 0,
              name: "",
              code: "",
              status: "draft",
              enabled: true,
              benefit: { type: "percent", basis_points: 500 },
              starts_at: c.clock,
              ends_at: "2099-12-31T00:00:00.000Z",
              timezone: "Asia/Karachi",
              eligible_categories: [],
              excluded_variant_ids: [],
              minimum_subtotal: money(0, c.state.cart.currency),
              maximum_discount: null,
              global_usage_limit: null,
              per_customer_usage_limit: null,
              stacking: "none",
              include_sale_items: false,
              markets: c.state.markets.map((m) => m.id),
              channels: ["web"],
              updated_at: c.clock,
            })
          }
        >
          Create promo code
        </button>
      </Panel>
      {creating && (
        <PromoEditor
          key={creating.id}
          source={creating}
          onCreated={() => setCreating(null)}
        />
      )}{" "}
      {all.map((p) => (
        <PromoEditor key={`${p.id}-${p.revision}`} source={p} />
      ))}
      <BundlePolicyEditor
        key={
          c.state.bundle_policy_draft?.version ?? c.state.bundle_policy.version
        }
      />
    </div>
  );
}
function PromoEditor({
  source,
  onCreated,
}: {
  source: PromoCode;
  onCreated?: () => void;
}) {
  const c = useCommerce(),
    action = useCommerceAction(),
    [promo, setPromo] = useState(source),
    [error, setError] = useState(""),
    [sim, setSim] = useState<CommerceQuote | null>(null);
  const canEdit = ["administrator", "marketing_manager"].includes(c.role),
    draft = c.state.promo_drafts.find((p) => p.id === source.id),
    live = c.state.promos.find((p) => p.id === source.id);
  function validate() {
    const parsed = promoSchema.safeParse(promo);
    if (!parsed.success)
      throw new Error(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    return parsed.data;
  }
  function simulate() {
    setError("");
    try {
      const p = validate();
      const state = {
        ...c.state,
        promos: [
          ...c.state.promos.filter((v) => v.id !== p.id),
          { ...p, status: "published" as const },
        ],
      };
      setSim(
        quoteCart(
          state,
          { ...c.state.cart, promo_code: p.code },
          { now: c.clock, quote_id: crypto.randomUUID() },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid promotion");
    }
  }
  return (
    <Panel title={source.name || "New promotion"}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            const next = validate();
            void action
              .run(
                {
                  type: "promo.save_draft",
                  promo: next,
                  expected_promo_revision: source.revision,
                },
                "Promotion draft saved",
              )
              .then((r) => {
                if (r) onCreated?.();
              });
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Invalid promotion",
            );
          }
        }}
      >
        <fieldset disabled={!canEdit || action.pending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Promotion name"
              value={promo.name}
              required
              onChange={(e) => setPromo({ ...promo, name: e.target.value })}
            />
            <Field
              label="Unique code"
              required
              pattern="[A-Z0-9_-]+"
              value={promo.code}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  code: e.target.value.toUpperCase().trim(),
                })
              }
            />
            <Select
              label="Benefit type"
              value={promo.benefit.type}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  benefit:
                    e.target.value === "percent"
                      ? { type: "percent", basis_points: 500 }
                      : e.target.value === "fixed"
                        ? {
                            type: "fixed",
                            amount: money(1000, c.state.cart.currency),
                          }
                        : { type: "shipping", amount: null },
                })
              }
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
              <option value="shipping">Shipping</option>
            </Select>
            {promo.benefit.type === "percent" ? (
              <Field
                label="Percent · basis points (500 = 5%)"
                type="number"
                min="1"
                max="10000"
                value={promo.benefit.basis_points}
                onChange={(e) =>
                  setPromo({
                    ...promo,
                    benefit: {
                      type: "percent",
                      basis_points: Number(e.target.value),
                    },
                  })
                }
              />
            ) : promo.benefit.type === "fixed" ? (
              <Field
                label={`Fixed discount · ${promo.benefit.amount.currency} minor units`}
                type="number"
                min="1"
                value={promo.benefit.amount.amount_minor}
                onChange={(e) =>
                  setPromo({
                    ...promo,
                    benefit: {
                      type: "fixed",
                      amount: {
                        ...promo.minimum_subtotal,
                        amount_minor: Number(e.target.value),
                      },
                    },
                  })
                }
              />
            ) : (
              <p className="text-sm content-center">
                Full configured shipping charge is waived when eligible.
              </p>
            )}
            <Field
              label="Starts (UTC)"
              type="datetime-local"
              required
              value={promo.starts_at.slice(0, 16)}
              onChange={(e) =>
                e.target.value &&
                setPromo({ ...promo, starts_at: `${e.target.value}:00.000Z` })
              }
            />
            <Field
              label="Ends (UTC)"
              type="datetime-local"
              required
              value={promo.ends_at.slice(0, 16)}
              onChange={(e) =>
                e.target.value &&
                setPromo({ ...promo, ends_at: `${e.target.value}:00.000Z` })
              }
            />
            <Field
              label="Minimum eligible subtotal · minor units"
              type="number"
              min="0"
              value={promo.minimum_subtotal.amount_minor}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  minimum_subtotal: {
                    ...promo.minimum_subtotal,
                    amount_minor: Number(e.target.value),
                  },
                })
              }
            />
            <Field
              label="Maximum discount · minor units (blank = uncapped)"
              type="number"
              min="1"
              value={promo.maximum_discount?.amount_minor ?? ""}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  maximum_discount: e.target.value
                    ? {
                        ...promo.minimum_subtotal,
                        amount_minor: Number(e.target.value),
                      }
                    : null,
                })
              }
            />
            <Field
              label="Global usage limit · blank = unlimited"
              type="number"
              min="1"
              value={promo.global_usage_limit ?? ""}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  global_usage_limit: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
            <Field
              label="Per-customer usage limit · blank = unlimited"
              type="number"
              min="1"
              max="99"
              value={promo.per_customer_usage_limit ?? ""}
              onChange={(e) =>
                setPromo({
                  ...promo,
                  per_customer_usage_limit: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </div>
          <Check
            checked={promo.enabled}
            onChange={(v) => setPromo({ ...promo, enabled: v })}
          >
            Enabled when published
          </Check>
          <Check
            checked={promo.include_sale_items}
            onChange={(v) => setPromo({ ...promo, include_sale_items: v })}
          >
            Include sale items
          </Check>
          <fieldset>
            <legend className="field-label">
              Eligible categories · none means all
            </legend>
            <div className="grid gap-x-5 sm:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <Check
                  key={cat}
                  checked={promo.eligible_categories.includes(cat)}
                  onChange={(v) =>
                    setPromo({
                      ...promo,
                      eligible_categories: v
                        ? [...promo.eligible_categories, cat]
                        : promo.eligible_categories.filter((x) => x !== cat),
                    })
                  }
                >
                  {cat}
                </Check>
              ))}
            </div>
          </fieldset>
          <AdvancedRecord
            key={JSON.stringify(promo)}
            value={promo}
            onChange={(value) => {
              const parsed = promoSchema.safeParse(value);
              if (parsed.success) setPromo(parsed.data);
              else
                setError(parsed.error.issues.map((i) => i.message).join("; "));
            }}
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="button-secondary"
              type="button"
              onClick={simulate}
            >
              Simulate with current cart
            </button>
            <button className="button-primary">Save promo draft</button>
          </div>
        </fieldset>
        <ActionError message={error || action.error} />
      </form>
      {sim && <QuoteSimulation quote={sim} />}
      <div className="flex flex-wrap gap-3">
        {draft && (
          <button
            className="button-secondary"
            disabled={c.role !== "administrator" || action.pending}
            onClick={() =>
              void action.run(
                {
                  type: "promo.publish",
                  promo_id: draft.id,
                  expected_promo_revision: draft.revision,
                  reason: "Promotion reviewed and published by Administrator",
                },
                "Promotion published",
              )
            }
          >
            Publish draft
          </button>
        )}
        {live?.status === "published" && (
          <button
            className="button-secondary text-danger"
            disabled={c.role !== "administrator" || action.pending}
            onClick={() =>
              void action.run(
                {
                  type: "promo.archive",
                  promo_id: live.id,
                  expected_promo_revision: live.revision,
                  reason: "Promotion disabled by Administrator",
                },
                "Promotion disabled",
              )
            }
          >
            Disable live promotion
          </button>
        )}
      </div>
      <p className="text-xs text-admin-muted">
        {source.status} · revision {source.revision} · version {source.version}
      </p>
    </Panel>
  );
}
function BundlePolicyEditor() {
  const c = useCommerce(),
    action = useCommerceAction(),
    source = c.state.bundle_policy_draft ?? c.state.bundle_policy,
    [policy, setPolicy] = useState<BundlePolicy>(source),
    [sim, setSim] = useState<CommerceQuote | null>(null),
    [error, setError] = useState(""),
    [recipe, setRecipe] = useState(c.state.recipes[0].id);
  return (
    <Panel title="Bundle policy">
      <p className="text-sm text-admin-muted">
        Live v{c.state.bundle_policy.version}. Foundation, Top layer and
        Decorative Cushions qualify as independent groups. Included sleeping
        pillowcases do not create a cushion group.
      </p>
      <fieldset
        disabled={
          !["administrator", "marketing_manager"].includes(c.role) ||
          action.pending
        }
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {policy.tiers.map((t, i) => (
            <Field
              key={t.group_count}
              label={`${t.group_count} group${t.group_count > 1 ? "s" : ""} · %`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={t.basis_points / 100}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  tiers: policy.tiers.map((v, n) =>
                    n === i
                      ? {
                          ...v,
                          basis_points: Math.round(
                            Number(e.target.value) * 100,
                          ),
                        }
                      : v,
                  ),
                })
              }
            />
          ))}
        </div>
        <Check
          checked={policy.enabled}
          onChange={(v) => setPolicy({ ...policy, enabled: v })}
        >
          Bundle discounts enabled
        </Check>
        <Select
          label="Sale item treatment"
          value={policy.sale_item_treatment}
          onChange={(e) =>
            setPolicy({
              ...policy,
              sale_item_treatment: e.target
                .value as BundlePolicy["sale_item_treatment"],
            })
          }
        >
          <option value="exclude">Exclude sale lines from discount</option>
          <option value="include">Include sale lines</option>
        </Select>
        <AdvancedRecord
          value={policy}
          onChange={(value) => {
            const parsed = policySchema.safeParse(value);
            if (parsed.success) setPolicy(parsed.data);
            else setError(parsed.error.issues.map((i) => i.message).join("; "));
          }}
        />
        <Select
          label="Representative bed to simulate"
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
        >
          {c.state.recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-secondary"
            onClick={() => {
              setError("");
              try {
                const parsed = policySchema.parse(policy);
                setSim(
                  quoteSelection(
                    { ...c.state, bundle_policy: parsed },
                    c.state.recipes.find((r) => r.id === recipe)!.selection,
                    { now: c.clock, quote_id: crypto.randomUUID() },
                  ),
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid policy");
              }
            }}
          >
            Simulate draft tiers
          </button>
          <button
            className="button-primary"
            onClick={() =>
              void action.run(
                {
                  type: "policy.save_draft",
                  policy,
                  expected_policy_version: source.version,
                },
                "Bundle policy draft saved",
              )
            }
          >
            Save policy draft
          </button>
        </div>
      </fieldset>
      <ActionError message={error || action.error} />
      {sim && <QuoteSimulation quote={sim} />}{" "}
      {c.state.bundle_policy_draft && (
        <button
          className="button-secondary"
          disabled={c.role !== "administrator" || action.pending}
          onClick={() =>
            void action.run(
              {
                type: "policy.publish",
                expected_policy_version: c.state.bundle_policy.version,
                expected_draft_version: c.state.bundle_policy_draft!.version,
                reason: "Administrator reviewed tier simulation",
              },
              "Bundle policy published; quotes require refresh",
            )
          }
        >
          Publish policy version
        </button>
      )}
    </Panel>
  );
}
export function ContentManager() {
  const c = useCommerce();
  const banners = [
    ...c.state.hero_banners.filter(
      (b) => !c.state.hero_banner_drafts.some((d) => d.id === b.id),
    ),
    ...c.state.hero_banner_drafts,
  ];
  return (
    <div className="space-y-6">
      <Panel title="Homepage & announcement CMS">
        <p>
          Save complete drafts, preview at mobile and desktop widths, then
          publish atomically. Live content retains its previous version until
          publication.
        </p>
        <Link className="text-link min-h-11 inline-flex items-center" href="/">
          View live storefront
        </Link>
      </Panel>
      {banners.map((b) => (
        <BannerEditor source={b} key={`${b.id}-${b.revision}`} />
      ))}
    </div>
  );
}
function BannerEditor({ source }: { source: HeroBannerConfig }) {
  const c = useCommerce(),
    action = useCommerceAction(),
    [banner, setBanner] = useState(source),
    [preview, setPreview] = useState(false),
    [width, setWidth] = useState(390),
    [error, setError] = useState("");
  const draft = c.state.hero_banner_drafts.find((b) => b.id === source.id),
    live = c.state.hero_banners.find((b) => b.id === source.id),
    history = c.state.hero_history.filter((b) => b.id === source.id);
  const featured =
    banner.featured_product_ids ??
    c.state.products
      .filter((p) => p.status === "published" && p.featured_rank > 0)
      .sort((a, b) => a.featured_rank - b.featured_rank)
      .map((p) => p.id);
  return (
    <Panel
      title={
        source.placement === "hero"
          ? "Editorial hero & featured collection"
          : "Announcement bar"
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = heroSchema.safeParse(banner);
          if (!parsed.success) {
            setError(
              parsed.error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; "),
            );
            return;
          }
          setError("");
          void action.run(
            {
              type: "hero.save_draft",
              banner: parsed.data,
              expected_banner_revision: source.revision,
            },
            "Content draft saved",
          );
        }}
      >
        <fieldset
          className="space-y-4"
          disabled={
            !["administrator", "marketing_manager"].includes(c.role) ||
            action.pending
          }
        >
          <Field
            label="Internal content name"
            required
            value={banner.internal_name}
            onChange={(e) =>
              setBanner({ ...banner, internal_name: e.target.value })
            }
          />
          {banner.placement === "announcement" ? (
            <TextArea
              label="Announcement · maximum 120 characters"
              maxLength={120}
              value={banner.announcement_text ?? ""}
              onChange={(value) =>
                setBanner({ ...banner, announcement_text: value })
              }
            />
          ) : (
            <>
              <Field
                label="Headline · maximum 80 characters"
                required
                maxLength={80}
                value={banner.headline}
                onChange={(e) =>
                  setBanner({ ...banner, headline: e.target.value })
                }
              />
              <TextArea
                label="Supporting copy · maximum 180 characters"
                maxLength={180}
                value={banner.supporting_copy}
                onChange={(value) =>
                  setBanner({ ...banner, supporting_copy: value })
                }
              />
              {(["primary_cta", "secondary_cta"] as const).map((key) => (
                <div className="grid gap-4 sm:grid-cols-2" key={key}>
                  <Field
                    label={`${key === "primary_cta" ? "Primary" : "Secondary"} CTA label · 28 characters`}
                    maxLength={28}
                    value={banner[key]?.label ?? ""}
                    onChange={(e) =>
                      setBanner({
                        ...banner,
                        [key]: e.target.value
                          ? {
                              label: e.target.value,
                              href: banner[key]?.href ?? "/shop",
                            }
                          : null,
                      })
                    }
                  />
                  <Field
                    label="Safe internal route"
                    value={banner[key]?.href ?? ""}
                    onChange={(e) =>
                      setBanner({
                        ...banner,
                        [key]: {
                          label: banner[key]?.label ?? "Explore",
                          href: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
              {(["desktop_media", "mobile_media"] as const).map(
                (key) =>
                  banner[key] && (
                    <div
                      className="space-y-3 rounded-control border border-divider p-4"
                      key={key}
                    >
                      <Field
                        label={`${key === "desktop_media" ? "Desktop" : "Mobile"} image URL`}
                        type="url"
                        value={banner[key]!.url}
                        onChange={(e) =>
                          setBanner({
                            ...banner,
                            [key]: { ...banner[key]!, url: e.target.value },
                          })
                        }
                      />
                      <Field
                        label="Image alt text"
                        value={banner[key]!.alt}
                        onChange={(e) =>
                          setBanner({
                            ...banner,
                            [key]: { ...banner[key]!, alt: e.target.value },
                          })
                        }
                      />
                    </div>
                  ),
              )}
              <fieldset>
                <legend className="field-label">
                  Featured products · click order is display order
                </legend>
                <div className="grid gap-x-5 sm:grid-cols-2">
                  {c.state.products
                    .filter((p) => p.status === "published")
                    .map((p) => (
                      <Check
                        key={p.id}
                        checked={featured.includes(p.id)}
                        onChange={(v) =>
                          setBanner({
                            ...banner,
                            featured_product_ids: v
                              ? [...featured, p.id]
                              : featured.filter((id) => id !== p.id),
                          })
                        }
                      >
                        {featured.includes(p.id)
                          ? `${featured.indexOf(p.id) + 1}. `
                          : ""}
                        {p.title}
                      </Check>
                    ))}
                </div>
              </fieldset>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starts (UTC)"
              required
              type="datetime-local"
              value={banner.starts_at.slice(0, 16)}
              onChange={(e) =>
                e.target.value &&
                setBanner({ ...banner, starts_at: `${e.target.value}:00.000Z` })
              }
            />
            <Field
              label="Ends (UTC) · optional"
              type="datetime-local"
              value={banner.ends_at?.slice(0, 16) ?? ""}
              onChange={(e) =>
                setBanner({
                  ...banner,
                  ends_at: e.target.value ? `${e.target.value}:00.000Z` : null,
                })
              }
            />
          </div>
          <AdvancedRecord
            value={banner}
            onChange={(value) => {
              const parsed = heroSchema.safeParse(value);
              if (parsed.success) setBanner(parsed.data);
              else
                setError(parsed.error.issues.map((i) => i.message).join("; "));
            }}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                const parsed = heroSchema.safeParse(banner);
                if (parsed.success) setPreview(true);
                else
                  setError(
                    parsed.error.issues.map((i) => i.message).join("; "),
                  );
              }}
            >
              Preview content
            </button>
            <button className="button-primary">Save content draft</button>
          </div>
        </fieldset>
        <ActionError message={error || action.error} />
      </form>
      <div className="flex flex-wrap gap-3">
        {draft && (
          <button
            className="button-secondary"
            disabled={c.role !== "administrator" || action.pending}
            onClick={() =>
              void action.run(
                {
                  type: "hero.publish",
                  banner_id: draft.id,
                  expected_banner_revision: draft.revision,
                  reason: "Administrator reviewed CMS preview",
                },
                "Content published across storefront panels",
              )
            }
          >
            Publish draft
          </button>
        )}
        {live?.status === "published" && (
          <button
            className="button-secondary"
            disabled={c.role !== "administrator" || action.pending}
            onClick={() =>
              void action.run(
                {
                  type: "hero.archive",
                  banner_id: live.id,
                  expected_banner_revision: live.revision,
                  reason: "Administrator archived content",
                },
                "Content archived",
              )
            }
          >
            Archive live content
          </button>
        )}
        {history.slice(-1).map((h) => (
          <button
            className="button-secondary"
            disabled={c.role !== "administrator" || action.pending}
            key={h.revision}
            onClick={() =>
              void action.run(
                {
                  type: "hero.rollback",
                  banner_id: source.id,
                  history_revision: h.revision,
                  expected_banner_revision: live!.revision,
                  reason: "Administrator restored previous published content",
                },
                "Previous version promoted as a new revision",
              )
            }
          >
            Restore published r{h.revision}
          </button>
        ))}
      </div>
      <p className="text-xs text-admin-muted">
        {source.status} · r{source.revision} · author {source.author_id} ·
        updated <Time at={source.updated_at} />
      </p>
      <Dialog
        open={preview}
        fullscreen
        title="Content preview · unpublished"
        onClose={() => setPreview(false)}
      >
        <div className="mb-5 flex flex-wrap gap-3">
          <button className="button-secondary" onClick={() => setWidth(390)}>
            390px mobile
          </button>
          <button className="button-secondary" onClick={() => setWidth(1440)}>
            1440px desktop
          </button>
        </div>
        <div className="max-w-full overflow-x-auto">
          <div
            style={{ width }}
            className="overflow-hidden rounded-card border border-divider bg-canvas"
          >
            {banner.placement === "announcement" ? (
              <p className="bg-primary px-5 py-3 text-center text-on-primary">
                {banner.announcement_text}
              </p>
            ) : (
              <div className={`grid ${width > 600 ? "grid-cols-2" : ""}`}>
                <div className="space-y-5 p-8">
                  <p className="eyebrow">RAZAI GHAR</p>
                  <h3 className="font-serif text-5xl">{banner.headline}</h3>
                  <p>{banner.supporting_copy}</p>
                  {banner.primary_cta && (
                    <span className="button-primary">
                      {banner.primary_cta.label}
                    </span>
                  )}
                  {banner.secondary_cta && <p>{banner.secondary_cta.label}</p>}
                </div>
                {(width > 600
                  ? banner.desktop_media
                  : (banner.mobile_media ?? banner.desktop_media)) && (
                  <StoreImage
                    src={
                      (width > 600
                        ? banner.desktop_media
                        : (banner.mobile_media ?? banner.desktop_media))!.url
                    }
                    alt={
                      (width > 600
                        ? banner.desktop_media
                        : (banner.mobile_media ?? banner.desktop_media))!.alt
                    }
                    className="aspect-[4/3]"
                    position={`${banner.focal_points[width > 600 ? "desktop" : "mobile"].x * 100}% ${banner.focal_points[width > 600 ? "desktop" : "mobile"].y * 100}%`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </Panel>
  );
}
