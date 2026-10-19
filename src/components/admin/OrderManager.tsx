"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { allowedOrderActions, money } from "@/lib/commerce-engine";
import { label, minorInput } from "@/lib/backoffice";
import { formatMoney } from "@/lib/storefront";
import type {
  CommerceCommand,
  OrderProjection,
  OrderTransition,
} from "@/types/commerce";
import { OrderDetails } from "../account/OrderDetails";
import { Dialog } from "../ui/Dialog";
import { Check, Field, Panel, Select, TextArea, Time } from "../ui/Panel";
const tabs = [
  "All",
  "Payment pending",
  "Ready to process",
  "Quality check",
  "Ready to ship",
  "Exceptions",
  "Completed",
];
function matches(o: OrderProjection, tab: string) {
  return tab === "All"
    ? true
    : tab === "Payment pending"
      ? o.payment_state === "pending"
      : tab === "Ready to process"
        ? o.payment_state === "paid" && o.fulfillment_state === "placed"
        : tab === "Quality check"
          ? ["processing", "quality_check", "qc_hold"].includes(
              o.fulfillment_state,
            )
          : tab === "Ready to ship"
            ? o.qc?.result === "passed" && o.lines.some((l) => l.reserved > 0)
            : tab === "Exceptions"
              ? o.fulfillment_state === "qc_hold" ||
                [
                  "failed",
                  "expired",
                  "partially_refunded",
                  "refunded",
                ].includes(o.payment_state)
              : ["delivered", "cancelled"].includes(o.fulfillment_state);
}
export default function OrderManager({ initialId }: { initialId?: string }) {
  const c = useCommerce(),
    [tab, setTab] = useState("All"),
    [search, setSearch] = useState(""),
    [id, setId] = useState(initialId ?? ""),
    [page, setPage] = useState(0);
  const orders = [...c.state.orders]
    .filter(
      (o) =>
        matches(o, tab) &&
        `${o.reference} ${o.customer_snapshot.display_name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const order = c.state.orders.find((o) => o.id === id),
    current = Math.min(page, Math.max(0, Math.ceil(orders.length / 25) - 1));
  return (
    <div className="space-y-6">
      <Panel>
        <Field
          label="Search reference or customer"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <div className="flex flex-wrap gap-2" aria-label="Order queues">
          {tabs.map((t) => (
            <button
              className={`min-h-11 rounded-control border px-4 text-sm ${tab === t ? "border-admin-nav bg-admin-nav text-admin-on-nav" : "border-divider"}`}
              aria-pressed={tab === t}
              key={t}
              onClick={() => {
                setTab(t);
                setPage(0);
              }}
            >
              {t} ({c.state.orders.filter((o) => matches(o, t)).length})
            </button>
          ))}
        </div>
      </Panel>
      <div className="overflow-x-auto rounded-control border border-divider">
        <table className="admin-table">
          <caption className="sr-only">Orders · {tab}</caption>
          <thead>
            <tr>
              {[
                "Order",
                "Customer",
                "Payment",
                "Fulfillment",
                "Total",
                "Action",
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(current * 25, (current + 1) * 25).map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap font-semibold">
                  {o.reference}
                  <p className="mt-1 text-xs font-normal text-admin-muted">
                    <Time at={o.created_at} />
                  </p>
                </td>
                <td>{o.customer_snapshot.display_name}</td>
                <td>{label(o.payment_state)}</td>
                <td>{label(o.fulfillment_state)}</td>
                <td className="whitespace-nowrap">
                  {formatMoney(o.quote_snapshot.total)}
                </td>
                <td>
                  <button
                    className="text-link min-h-11"
                    onClick={() => setId(o.id)}
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="bg-admin-surface p-8">No orders in this queue.</p>
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
        <p className="content-center text-sm">Page {current + 1}</p>
        <button
          className="button-secondary"
          disabled={(current + 1) * 25 >= orders.length}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      <Dialog
        open={!!order}
        drawer
        inspection
        title={order ? `Order ${order.reference}` : "Order inspection"}
        onClose={() => setId("")}
      >
        {order && (
          <div className="space-y-6">
            <Link
              className="text-link inline-flex min-h-11 items-center"
              href={`/admin/orders/${order.id}`}
            >
              Open full order URL
            </Link>
            <OrderActionForm
              key={`${order.id}-${order.revision}-${c.role}`}
              order={order}
            />
            <OrderDetails order={order} staff />
          </div>
        )}
      </Dialog>
    </div>
  );
}
function OrderActionForm({ order }: { order: OrderProjection }) {
  const c = useCommerce(),
    action = useCommerceAction(),
    allowed = allowedOrderActions(order, c.role).sort(
      (a, b) =>
        Number(a.startsWith("fixture_")) - Number(b.startsWith("fixture_")),
    );
  const [kind, setKind] = useState<OrderTransition["action"]>(
      allowed[0] ?? "process",
    ),
    [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState(""),
    [inspection, setInspection] = useState(""),
    [operator, setOperator] = useState(c.state.profile.display_name),
    [checklist, setChecklist] = useState(""),
    [warehouse, setWarehouse] = useState(
      c.state.inventory[0]?.warehouse_id ?? "",
    ),
    [carrier, setCarrier] = useState(""),
    [service, setService] = useState(""),
    [tracking, setTracking] = useState(""),
    [note, setNote] = useState(""),
    [shipment, setShipment] = useState(
      order.shipments.find((s) => !s.delivered_at)?.id ?? "",
    ),
    [amount, setAmount] = useState(""),
    [restock, setRestock] = useState(false),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [error, setError] = useState(""),
    [review, setReview] = useState<{
      command: CommerceCommand;
      inventory: ReturnType<typeof c.preview>["inventory_changes"];
    } | null>(null);
  const remaining = order.captured.amount_minor - order.refunded.amount_minor;
  const eligible = (line: OrderProjection["lines"][number]) =>
    kind === "ship"
      ? line.reserved
      : kind === "receive_return"
        ? line.delivered - line.returned
        : line.quantity - line.shipped - line.cancelled;
  function prepare() {
    setError("");
    try {
      const lines = order.lines
        .map((l) => ({
          line_id: l.line_id,
          quantity: quantities[l.line_id] ?? 0,
        }))
        .filter((l) => l.quantity > 0);
      let transition: OrderTransition;
      if (kind === "process")
        transition = { action: kind, warehouse_id: warehouse, reason };
      else if (kind === "start_qc")
        transition = {
          action: kind,
          inspection_reference: inspection,
          operator,
          checklist: checklist
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      else if (kind === "qc_pass" || kind === "qc_hold")
        transition = { action: kind, reason };
      else if (kind === "ship")
        transition = {
          action: kind,
          shipment_id: crypto.randomUUID(),
          carrier,
          service,
          tracking_reference: tracking,
          dispatch_evidence: evidence,
          delivery_note_reference: note,
          lines,
        };
      else if (kind === "deliver")
        transition = { action: kind, shipment_id: shipment, evidence };
      else if (kind === "cancel") transition = { action: kind, reason, lines };
      else if (kind === "receive_return")
        transition = {
          action: kind,
          reason,
          receipt_reference: evidence,
          warehouse_id: warehouse,
          restock,
          lines,
        };
      else if (kind === "fixture_capture")
        transition = { action: kind, evidence };
      else
        transition = {
          action: "fixture_refund",
          reason,
          evidence,
          amount: money(
            minorInput(amount, order.captured.precision),
            order.captured.currency,
          ),
        };
      const command: CommerceCommand = {
        type: "order.transition",
        order_id: order.id,
        expected_order_revision: order.revision,
        transition,
      };
      const preview = c.preview(command);
      setReview({ command, inventory: preview.inventory_changes });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Check the action details.",
      );
    }
  }
  if (!allowed.length)
    return (
      <Panel title="Order actions">
        <p className="text-sm text-admin-muted">
          No legal actions are available for the current role and order state.
          Choose an authorized QA role in the Admin header.
        </p>
      </Panel>
    );
  return (
    <Panel title="Legal next actions">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          prepare();
        }}
      >
        <Select
          label="Next action"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as OrderTransition["action"]);
            setQuantities({});
            setReview(null);
          }}
        >
          {allowed.map((k) => (
            <option value={k} key={k}>
              {k.startsWith("fixture_")
                ? `QA simulation · ${label(k.replace("fixture_", ""))}`
                : label(k)}
            </option>
          ))}
        </Select>
        {["fixture_capture", "fixture_refund"].includes(kind) && (
          <p className="rounded-control bg-warning-soft p-4 text-sm text-warning">
            Device-only financial simulation. No payment provider is called and
            no money is transferred.
          </p>
        )}
        {[
          "process",
          "qc_pass",
          "qc_hold",
          "cancel",
          "receive_return",
          "fixture_refund",
        ].includes(kind) && (
          <TextArea
            label="Reason / outcome"
            value={reason}
            onChange={setReason}
          />
        )}{" "}
        {["process", "receive_return"].includes(kind) && (
          <Select
            label="Warehouse"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
          >
            {Array.from(
              new Set(c.state.inventory.map((i) => i.warehouse_id)),
            ).map((id) => (
              <option key={id}>{id}</option>
            ))}
          </Select>
        )}
        {kind === "start_qc" && (
          <>
            <Field
              label="Inspection reference"
              required
              value={inspection}
              onChange={(e) => setInspection(e.target.value)}
            />
            <Field
              label="Assessor / operator"
              required
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
            <TextArea
              label="Completed inspection checklist · one item per line"
              value={checklist}
              onChange={setChecklist}
            />
          </>
        )}
        {kind === "ship" && (
          <>
            <Field
              label="Carrier"
              required
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <Field
              label="Service"
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
            />
            <Field
              label="Tracking reference"
              required
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <Field
              label="Delivery note reference"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}
        {["ship", "cancel", "receive_return"].includes(kind) && (
          <fieldset className="space-y-3">
            <legend className="field-label">
              Select exact quantities · zero leaves a line unchanged
            </legend>
            {order.lines
              .filter((l) => eligible(l) > 0)
              .map((l) => (
                <Field
                  key={l.line_id}
                  label={`${order.quote_snapshot.lines.find((q) => q.id === l.line_id)?.title} · available ${eligible(l)}`}
                  type="number"
                  min="0"
                  max={eligible(l)}
                  step="1"
                  value={quantities[l.line_id] ?? 0}
                  onChange={(e) =>
                    setQuantities({
                      ...quantities,
                      [l.line_id]: Number(e.target.value),
                    })
                  }
                />
              ))}
          </fieldset>
        )}
        {kind === "deliver" && (
          <Select
            label="Parcel delivered"
            value={shipment}
            onChange={(e) => setShipment(e.target.value)}
          >
            {order.shipments
              .filter((s) => !s.delivered_at)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.carrier} · {s.tracking_reference}
                </option>
              ))}
          </Select>
        )}
        {[
          "ship",
          "deliver",
          "receive_return",
          "fixture_capture",
          "fixture_refund",
        ].includes(kind) && (
          <TextArea
            label={
              kind === "receive_return"
                ? "Physical receipt reference"
                : "Evidence / reconciliation reference"
            }
            value={evidence}
            onChange={setEvidence}
          />
        )}{" "}
        {kind === "receive_return" && (
          <Check checked={restock} onChange={setRestock}>
            Received stock is saleable · restock these physical units
          </Check>
        )}
        {kind === "fixture_refund" && (
          <>
            <p className="font-semibold">
              Remaining refundable funds:{" "}
              {formatMoney({ ...order.captured, amount_minor: remaining })}
            </p>
            <p className="text-xs text-admin-muted">
              Original order total {formatMoney(order.quote_snapshot.total)};
              net merchandise{" "}
              {formatMoney(order.quote_snapshot.merchandise_total)}. Refunds use
              original allocations and do not receive returned stock.
            </p>
            <Field
              label={`Refund amount (${order.captured.currency})`}
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </>
        )}
        <ActionError message={error || action.error} />
        <button className="button-secondary" disabled={action.pending}>
          Validate & review action
        </button>
      </form>
      <Dialog
        open={!!review}
        title="Confirm order action"
        onClose={() => setReview(null)}
      >
        {review && (
          <div className="space-y-4">
            <p>
              Apply {label(kind)} to {order.reference} at revision{" "}
              {order.revision}?
            </p>
            {kind === "fixture_refund" &&
              review.command.type === "order.transition" &&
              review.command.transition.action === "fixture_refund" && (
                <p className="font-semibold">
                  Simulated refund{" "}
                  {formatMoney(review.command.transition.amount)}. Remaining
                  captured value will decrease. Physical stock is unchanged.
                </p>
              )}
            {kind === "cancel" && (
              <p className="text-sm text-warning">
                Selected unfulfilled quantities will be cancelled and their
                stock reservations released. Captured funds require a separate
                Finance refund.
              </p>
            )}
            {review.inventory.map((change) => (
              <p key={change.id} className="text-sm">
                {change.id}: {JSON.stringify(change)}
              </p>
            ))}
            <ActionError message={action.error} />
            <button
              className="button-primary"
              disabled={action.pending}
              onClick={() =>
                void action
                  .run(
                    review.command,
                    "Order action committed; customer view updated",
                  )
                  .then((r) => {
                    if (r) setReview(null);
                  })
              }
            >
              Confirm {label(kind)}
            </button>
          </div>
        )}
      </Dialog>
    </Panel>
  );
}
