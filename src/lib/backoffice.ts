import type {
  CommerceState,
  OrderProjection,
  Product,
  Role,
} from "@/types/commerce";
import { allocateLargestRemainder, money } from "./commerce-engine";

export const STAFF_ROLES: Role[] = [
  "administrator",
  "catalog_editor",
  "marketing_manager",
  "fulfillment_operator",
  "inventory_manager",
  "finance",
];
export const CATEGORIES: Product["category"][] = [
  "Sheets",
  "Duvet Covers",
  "Blankets & Throws",
  "Cushions",
  "Inserts",
];
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export function safeReturn(value: string | null) {
  if (
    !value ||
    !/^\/(?:account|admin|cart|checkout|create-your-bed)(?:[/?#]|$)/.test(
      value,
    ) ||
    /[\\\s]|%2f|%5c|%0[ad]/i.test(value)
  )
    return "/account";
  return value;
}
export function minorInput(value: string, precision = 2): number {
  if (!Number.isInteger(precision) || precision < 0 || precision > 6)
    throw new Error("Unsupported currency precision.");
  if (
    !(
      precision === 0
        ? /^\d+$/
        : new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`)
    ).test(value)
  )
    throw new Error(
      `Enter a nonnegative amount with at most ${precision} decimal places.`,
    );
  const [whole, fraction = ""] = value.split(".");
  const result = Number(
    BigInt(whole) * BigInt(10) ** BigInt(precision) +
      BigInt(fraction.padEnd(precision, "0")),
  );
  if (!Number.isSafeInteger(result))
    throw new Error("Amount exceeds the supported range.");
  return result;
}
export function reportingDay(at: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function analytics(
  state: CommerceState,
  start: string,
  end: string,
  timezone: string,
  currency: string,
) {
  const categories = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  let captures = 0,
    refunds = 0,
    missing = 0;
  for (const order of state.orders) {
    if (order.captured.currency !== currency) continue;
    const events = [...(order.financial_events ?? [])];
    const captureHistory = order.timeline.filter(
      (e) => e.type === "fixture_capture",
    );
    // The QA capture command captures the full immutable order total.
    // A single legacy capture has a proven amount and timeline timestamp.
    if (
      !events.some((e) => e.type === "capture") &&
      captureHistory.length === 1 &&
      order.captured.amount_minor === order.quote_snapshot.total.amount_minor
    ) {
      const event = captureHistory[0];
      events.unshift({
        id: event.id,
        type: "capture",
        at: event.at,
        amount: order.captured,
        evidence: event.evidence ?? "Legacy QA full-capture event",
      });
    }
    if (
      events
        .filter((e) => e.type === "capture")
        .reduce((n, e) => n + e.amount.amount_minor, 0) <
        order.captured.amount_minor ||
      events
        .filter((e) => e.type === "refund")
        .reduce((n, e) => n + e.amount.amount_minor, 0) <
        order.refunded.amount_minor
    )
      missing++;
    const weights = [
      ...order.quote_snapshot.lines.map((l) => ({
        id: l.id,
        amount: l.total.amount_minor,
      })),
      { id: "_shipping", amount: order.quote_snapshot.shipping.amount_minor },
      { id: "_tax", amount: order.quote_snapshot.tax.amount_minor },
    ];
    const cumulative = { capture: 0, refund: 0 };
    for (const event of events) {
      const previous = allocateLargestRemainder(
        cumulative[event.type],
        weights,
      );
      cumulative[event.type] += event.amount.amount_minor;
      const next = allocateLargestRemainder(cumulative[event.type], weights);
      const day = reportingDay(event.at, timezone);
      if (day < start || day > end) continue;
      for (const line of order.quote_snapshot.lines) {
        const delta = next[line.id] - previous[line.id];
        if (event.type === "capture") captures += delta;
        else refunds += delta;
        categories[line.category] += event.type === "capture" ? delta : -delta;
      }
    }
  }
  const active = state.orders.filter(
    (o) =>
      o.payment_state !== "pending" &&
      o.captured.amount_minor > 0 &&
      o.payment_state !== "refunded" &&
      !["cancelled", "delivered"].includes(o.fulfillment_state) &&
      o.lines.some((l) => l.quantity > l.shipped + l.cancelled),
  );
  const low = state.inventory.filter((i) => {
    const v = state.variants.find((v) => v.id === i.variant_id);
    return (
      v?.active &&
      state.products.some(
        (p) => p.id === v.product_id && p.status === "published",
      ) &&
      i.on_hand - i.reserved <= i.reorder_threshold
    );
  });
  return {
    captures: money(captures, currency),
    refunds: money(refunds, currency),
    net: captures - refunds,
    categories,
    missing,
    active,
    low,
    pending: state.orders.filter((o) => o.payment_state === "pending"),
  };
}
export function reorderItems(
  state: CommerceState,
  order: OrderProjection,
  at: string,
) {
  return order.quote_snapshot.lines.map((line) => {
    const v = state.variants.find((v) => v.id === line.variant_id);
    const inventory = state.inventory.find(
      (i) => i.id === v?.availability.inventory_id,
    );
    const available =
      !!v?.active &&
      state.products.some(
        (p) => p.id === v.product_id && p.status === "published",
      ) &&
      (inventory?.on_hand ?? 0) - (inventory?.reserved ?? 0) >= line.quantity;
    const current =
      v?.sale && v.sale.starts_at <= at && v.sale.ends_at > at
        ? v.sale.price
        : v?.price;
    return {
      line,
      variant: v,
      available,
      current,
      changed: current?.amount_minor !== line.unit_price.amount_minor,
    };
  });
}
