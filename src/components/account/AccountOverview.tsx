"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { dimensions, formatMoney } from "@/lib/storefront";
import { label } from "@/lib/backoffice";
import { Freshness, Panel, Field, Select, Time } from "../ui/Panel";
import { OrderDetails, OrderTracker, BuyAgain } from "./OrderDetails";
import { SavedLooks, CustomerWishlist } from "./SavedCollections";
import { CustomerProfileEditor, CustomerAddresses } from "./CustomerSettings";
const sections = [
  ["", "Overview"],
  ["orders", "Orders"],
  ["looks", "Saved bed looks"],
  ["wishlist", "Wishlist"],
  ["profile", "Profile & beds"],
  ["addresses", "Addresses"],
];
export default function AccountOverview() {
  const c = useCommerce(),
    path = usePathname(),
    params = useSearchParams();
  const segments = path.split("/").filter(Boolean).slice(1),
    section = segments[0] ?? params.get("tab") ?? "",
    detail = segments[1];
  if (c.role === "guest")
    return (
      <div className="page-shell py-16">
        <p className="eyebrow">RAZAI GHAR · My Sanctuary</p>
        <h1 className="page-title mt-3">Your sanctuary starts here.</h1>
        <p className="mt-5 max-w-xl text-ink-muted">
          Explore this device’s customer demo. Your cart and builder draft stay
          with you.
        </p>
        <Link
          className="button-primary mt-6"
          href={`/sign-in?returnTo=${encodeURIComponent(path)}`}
        >
          Open sign-in & demo sessions
        </Link>
      </div>
    );
  const nav = (
    <>
      {sections.map(([key, title]) => (
        <Link
          key={key}
          aria-current={section === key ? "page" : undefined}
          href={`/account${key ? `/${key}` : ""}`}
        >
          {title}
        </Link>
      ))}
      <button
        onClick={() => {
          c.setDemoRole("guest");
          c.setViewMode("storefront");
        }}
      >
        Leave customer demo
      </button>
      <Link href="/">Back to the shop</Link>
    </>
  );
  return (
    <div className="page-shell py-8 lg:py-12">
      <div className="mb-8 flex flex-wrap justify-between gap-4">
        <div>
          <p className="eyebrow">RAZAI GHAR</p>
          <h1 className="mt-2 font-serif text-4xl">My Sanctuary</h1>
        </div>
        <Freshness />
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="My Sanctuary" className="sanctuary-nav">
            {nav}
          </nav>
        </aside>
        <details className="rounded-control border border-divider bg-surface p-4 lg:hidden">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">
            My Sanctuary · Navigation
          </summary>
          <nav className="sanctuary-nav mt-3" aria-label="Mobile My Sanctuary">
            {nav}
          </nav>
        </details>
        <div className="min-w-0 space-y-6">
          <h2 className="font-serif text-3xl">
            {sections.find(([key]) => key === section)?.[1] ??
              "Page unavailable"}
          </h2>
          {!sections.some(([key]) => key === section) ? (
            <Panel title="Account section unavailable">
              <Link className="text-link" href="/account">
                Return to overview
              </Link>
            </Panel>
          ) : section === "orders" ? (
            detail ? (
              <OrderRoute id={detail} />
            ) : (
              <OrdersList />
            )
          ) : section === "looks" ? (
            <SavedLooks />
          ) : section === "wishlist" ? (
            <CustomerWishlist />
          ) : section === "profile" ? (
            <CustomerProfileEditor />
          ) : section === "addresses" ? (
            <CustomerAddresses />
          ) : (
            <Overview />
          )}
        </div>
      </div>
    </div>
  );
}
function Overview() {
  const c = useCommerce(),
    order = [...c.state.orders]
      .filter(
        (o) =>
          o.owner_id === c.state.profile.id &&
          !["cancelled", "delivered"].includes(o.fulfillment_state),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0],
    bed = c.state.bed_preferences.find((b) => b.is_default),
    size = c.state.sizes.find((s) => s.id === bed?.bed_size_id);
  return (
    <>
      <div className="rounded-card bg-surface-soft p-6">
        <p className="eyebrow">A softer place to return to</p>
        <h3 className="mt-3 font-serif text-4xl">
          Hello, {c.state.profile.display_name.split(" ")[0]}.
        </h3>
        <p className="mt-3 text-ink-muted">
          Your orders, considered layers and favourite bed looks, all together.
        </p>
      </div>
      {order && (
        <Panel title={`Latest active order · ${order.reference}`}>
          <OrderTracker order={order} />
          <Link
            className="text-link inline-flex min-h-11 items-center"
            href={`/account/orders/${order.id}`}
          >
            View order & shipments
          </Link>
        </Panel>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Panel title="Your saved looks">
          <p>{c.active_looks.length} compositions kept for later.</p>
          {c.active_looks.slice(0, 3).map((l) => (
            <Link
              className="block min-h-11 text-link"
              key={l.id}
              href={`/create-your-bed?look=${l.id}`}
            >
              {l.name}
            </Link>
          ))}
          <Link className="text-link" href="/account/looks">
            Manage all saved looks
          </Link>
        </Panel>
        <Panel title="Your wishlist">
          <p>{c.wishlist_count} favourites.</p>
          {c.state.wishlist.slice(0, 3).map((w) => (
            <p key={w.id} className="text-sm">
              {c.state.products.find((p) => p.id === w.product_id)?.title ??
                "Unavailable product"}
            </p>
          ))}
          <Link
            className="text-link inline-flex min-h-11 items-center"
            href="/account/wishlist"
          >
            Explore your wishlist
          </Link>
        </Panel>
      </div>
      <Panel title="Your default bed">
        {bed ? (
          <>
            <p className="font-semibold">
              {bed.name} · {size?.label}
            </p>
            <p>
              {bed.mattress_width_mm} × {bed.mattress_length_mm} mm · depth{" "}
              {bed.mattress_depth_mm} mm
            </p>
            {size && (
              <p className="text-xs text-ink-muted">
                Regional reference: {dimensions(size)}
              </p>
            )}
          </>
        ) : (
          <p>No default bed chosen.</p>
        )}
        <Link className="text-link" href="/account/profile">
          Manage named beds & preferences
        </Link>
      </Panel>
    </>
  );
}
function OrderRoute({ id }: { id: string }) {
  const c = useCommerce(),
    order = c.state.orders.find(
      (o) => o.id === id && o.owner_id === c.state.profile.id,
    );
  return order ? (
    <OrderDetails order={order} />
  ) : (
    <Panel title="Order unavailable">
      <p>This order is not in this customer’s device data.</p>
      <Link className="text-link" href="/account/orders">
        Back to orders
      </Link>
    </Panel>
  );
}
function OrdersList() {
  const c = useCommerce(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [page, setPage] = useState(0);
  const orders = [...c.state.orders]
    .filter(
      (o) =>
        o.owner_id === c.state.profile.id &&
        o.reference.toLowerCase().includes(search.toLowerCase()) &&
        (status === "all" || o.fulfillment_state === status) &&
        (!start || o.created_at.slice(0, 10) >= start) &&
        (!end || o.created_at.slice(0, 10) <= end),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(orders.length / 20) - 1),
  );
  return (
    <>
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Search order reference"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <Select
            label="Fulfillment"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All orders</option>
            {Array.from(
              new Set(c.state.orders.map((o) => o.fulfillment_state)),
            ).map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
          <Field
            label="Placed from (UTC date)"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Field
            label="Placed through (UTC date)"
            type="date"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </Panel>
      <p className="text-sm text-ink-muted">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </p>
      {orders.slice(current * 20, (current + 1) * 20).map((o) => (
        <Panel key={o.id} title={o.reference}>
          <div className="flex flex-wrap justify-between gap-4">
            <p className="text-sm">
              Placed <Time at={o.created_at} />
            </p>
            <p className="font-semibold">
              {formatMoney(o.quote_snapshot.total)}
            </p>
          </div>
          <OrderTracker order={o} />
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" href={`/account/orders/${o.id}`}>
              View order
            </Link>
            <BuyAgain order={o} />
          </div>
        </Panel>
      ))}
      {orders.length === 0 && (
        <Panel title="No matching orders">
          <p>Try another reference or date range.</p>
        </Panel>
      )}
      <div className="flex items-center justify-between">
        <button
          className="button-secondary"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <p className="text-sm">
          Page {current + 1} of {Math.max(1, Math.ceil(orders.length / 20))}
        </p>
        <button
          className="button-secondary"
          disabled={(current + 1) * 20 >= orders.length}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
