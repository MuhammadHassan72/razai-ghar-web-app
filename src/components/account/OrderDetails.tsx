"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import { formatMoney, dimensions } from "@/lib/storefront";
import { label, reorderItems } from "@/lib/backoffice";
import type { OrderProjection } from "@/types/commerce";
import { Dialog } from "../ui/Dialog";
import { Panel, Time } from "../ui/Panel";
export function OrderTracker({ order }: { order: OrderProjection }) {
  const steps = [
    { title: "Order Placed", types: ["placed", "order_created"] },
    { title: "Processing", types: ["process"] },
    { title: "Quality Check", types: ["start_qc"] },
    { title: "Shipped", types: ["ship"] },
    { title: "Delivered", types: ["deliver"] },
  ];
  return (
    <div>
      <ol
        className="grid grid-cols-1 gap-3 sm:grid-cols-5"
        aria-label="Order milestones"
      >
        {steps.map((step, i) => {
          const event = order.timeline.find((t) => step.types.includes(t.type));
          const at = i === 0 ? order.created_at : event?.at;
          const partial =
            (i === 3 &&
              order.lines.some((l) => l.quantity > l.shipped + l.cancelled)) ||
            (i === 4 && order.fulfillment_state !== "delivered");
          return (
            <li
              key={step.title}
              className={`border-t-4 pt-3 ${at ? "border-primary" : "border-divider"}`}
            >
              <span
                className={`mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs ${at ? "bg-primary text-on-primary" : "bg-surface-inset"}`}
              >
                {i + 1}
              </span>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {at ? (
                  <>
                    <Time at={at} />
                    {partial && " · partial"}
                  </>
                ) : (
                  "Awaiting milestone"
                )}
              </p>
            </li>
          );
        })}
      </ol>
      {order.qc?.result === "hold" && (
        <p className="mt-4 rounded-control bg-warning-soft p-4 text-warning">
          Quality hold: {order.qc.reason}. Inspection{" "}
          {order.qc.inspection_reference}.
        </p>
      )}
      {["cancelled", "partially_cancelled"].includes(
        order.fulfillment_state,
      ) && (
        <p className="mt-3 text-danger">
          {label(order.fulfillment_state)} · cancelled quantities are listed
          below.
        </p>
      )}
      <p className="mt-4 text-sm text-ink-muted">
        Payment: {label(order.payment_state)} · Fulfillment:{" "}
        {label(order.fulfillment_state)} · Returns: {label(order.return_state)}
      </p>
    </div>
  );
}
export function BuyAgain({ order }: { order: OrderProjection }) {
  const c = useCommerce(),
    action = useCommerceAction(),
    ui = useStorefront(),
    [open, setOpen] = useState(false);
  const rows = reorderItems(c.state, order, c.clock),
    available = rows.filter((r) => r.available);
  return (
    <>
      <button className="button-secondary" onClick={() => setOpen(true)}>
        Buy again
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Review today’s prices"
      >
        <p className="mb-4 text-sm text-ink-muted">
          Original quantities are revalidated against current stock. Items are
          added together as separate sale lines; current cart pricing and
          promotions apply.
        </p>
        <div className="space-y-4">
          {rows.map((r) => (
            <div className="border-b border-divider pb-3" key={r.line.id}>
              <h3 className="font-semibold">
                {r.line.title} × {r.line.quantity}
              </h3>
              <p className="text-sm">
                {r.line.color.name} · {dimensions(r.line.size)}
              </p>
              <p>
                {r.available && r.current ? (
                  <>
                    {formatMoney(r.current)} per {r.variant?.sale_uom}{" "}
                    {r.changed && (
                      <span className="text-warning">· Price changed</span>
                    )}
                  </>
                ) : (
                  <span className="text-danger">
                    Unavailable · excluded from this purchase
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
        <ActionError message={action.error} />
        <button
          className="button-primary mt-6 w-full"
          disabled={action.pending || available.length === 0}
          onClick={() =>
            void action
              .run(
                {
                  type: "cart.add_items",
                  items: available.map((r) => ({
                    variant_id: r.line.variant_id,
                    quantity: r.line.quantity,
                    expected_unit_price: r.current,
                  })),
                  expected_cart_revision: c.state.cart.revision,
                },
                "Available items added at current prices",
              )
              .then((result) => {
                if (result) {
                  setOpen(false);
                  ui.setOverlay({ kind: "cart" });
                }
              })
          }
        >
          Add {available.length} available line
          {available.length !== 1 ? "s" : ""} to cart
        </button>
      </Dialog>
    </>
  );
}
export function OrderDetails({
  order,
  staff = false,
}: {
  order: OrderProjection;
  staff?: boolean;
}) {
  return (
    <div className="space-y-6">
      <Panel title={order.reference}>
        <p className="text-sm text-ink-muted">
          Placed <Time at={order.created_at} /> · Snapshot r
          {order.cart_revision} · QA fixture
        </p>
        <OrderTracker order={order} />
        {!staff && (
          <div className="flex flex-wrap gap-3">
            <BuyAgain order={order} />
            <Link
              className="button-secondary"
              href={`/orders/confirmation/${order.id}`}
            >
              Receipt & save purchased look
            </Link>
          </div>
        )}
      </Panel>
      <Panel title="Purchased items · immutable snapshot">
        {order.quote_snapshot.lines.map((line) => {
          const counts = order.lines.find((l) => l.line_id === line.id)!;
          return (
            <div key={line.id} className="order-row">
              <div>
                <h3 className="font-semibold">
                  {line.title} × {line.quantity}
                </h3>
                <p className="text-sm">
                  {line.sku} · {line.color.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {dimensions(line.size)} ·{" "}
                  {line.contents
                    .map((p) => `${p.quantity} ${p.name}`)
                    .join(", ")}
                </p>
                <p className="mt-2 text-xs">
                  Shipped {counts.shipped} · Delivered {counts.delivered} ·
                  Cancelled {counts.cancelled} · Returned {counts.returned}
                </p>
              </div>
              <div className="text-right">
                <p>{formatMoney(line.total)}</p>
                <p className="text-xs text-ink-muted">
                  Discount {formatMoney(line.discount)} · {line.discount_source}
                </p>
              </div>
            </div>
          );
        })}
        <dl className="ml-auto max-w-sm space-y-2">
          {[
            ["Merchandise", order.quote_snapshot.merchandise_total],
            ["Shipping", order.quote_snapshot.shipping],
            ["Tax", order.quote_snapshot.tax],
            ["Order total", order.quote_snapshot.total],
            ["Captured", order.captured],
            ["Refunded", order.refunded],
          ].map(([title, value]) => (
            <div key={title as string} className="flex justify-between gap-5">
              <dt>{title as string}</dt>
              <dd className="font-semibold">
                {formatMoney(value as OrderProjection["captured"])}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-ink-muted">
          Bundle policy v{order.policy_snapshot.version}; original discount
          allocations are retained for refunds.
        </p>
      </Panel>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Delivery address">
          <address className="not-italic">
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
          </address>
          <p className="text-sm">
            Order-time address. Profile changes do not change this receipt.
          </p>
        </Panel>
        <Panel title="Shipments">
          {order.shipments.length === 0 && (
            <p className="text-ink-muted">No parcel dispatched yet.</p>
          )}
          {order.shipments.map((s) => (
            <article key={s.id} className="border-b border-divider pb-3">
              <h3 className="font-semibold">
                {s.carrier} · {s.service}
              </h3>
              <p>Tracking: {s.tracking_reference}</p>
              <p className="text-xs">
                Dispatched <Time at={s.dispatched_at} />
              </p>
              <p className="text-xs">
                {s.delivered_at ? (
                  <>
                    Delivered <Time at={s.delivered_at} />
                  </>
                ) : (
                  "In transit"
                )}
              </p>
              <ul className="mt-2 text-sm">
                {s.lines.map((l) => (
                  <li key={l.line_id}>
                    {
                      order.quote_snapshot.lines.find((q) => q.id === l.line_id)
                        ?.title
                    }{" "}
                    × {l.quantity}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Panel>
      </div>
      <Panel title="Order activity">
        <ol className="space-y-4">
          {[...order.timeline].reverse().map((event) => (
            <li className="border-l-2 border-divider pl-4" key={event.id}>
              <p className="font-semibold">{label(event.type)}</p>
              <p className="text-sm">{event.message}</p>
              <p className="text-xs text-ink-muted">
                <Time at={event.at} />
                {event.evidence && ` · ${event.evidence}`}
              </p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
