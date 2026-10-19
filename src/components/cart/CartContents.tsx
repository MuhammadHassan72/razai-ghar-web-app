"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, ArrowUpRight, PackageCheck } from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import { quoteCart } from "@/lib/commerce-engine";
import { dimensions, formatMoney, priceOf, stockOf } from "@/lib/storefront";
import type {
  CommerceQuote,
  QuoteLine,
  CommerceCommand,
} from "@/types/commerce";
import { StoreImage } from "../ui/StoreImage";

export function QuoteSummary({ quote }: { quote: CommerceQuote }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt>Merchandise subtotal</dt>
        <dd className="price">{formatMoney(quote.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>
          {quote.applied_discount === "promo" ? "Promotion" : "Bundle savings"}
        </dt>
        <dd className="price text-success">−{formatMoney(quote.discount)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Shipping</dt>
        <dd>
          {quote.shipping_state === "estimated"
            ? "Enter destination"
            : quote.shipping.amount_minor === 0
              ? "Free"
              : formatMoney(quote.shipping)}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Tax</dt>
        <dd>
          {quote.tax_state === "estimated"
            ? "Calculated at delivery"
            : formatMoney(quote.tax)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-divider pt-4 text-lg font-semibold">
        <dt>
          {quote.total_state === "estimated" ? "Estimated total" : "Total"}
        </dt>
        <dd className="price">{formatMoney(quote.total)}</dd>
      </div>
    </dl>
  );
}
function CartItem({ line }: { line: QuoteLine }) {
  const commerce = useCommerce(),
    action = useCommerceAction();
  const [edit, setEdit] = useState<{
      quantity: number;
      revision: number;
      total: string;
      savings: string;
    } | null>(null),
    [previewError, setPreviewError] = useState("");
  const sourceLine = commerce.state.cart.lines.find((l) => l.id === line.id),
    bundle = commerce.state.cart.bundles.find(
      (b) => b.id === line.bundle_instance_id,
    );
  const limit = sourceLine?.bundle_instance_id
    ? sourceLine.insert_for_line_id
      ? line.quantity
      : line.product_role === "cushion_cover"
        ? line.quantity +
          Math.max(
            0,
            5 -
              (bundle?.selection.slots.filter(
                (s) =>
                  s.slot_id.startsWith("cushion_") && s.state === "selected",
              ).length ?? 0),
          )
        : 1
    : 99;
  const modify = (quantity: number) => {
    setPreviewError("");
    const command: CommerceCommand = {
      type: "cart.update_line",
      line_id: line.id,
      quantity,
      expected_cart_revision: commerce.state.cart.revision,
    };
    try {
      const preview = commerce.preview(command);
      if (
        quantity < line.quantity &&
        (line.bundle_instance_id ||
          preview.after_cart.shipping.amount_minor >
            preview.before_cart.shipping.amount_minor)
      ) {
        setEdit({
          quantity,
          revision: commerce.state.cart.revision,
          total: formatMoney(preview.after_cart.total),
          savings: formatMoney(preview.after_cart.discount),
        });
        return;
      }
    } catch (cause) {
      setPreviewError(
        cause instanceof Error
          ? cause.message
          : "The edit could not be previewed.",
      );
      return;
    }
    void action.run(
      command,
      quantity
        ? "Cart updated; bundle pricing recalculated"
        : "Item removed; bundle pricing recalculated",
    );
  };
  return (
    <div className="border-t border-divider py-4">
      <div className="flex gap-3">
        <StoreImage
          src={line.image_url}
          alt={`Editorial reference for ${line.title}`}
          className="h-28 w-20 shrink-0 rounded-control"
          sizes="100px"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${commerce.state.products.find((p) => p.id === line.product_id)?.slug ?? line.product_id}`}
            className="text-sm font-medium leading-5"
          >
            {line.title}
          </Link>
          <p className="mt-1 text-xs text-ink-muted">
            {line.color.name} · {line.size.label}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{dimensions(line.size)}</p>
          <p className="mt-1 text-xs">
            {line.product_role.endsWith("cover")
              ? "Cover only · insert separate"
              : line.product_role === "sheet_set"
                ? "One stocked set · contents listed on product"
                : "Separate sale unit"}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-control border border-control-border">
              <button
                className="icon-button"
                type="button"
                aria-label={`Decrease quantity of ${line.title}`}
                disabled={action.pending || commerce.persistence !== "ready"}
                onClick={() => modify(line.quantity - 1)}
              >
                <Minus size={14} />
              </button>
              <span className="min-w-6 text-center text-sm" aria-live="polite">
                {line.quantity}
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label={`Increase quantity of ${line.title}`}
                disabled={
                  action.pending ||
                  commerce.persistence !== "ready" ||
                  line.quantity >= limit
                }
                onClick={() => modify(line.quantity + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
            <p className="price text-sm font-semibold">
              {formatMoney(line.total)}
              {line.discount.amount_minor > 0 && (
                <span className="mt-1 block text-xs font-normal text-success">
                  Saved {formatMoney(line.discount)}
                </span>
              )}
            </p>
            <button
              type="button"
              className="icon-button text-ink-muted"
              aria-label={`Remove ${line.title}`}
              disabled={action.pending}
              onClick={() => modify(0)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
      {edit && (
        <div className="notice mt-4" role="status">
          <p>
            Review this change: {edit.total} total, with {edit.savings}{" "}
            merchandise savings. Removing a cover also removes its linked
            inserts. Your bundle tier and shipping threshold may change.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="button-primary"
              disabled={action.pending}
              onClick={() => {
                void action
                  .run(
                    {
                      type: "cart.update_line",
                      line_id: line.id,
                      quantity: edit.quantity,
                      expected_cart_revision: edit.revision,
                    },
                    "Cart change confirmed; bundle pricing recalculated",
                  )
                  .then((result) => {
                    if (result) setEdit(null);
                  });
              }}
            >
              Confirm cart change
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setEdit(null)}
            >
              Keep current items
            </button>
          </div>
        </div>
      )}
      <ActionError message={previewError || action.error} />
    </div>
  );
}
function MatchingCushion({ quote }: { quote: CommerceQuote }) {
  const commerce = useCommerce(),
    action = useCommerceAction();
  const approved = new Set(
    quote.lines.flatMap(
      (l) =>
        commerce.state.products.find((p) => p.id === l.product_id)
          ?.related_product_ids ?? [],
    ),
  );
  const candidates = commerce.state.variants.filter(
    (v) =>
      v.active &&
      approved.has(v.product_id) &&
      stockOf(commerce.state, v) >
        commerce.state.cart.lines
          .filter((l) => l.variant_id === v.id)
          .reduce((sum, l) => sum + l.quantity, 0) &&
      commerce.state.products.some(
        (p) =>
          p.id === v.product_id &&
          p.status === "published" &&
          p.product_role === "cushion_cover",
      ),
  );
  const colors = new Set(quote.lines.map((l) => l.color.id));
  const recommended = [...candidates].sort(
    (a, b) =>
      Number(colors.has(b.color_id)) - Number(colors.has(a.color_id)) ||
      a.id.localeCompare(b.id),
  )[0];
  const [target, setTarget] = useState("");
  const bundles = commerce.state.cart.bundles.filter(
    (b) =>
      b.selection.slots.some(
        (s) => s.slot_id.startsWith("cushion_") && s.state === "skipped",
      ) &&
      recommended?.compatible_bed_size_ids.includes(b.selection.bed_size_id),
  );
  const bundleId = bundles.some((b) => b.id === target) ? target : "";
  const recommendedId = recommended?.id;
  const command: CommerceCommand | null = recommendedId
    ? bundleId
      ? {
          type: "cart.add_to_bundle",
          bundle_id: bundleId,
          variant_id: recommendedId,
          expected_cart_revision: commerce.state.cart.revision,
        }
      : { type: "cart.add_item", variant_id: recommendedId, quantity: 1 }
    : null;
  let preview = null;
  if (command) {
    try {
      preview = commerce.preview(command);
    } catch {
      preview = null;
    }
  }
  if (!recommended || !quote.lines.length || !preview) return null;
  const product = commerce.state.products.find(
      (p) => p.id === recommended.product_id,
    )!,
    color = commerce.state.colors.find((c) => c.id === recommended.color_id)!,
    size = commerce.state.sizes.find((s) => s.id === recommended.size_id)!;
  return (
    <section
      className="my-6 rounded-card bg-surface-soft p-4"
      aria-labelledby="cushion-suggestion"
    >
      <p className="eyebrow">One finishing touch</p>
      <h3 id="cushion-suggestion" className="mt-2 text-base font-medium">
        {product.title}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {color.name} · {size.label} · cover only
      </p>
      <p className="price mt-2 font-semibold">
        {formatMoney(priceOf(recommended, commerce.clock))}
      </p>
      {bundles.length > 0 && (
        <label className="mt-3 block">
          <span className="field-label">Where should it belong?</span>
          <select
            className="field"
            value={bundleId}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Add as a separate item</option>
            {bundles.map((b) => (
              <option key={b.id} value={b.id}>
                Add to {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        After adding: {formatMoney(preview.after_cart.total)}{" "}
        {preview.after_cart.total_state === "estimated"
          ? "estimated total"
          : "total"}
        ; merchandise savings {formatMoney(preview.after_cart.discount)}.
        {bundleId
          ? " This fills one decorative position in the named bundle."
          : " A separate item does not change any bed bundle's group count."}
      </p>
      <button
        type="button"
        className="button-secondary mt-3 w-full"
        disabled={action.pending || commerce.persistence !== "ready"}
        onClick={() => {
          if (command) void action.run(command, "Matching cushion added");
        }}
      >
        {action.pending
          ? "Adding…"
          : bundleId
            ? `Add to ${bundles.find((b) => b.id === bundleId)?.name}`
            : "Add as a separate item"}
      </button>
      <ActionError message={action.error} />
    </section>
  );
}
export default function CartContents({
  fullPage = false,
}: {
  fullPage?: boolean;
}) {
  const commerce = useCommerce(),
    ui = useStorefront(),
    action = useCommerceAction();
  const [code, setCode] = useState(commerce.state.cart.promo_code ?? ""),
    [promoSubmitted, setPromoSubmitted] = useState(false);
  const computed = useMemo(() => {
    try {
      return {
        quote: quoteCart(commerce.state, commerce.state.cart, {
          now: commerce.clock,
          quote_id: `cart-view-${commerce.state.revision}`,
        }),
        error: "",
      };
    } catch (cause) {
      return {
        quote: null,
        error:
          cause instanceof Error
            ? cause.message
            : "Cart pricing is unavailable.",
      };
    }
  }, [commerce.state, commerce.clock]);
  const quote = computed.quote;
  if (!commerce.state.cart.lines.length)
    return (
      <div className="py-12 text-center">
        <ShoppingBagEmpty />
        <h2 className="mt-5 font-serif text-3xl">A little room for comfort.</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-muted">
          Your cart is empty. Start with a fabric you love or compose the whole
          bed.
        </p>
        <Link
          className="button-primary mt-6"
          href="/shop"
          onClick={() => ui.setOverlay(null)}
        >
          Explore bedding
        </Link>
        <Link
          className="text-link mt-3 flex justify-center"
          href="/create-your-bed"
          onClick={() => ui.setOverlay(null)}
        >
          Create your own bed <ArrowUpRight size={15} />
        </Link>
      </div>
    );
  if (!quote)
    return (
      <>
        <ActionError message={computed.error} />
        <button
          type="button"
          className="button-secondary"
          onClick={commerce.refresh}
        >
          Refresh cart data
        </button>
      </>
    );
  const progress = quote.shipping_progress;
  const body = (
    <div>
      {progress ? (
        <div className="mb-6 rounded-control bg-success-soft p-4 text-sm text-success">
          <p className="flex gap-2">
            <PackageCheck size={18} />
            {progress.unlocked
              ? "Free shipping unlocked for your selected destination and method."
              : `You're ${formatMoney(progress.remaining)} away from free shipping.`}
          </p>
          <progress
            className="mt-3 h-1.5 w-full accent-success"
            max={100}
            value={progress.percent}
            aria-label={`Free shipping progress: ${Math.round(progress.percent)} percent`}
          />
        </div>
      ) : (
        <p className="notice mb-5">
          Enter your destination to check shipping. The progress threshold uses
          discounted eligible merchandise.
        </p>
      )}
      {quote.warnings.map((warning, index) => (
        <p
          key={`${warning.code}-${index}`}
          className={warning.blocking ? "form-error" : "notice mb-3"}
          role={warning.blocking ? "alert" : "status"}
        >
          {warning.message}
        </p>
      ))}
      {commerce.state.cart.bundles.map((bundle) => {
        const lines = quote.lines.filter(
            (l) => l.bundle_instance_id === bundle.id,
          ),
          tier = quote.bundle_tiers.find(
            (t) => t.bundle_instance_id === bundle.id,
          ),
          savings = lines.reduce((sum, l) => sum + l.discount.amount_minor, 0);
        return (
          <details
            key={bundle.id}
            open
            className="mb-5 rounded-card border border-divider bg-surface px-4"
          >
            <summary className="cursor-pointer py-4">
              <span className="font-medium">{bundle.name}</span>
              <span className="mt-2 flex flex-wrap gap-2">
                <span className="badge">
                  {tier?.groups.length ?? 0} groups ·{" "}
                  {(tier?.basis_points ?? 0) / 100}% bundle tier
                </span>
                <span className="badge">
                  Saved {formatMoney({ ...quote.total, amount_minor: savings })}
                </span>
              </span>
            </summary>
            <p className="mb-3 text-xs text-ink-muted">
              {bundle.complete_bed
                ? "Complete bed composition"
                : "Selected bed layers"}{" "}
              · {lines.reduce((sum, l) => sum + l.quantity, 0)} separately
              priced sale units. Promotion selection may replace the bundle
              discount.
            </p>
            <Link
              href={`/create-your-bed?bundle=${bundle.id}`}
              className="text-link"
              onClick={() => ui.setOverlay(null)}
            >
              Edit look <ArrowUpRight size={14} />
            </Link>
            {lines.map((line) => (
              <CartItem key={line.id} line={line} />
            ))}
            <button
              type="button"
              className="text-link mb-3 text-danger"
              disabled={action.pending}
              onClick={() => {
                void action.run(
                  {
                    type: "cart.remove_bundle",
                    bundle_id: bundle.id,
                    expected_cart_revision: commerce.state.cart.revision,
                  },
                  "Bed bundle removed",
                );
              }}
            >
              Remove entire bundle
            </button>
          </details>
        );
      })}
      {quote.lines
        .filter((l) => !l.bundle_instance_id)
        .map((line) => (
          <CartItem key={line.id} line={line} />
        ))}
      {commerce.active_undos
        .filter((u) => u.kind === "wishlist_move")
        .map((undo) => (
          <div
            key={undo.id}
            className="notice mt-3 flex items-center justify-between gap-3"
          >
            <span>Moved from your wishlist.</span>
            <button
              type="button"
              className="text-link"
              disabled={action.pending}
              onClick={() => {
                void action
                  .run({ type: "undo", undo_id: undo.id })
                  .then((result) => {
                    if (result) ui.notify(result.message ?? "Move undone");
                  });
              }}
            >
              Undo move
            </button>
          </div>
        ))}
      <MatchingCushion quote={quote} />
    </div>
  );
  const summary = (
    <div className="rounded-panel bg-surface-soft p-5 md:p-6">
      <h2 className="mb-5 font-serif text-3xl">The little details</h2>
      <form
        className="mb-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPromoSubmitted(true);
          void action.run({
            type: "cart.apply_promo",
            code,
            expected_cart_revision: commerce.state.cart.revision,
          });
        }}
      >
        <label htmlFor="cart-promo" className="field-label">
          Promotion code
        </label>
        <div className="flex gap-2">
          <input
            id="cart-promo"
            className="field min-w-0 uppercase"
            value={code}
            maxLength={32}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="button-secondary"
            disabled={
              !code.trim() || action.pending || commerce.persistence !== "ready"
            }
          >
            {action.pending && promoSubmitted ? "Applying…" : "Apply"}
          </button>
        </div>
      </form>
      {commerce.state.cart.promo_code && (
        <div className="mb-4 text-sm">
          <p>
            {commerce.state.cart.promo_code}:{" "}
            {quote.applied_discount === "promo"
              ? "applied"
              : quote.warnings.some((w) => w.code === "PROMO_INELIGIBLE")
                ? "no longer eligible for this cart"
                : "accepted; bundle pricing is better"}
            .
          </p>
          <button
            type="button"
            className="text-link"
            disabled={action.pending}
            onClick={() => {
              void action.run(
                {
                  type: "cart.apply_promo",
                  code: null,
                  expected_cart_revision: commerce.state.cart.revision,
                },
                "Promotion removed",
              );
              setCode("");
            }}
          >
            Remove promotion
          </button>
          <p className="text-xs leading-5 text-ink-muted">
            {quote.comparison.explanation}
          </p>
        </div>
      )}
      <ActionError message={action.error} />
      <QuoteSummary quote={quote} />
      <p className="mt-4 text-xs leading-5 text-ink-muted">
        QA prices only. No stock is reserved until an order is created. Changing
        a bundle line recalculates its tier; attached inserts follow their cover
        positions.
      </p>
      {quote.warnings.some((w) => w.blocking) ||
      commerce.persistence !== "ready" ? (
        <p className="form-error">
          Resolve cart warnings and storage availability before checkout.
        </p>
      ) : (
        <Link
          className="button-primary mt-5 w-full"
          href="/checkout"
          onClick={() => ui.setOverlay(null)}
        >
          Review & checkout <ArrowUpRight size={16} />
        </Link>
      )}
      {!fullPage && (
        <Link
          className="text-link mt-3 w-full justify-center"
          href="/cart"
          onClick={() => ui.setOverlay(null)}
        >
          Open full cart
        </Link>
      )}
    </div>
  );
  return (
    <div
      className={
        fullPage
          ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]"
          : ""
      }
    >
      {body}
      <div className={fullPage ? "lg:sticky lg:top-28" : ""}>{summary}</div>
    </div>
  );
}
function ShoppingBagEmpty() {
  return (
    <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-surface-soft">
      <PackageCheck size={30} strokeWidth={1} />
    </div>
  );
}
