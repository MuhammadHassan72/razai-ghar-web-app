"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { analytics, label, reportingDay } from "@/lib/backoffice";
import { formatMoney } from "@/lib/storefront";
import { money } from "@/lib/commerce-engine";
import type { CommerceCommand, InventoryBalance } from "@/types/commerce";
import { Field, Panel, Select, TextArea } from "../ui/Panel";
import { Dialog } from "../ui/Dialog";
export function ExecutiveOverview() {
  const c = useCommerce(),
    [timezone, setTimezone] = useState("Asia/Karachi"),
    [currency, setCurrency] = useState(c.state.cart.currency);
  const today = reportingDay(c.clock, timezone),
    yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const first = new Date(yesterday);
  first.setUTCDate(first.getUTCDate() - 29);
  const [start, setStart] = useState(first.toISOString().slice(0, 10)),
    [end, setEnd] = useState(yesterday.toISOString().slice(0, 10));
  const data = analytics(c.state, start, end, timezone, currency),
    netFormat = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(data.net / 10 ** money(0, currency).precision);
  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label="From · reporting date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Field
            label="Through · reporting date"
            type="date"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <Select
            label="Reporting timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {["Asia/Karachi", "UTC", "America/New_York", "Europe/London"].map(
              (z) => (
                <option key={z}>{z}</option>
              ),
            )}
          </Select>
          <Select
            label="Reporting currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Array.from(new Set(c.state.markets.map((m) => m.currency))).map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </Select>
        </div>
        <p className="text-xs text-admin-muted">
          Default: last 30 complete reporting days. Device QA company scope ·
          financial event dates for revenue; operational queues show current
          state.
        </p>
        {start > end && (
          <p className="text-danger" role="alert">
            Choose an end date on or after the start date.
          </p>
        )}
      </Panel>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Total Revenue">
          <p className="text-3xl font-semibold">{netFormat}</p>
          <p className="text-sm font-semibold">Net merchandise revenue</p>
          <p className="text-xs text-admin-muted">
            Captures {formatMoney(data.captures)} · Refunds{" "}
            {formatMoney(data.refunds)}. Tax and shipping excluded; original
            discount allocations retained.
          </p>
          {data.missing > 0 && (
            <p className="text-xs text-warning">
              {data.missing} legacy orders have incomplete dated financial
              events. Unproven amounts are excluded from revenue.
            </p>
          )}
        </Panel>
        <Panel title="Active Orders">
          <p className="text-3xl font-semibold">{data.active.length}</p>
          <p className="text-sm">
            Paid orders with accepted unfulfilled quantities.
          </p>
          <Link
            className="text-link min-h-11 inline-flex items-center"
            href="/admin/orders"
          >
            Payment-Pending queue: {data.pending.length}
          </Link>
        </Panel>
        <Panel title="Bundle Conversion Rate">
          <p className="text-2xl font-semibold">Unavailable</p>
          <p className="text-xs text-admin-muted">
            Qualified builder sessions and verified 7-day attribution are not
            connected. QA and staff traffic is excluded. Numerator, denominator
            and immature cohorts cannot be measured from these fixtures.
          </p>
        </Panel>
        <Panel title="Low-Stock Alerts">
          <p className="text-3xl font-semibold">{data.low.length}</p>
          <p className="text-sm">
            Enabled SKU / warehouse balances at or below threshold.
          </p>
          <Link
            className="text-link min-h-11 inline-flex items-center"
            href="/admin/inventory?low=1"
          >
            Review available stock
          </Link>
        </Panel>
        <Panel title="Fulfillment queue">
          <div className="space-y-2">
            {[
              "placed",
              "processing",
              "quality_check",
              "qc_hold",
              "ready_to_ship",
              "partially_shipped",
            ].map((status) => (
              <div className="flex justify-between text-sm" key={status}>
                <span>{label(status)}</span>
                <span>
                  {
                    c.state.orders.filter(
                      (o) =>
                        o.fulfillment_state === status &&
                        o.payment_state !== "pending",
                    ).length
                  }
                </span>
              </div>
            ))}
          </div>
          <Link
            className="text-link min-h-11 inline-flex items-center"
            href="/admin/orders"
          >
            Inspect orders
          </Link>
        </Panel>
      </div>
      <Panel title="Category Breakdown">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <caption className="sr-only">
              Net merchandise revenue by order-time category
            </caption>
            <thead>
              <tr>
                <th>Order-time category</th>
                <th>Net revenue</th>
                <th>Share of net revenue</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.categories).map(([category, amount]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency,
                    }).format(amount / 10 ** money(0, currency).precision)}
                  </td>
                  <td>
                    {data.net > 0
                      ? `${((amount / data.net) * 100).toFixed(1)}%`
                      : "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-admin-muted">
          Returns reduce their original category after a posted refund.
          Operational analytics are not a general-ledger revenue report.
        </p>
      </Panel>
    </div>
  );
}
export function InventoryManager({
  productId,
  lowOnly = false,
}: {
  productId?: string;
  lowOnly?: boolean;
}) {
  const c = useCommerce(),
    action = useCommerceAction(),
    [search, setSearch] = useState(""),
    [low, setLow] = useState(lowOnly),
    [warehouse, setWarehouse] = useState("all"),
    [selected, setSelected] = useState<InventoryBalance | null>(null),
    [mode, setMode] = useState("adjust"),
    [delta, setDelta] = useState(0),
    [threshold, setThreshold] = useState(4),
    [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState(""),
    [error, setError] = useState(""),
    [review, setReview] = useState<CommerceCommand | null>(null),
    [page, setPage] = useState(0);
  const rows = c.state.inventory.filter((i) => {
    const v = c.state.variants.find((v) => v.id === i.variant_id);
    const p = c.state.products.find((p) => p.id === v?.product_id);
    return (
      (!productId || v?.product_id === productId) &&
      (!low ||
        (!!v?.active && i.on_hand - i.reserved <= i.reorder_threshold)) &&
      (warehouse === "all" || i.warehouse_id === warehouse) &&
      `${v?.sku} ${p?.title}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1)),
    canEdit = ["administrator", "inventory_manager"].includes(c.role);
  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Search SKU / product"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <Select
            label="Warehouse"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
          >
            <option value="all">All warehouses</option>
            {Array.from(
              new Set(c.state.inventory.map((i) => i.warehouse_id)),
            ).map((w) => (
              <option key={w}>{w}</option>
            ))}
          </Select>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="size-5"
              checked={low}
              onChange={(e) => setLow(e.target.checked)}
            />
            Low stock only
          </label>
        </div>
      </Panel>
      <div className="overflow-x-auto rounded-control border border-divider">
        <table className="admin-table">
          <thead>
            <tr>
              {[
                "SKU / product",
                "Warehouse",
                "On hand",
                "Reserved",
                "Available",
                "Threshold",
                "Actions",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 25, (current + 1) * 25).map((i) => {
              const v = c.state.variants.find((v) => v.id === i.variant_id)!;
              return (
                <tr key={i.id}>
                  <td>
                    <p className="font-semibold">{v?.sku}</p>
                    <p className="text-xs">
                      {
                        c.state.products.find((p) => p.id === v?.product_id)
                          ?.title
                      }
                    </p>
                    {!v?.active && (
                      <p className="text-xs text-admin-muted">
                        Disabled variant
                      </p>
                    )}
                  </td>
                  <td>{i.warehouse_id}</td>
                  <td>{i.on_hand}</td>
                  <td>{i.reserved}</td>
                  <td
                    className={
                      i.on_hand - i.reserved <= i.reorder_threshold
                        ? "font-semibold text-danger"
                        : ""
                    }
                  >
                    {i.on_hand - i.reserved}
                  </td>
                  <td>{i.reorder_threshold}</td>
                  <td>
                    <button
                      className="text-link min-h-11"
                      disabled={!canEdit}
                      onClick={() => {
                        setSelected(structuredClone(i));
                        setThreshold(i.reorder_threshold);
                        setDelta(0);
                        setReason("");
                        setEvidence("");
                        setError("");
                      }}
                    >
                      Reconcile
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <p className="bg-admin-surface p-6">No inventory balances match.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          className="button-secondary"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <span className="text-sm">
          {rows.length} balances · page {current + 1}
        </span>
        <button
          className="button-secondary"
          disabled={(current + 1) * 25 >= rows.length}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      <Dialog
        open={!!selected}
        title="Stock reconciliation"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              try {
                const command: CommerceCommand =
                  mode === "adjust"
                    ? {
                        type: "inventory.adjust",
                        inventory_id: selected.id,
                        delta,
                        expected_inventory_revision: selected.revision,
                        reason,
                        evidence,
                      }
                    : {
                        type: "inventory.threshold",
                        inventory_id: selected.id,
                        threshold,
                        expected_inventory_revision: selected.revision,
                        reason,
                      };
                c.preview(command);
                setReview(command);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Invalid adjustment",
                );
              }
            }}
          >
            <p className="text-sm">
              On hand {selected.on_hand} · reserved {selected.reserved} ·
              available {selected.on_hand - selected.reserved} · revision{" "}
              {selected.revision}
            </p>
            <Select
              label="Workflow"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="adjust">Physical count adjustment</option>
              <option value="threshold">Reorder threshold</option>
            </Select>
            {mode === "adjust" ? (
              <>
                <Field
                  label="Change in sale units · negative removes units"
                  type="number"
                  min="-1000000"
                  max="1000000"
                  step="1"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                  required
                />
                <p className="font-semibold">
                  After reconciliation: {selected.on_hand + delta} on hand ·{" "}
                  {selected.on_hand + delta - selected.reserved} available
                </p>
                <TextArea
                  label="Count sheet / evidence reference"
                  value={evidence}
                  onChange={setEvidence}
                />
              </>
            ) : (
              <Field
                label="New threshold"
                type="number"
                min="0"
                max="1000000"
                step="1"
                required
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            )}
            <TextArea label="Reason" value={reason} onChange={setReason} />
            <ActionError message={error || action.error} />
            <button className="button-secondary" disabled={action.pending}>
              Validate adjustment
            </button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!review}
        title="Confirm inventory change"
        onClose={() => setReview(null)}
      >
        <p>
          Commit this validated{" "}
          {mode === "adjust"
            ? `${delta > 0 ? "+" : ""}${delta} unit adjustment`
            : "threshold change"}
          ? Reserved quantities remain protected. The adjustment is audited.
        </p>
        <ActionError message={action.error} />
        <button
          className="button-primary mt-5"
          disabled={action.pending}
          onClick={() =>
            review &&
            void action
              .run(review, "Inventory updated across all panels")
              .then((r) => {
                if (r) {
                  setReview(null);
                  setSelected(null);
                }
              })
          }
        >
          Commit inventory change
        </button>
      </Dialog>
    </div>
  );
}
