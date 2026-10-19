"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { purchasedBedSelection as purchasedSelection } from "@/lib/bed-builder";
import { dimensions, formatMoney, stockOf, priceOf } from "@/lib/storefront";
import ReservationClock from "./ReservationClock";
import { QuoteSummary } from "../cart/CartContents";
import BrandLogo from "../layout/BrandLogo";

export { purchasedSelection };
export default function OrderReceipt({ token }: { token: string }) {
  const commerce = useCommerce(),
    action = useCommerceAction(),
    [showAvailability, setAvailability] = useState(false),
    [name, setName] = useState(""),
    [saved, setSaved] = useState(false),
    [bundleId, setBundleId] = useState("");
  const order = commerce.state.orders.find(
    (o) => o.id === token && o.owner_id === commerce.state.profile.id,
  );
  if (!commerce.hydrated)
    return (
      <div className="page-shell py-16" role="status">
        <BrandLogo variant="receipt" className="mb-6" />
        <h1 className="page-title">Opening your private QA receipt…</h1>
      </div>
    );
  if (!order)
    return (
      <div className="page-shell py-16">
        <BrandLogo variant="receipt" className="mb-6" />
        <h1 className="page-title">This receipt isn’t on this device.</h1>
        <p className="mt-5 text-ink-muted">
          Order links resolve only inside their owning browser’s QA scope. No
          order number grants access to an external account.
        </p>
        <Link className="text-link mt-5" href="/account?tab=orders">
          Open this device’s order history
        </Link>
      </div>
    );
  const purchasedBundle =
    order.bundle_snapshots?.find((b) => b.id === bundleId) ??
    order.bundle_snapshots?.[0];
  const first = commerce.state.variants.find(
      (v) => v.id === order.quote_snapshot.lines[0].variant_id,
    ),
    bedId = first?.compatible_bed_size_ids[0] ?? "us-queen",
    selection = purchasedBundle
      ? structuredClone(purchasedBundle.selection)
      : purchasedSelection(order, bedId);
  return (
    <div className="page-shell py-12 lg:py-16">
      <BrandLogo variant="receipt" className="mb-8" />
      <p className="eyebrow">
        {order.payment_state === "paid"
          ? "QA paid fixture"
          : "Your QA order record"}
      </p>
      <h1 className="page-title mt-3">
        {order.payment_state === "expired"
          ? "Your hold has expired."
          : "Your layers, all accounted for."}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="font-semibold">{order.reference}</span>
        <span className="badge">
          Payment: {order.payment_state.replaceAll("_", " ")}
        </span>
        <span className="badge">
          Fulfillment: {order.fulfillment_state.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        Device-only QA receipt. No actual payment, shipment or delivery
        occurred. Receipt data is based on the immutable accepted order
        snapshot.
      </p>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {order.payment_state === "pending" && (
            <ReservationClock deadline={order.reservation_expires_at} />
          )}
          {order.payment_state === "expired" && (
            <p className="notice">
              All unpaid reserved quantities have been released. Refresh
              availability before starting a new purchase intent.
            </p>
          )}
          <section className="mt-6 rounded-panel border border-divider bg-surface p-5 sm:p-7">
            <h2 className="font-serif text-3xl">Your order contents</h2>
            {order.quote_snapshot.lines.map((line) => (
              <div key={line.id} className="order-row">
                <div>
                  <h3 className="text-sm font-medium">
                    {line.quantity} × {line.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    {line.color.name} · {line.size.label}
                    <br />
                    {dimensions(line.size)}
                  </p>
                  <p className="mt-2 text-xs">
                    {line.contents
                      .map((c) => `${c.quantity} × ${c.name}`)
                      .join("; ")}
                  </p>
                  {line.product_role.endsWith("cover") && (
                    <p className="mt-1 text-xs font-medium">
                      Cover only. Any purchased insert appears on a separate
                      line.
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="price font-medium">{formatMoney(line.total)}</p>
                  {line.discount.amount_minor > 0 && (
                    <p className="mt-1 text-xs text-success">
                      Original savings {formatMoney(line.discount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-6">
              <QuoteSummary quote={order.quote_snapshot} />
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Captured: {formatMoney(order.captured)} · Refunded:{" "}
              {formatMoney(order.refunded)}. A pending order total is not proof
              of payment.
            </p>
          </section>
          <section className="mt-6 rounded-panel border border-divider p-6">
            <h2 className="font-serif text-3xl">Keep this feeling.</h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              {purchasedBundle
                ? `Save the purchased composition: ${purchasedBundle.name}.`
                : "Save the first foundation, top layer, throw and up to five cushion positions from this order as an editable bed look. Extra duplicate foundation/top units and standalone inserts remain in your order, not this draft."}{" "}
              Prices are checked again when you shop it.
            </p>
            {(order.bundle_snapshots?.length ?? 0) > 1 && (
              <label className="mt-4 block">
                <span className="field-label">
                  Purchased bed bundle to save
                </span>
                <select
                  className="field"
                  value={purchasedBundle?.id ?? ""}
                  onChange={(event) => {
                    setBundleId(event.target.value);
                    setSaved(false);
                    setName("");
                  }}
                >
                  {order.bundle_snapshots!.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="mt-4 block">
              <span className="field-label">Look name</span>
              <input
                className="field"
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button-primary mt-4"
              disabled={
                action.pending ||
                saved ||
                !selection.slots.some((s) => s.state === "selected") ||
                commerce.persistence !== "ready"
              }
              onClick={() => {
                void action
                  .run(
                    {
                      type: "look.save",
                      look_id: null,
                      name: name.trim() || `Purchased bed · ${order.reference}`,
                      selection,
                      expected_look_revision: 0,
                    },
                    "Purchased bed look saved to My Sanctuary",
                  )
                  .then((result) => {
                    if (result) setSaved(true);
                  });
              }}
            >
              {action.pending
                ? "Saving…"
                : saved
                  ? "Saved to My Sanctuary"
                  : "Save purchased look"}
            </button>
            <ActionError message={action.error} />
          </section>
          <button
            type="button"
            className="text-link mt-5"
            onClick={() => setAvailability(!showAvailability)}
            aria-expanded={showAvailability}
          >
            {showAvailability ? "Hide" : "Review"} current availability
          </button>
          {showAvailability && (
            <div className="notice mt-3">
              {order.quote_snapshot.lines.map((line) => {
                const variant = commerce.state.variants.find(
                    (v) => v.id === line.variant_id,
                  ),
                  product = commerce.state.products.find(
                    (p) => p.id === line.product_id,
                  );
                return (
                  <p key={line.id} className="my-2 text-sm">
                    {line.title}:{" "}
                    {variant && product?.status === "published"
                      ? `${stockOf(commerce.state, variant) >= line.quantity ? "requested quantity available" : "requested quantity unavailable"}; ${formatMoney(priceOf(variant, commerce.clock))} per unit`
                      : "archived or unavailable"}
                    .
                  </p>
                );
              })}
              <Link
                className="text-link"
                href={`/create-your-bed?order=${order.id}`}
              >
                Review these bed layers in the builder
              </Link>
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:col-span-5">
          <section className="rounded-panel bg-surface-soft p-6">
            <h2 className="font-serif text-3xl">Delivery snapshot</h2>
            <p className="mt-4 text-sm leading-7">
              {order.shipping_address.recipient}
              <br />
              {order.shipping_address.line1}
              <br />
              {order.shipping_address.line2 && (
                <>
                  {order.shipping_address.line2}
                  <br />
                </>
              )}
              {order.shipping_address.city}, {order.shipping_address.region}{" "}
              {order.shipping_address.postal_code}
              <br />
              {order.shipping_address.country}
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              {order.customer_snapshot.email}
            </p>
            <p className="mt-3 text-xs text-ink-muted">
              Editing your address book will not change this accepted snapshot.
            </p>
          </section>
          <section className="rounded-panel border border-divider p-6">
            <h2 className="font-serif text-3xl">Order history</h2>
            <ol className="mt-5 space-y-5">
              {order.timeline.map((event) => (
                <li key={event.id} className="border-l-2 border-divider pl-4">
                  <p className="text-sm font-medium">
                    {event.type.replaceAll("_", " ")}
                  </p>
                  <time
                    className="mt-1 block text-xs text-ink-muted"
                    dateTime={event.at}
                  >
                    {new Date(event.at).toLocaleString("en-US", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </time>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {event.message}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <Link className="button-secondary w-full" href="/account?tab=orders">
            My Sanctuary · order history
          </Link>
        </aside>
      </div>
    </div>
  );
}
