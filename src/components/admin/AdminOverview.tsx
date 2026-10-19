"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCommerce } from "@/context/CommerceContext";
import { isStaff } from "@/lib/commerce-engine";
import { Freshness, Panel, RoleSelect, Time } from "../ui/Panel";
import BrandLogo from "../layout/BrandLogo";
import { ExecutiveOverview, InventoryManager } from "./Operations";
import OrderManager from "./OrderManager";
import ProductManager from "./ProductManager";
import { ContentManager, Promotions } from "./MarketingManager";
const sections = [
  ["", "Executive overview"],
  ["products", "Products & variants"],
  ["orders", "Orders & fulfillment"],
  ["inventory", "Inventory"],
  ["promotions", "Promotions & bundles"],
  ["content", "Homepage CMS"],
  ["analytics", "Analytics"],
  ["settings", "Settings & integrations"],
];
export default function AdminOverview() {
  const c = useCommerce(),
    path = usePathname(),
    params = useSearchParams(),
    segments = path.split("/").filter(Boolean).slice(1),
    section = segments[0] ?? "",
    id = segments[1];
  if (!isStaff(c.role))
    return (
      <div className="admin-shell px-4 py-12">
        <div className="mx-auto max-w-xl space-y-6">
          <BrandLogo className="gap-2 [&>img]:size-10 [&>span>span:first-child]:text-base" />
          <Panel title="Admin access requires a staff role">
            <p>
              This device-only simulator enforces role permissions in the
              commerce engine. A view switch never grants staff access.
            </p>
            <RoleSelect />
            <Link className="button-secondary" href="/">
              Return to storefront
            </Link>
            <Link className="text-link ml-5" href="/sign-in?returnTo=/admin">
              Open demo sign-in
            </Link>
          </Panel>
        </div>
      </div>
    );
  const allowedSections: Record<string, string[]> = {
    "": ["administrator", "finance"],
    products: ["administrator", "catalog_editor", "inventory_manager"],
    orders: ["administrator", "fulfillment_operator", "finance"],
    inventory: ["administrator", "inventory_manager", "catalog_editor"],
    promotions: ["administrator", "marketing_manager"],
    content: ["administrator", "marketing_manager"],
    analytics: ["administrator", "finance"],
    settings: ["administrator"],
  };
  const canView = (allowedSections[section] ?? []).includes(c.role);
  const nav = (
    <>
      {sections
        .filter(([key]) => (allowedSections[key] ?? []).includes(c.role))
        .map(([key, title]) => (
          <Link
            key={key}
            href={`/admin${key ? `/${key}` : ""}`}
            aria-current={section === key ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
    </>
  );
  return (
    <div className="admin-shell lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen bg-admin-nav p-4 text-admin-on-nav lg:block">
        <div className="sticky top-5">
          <div className="rounded-control bg-surface p-3">
            <BrandLogo className="gap-2 [&>img]:size-10 [&>span>span:first-child]:text-base" />
          </div>
          <p className="px-4 pb-4 pt-6 text-xs uppercase tracking-[.15em] text-slate-400">
            Back office · device QA
          </p>
          <nav className="admin-nav space-y-1" aria-label="Admin CMS">
            {nav}
          </nav>
          <div className="mt-10 border-t border-slate-600 pt-4">
            <Link className="block min-h-11 px-4 py-3 text-sm" href="/">
              View Storefront ↗
            </Link>
            <Link className="block min-h-11 px-4 py-3 text-sm" href="/account">
              My Sanctuary ↗
            </Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-divider bg-admin-surface px-4 py-2 lg:px-8">
          <div className="flex items-center gap-3">
            <p className="font-semibold">
              RAZAI GHAR <span className="text-admin-muted">/ Admin CMS</span>
            </p>
            <Link className="text-link text-xs lg:hidden" href="/">
              Storefront ↗
            </Link>
          </div>
          <div className="w-full sm:w-72">
            <RoleSelect staffOnly />
          </div>
        </header>
        <details className="bg-admin-nav px-4 text-admin-on-nav lg:hidden">
          <summary className="min-h-12 cursor-pointer content-center">
            Back-office navigation
          </summary>
          <nav className="admin-nav pb-4" aria-label="Mobile Admin CMS">
            {nav}
          </nav>
        </details>
        <div className="space-y-6 p-4 lg:p-8">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs text-admin-muted">
                Device QA · Not a live ERP company
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {sections.find(([key]) => key === section)?.[1] ??
                  "Admin section unavailable"}
              </h1>
            </div>
            <Freshness />
          </div>
          {!canView ? (
            <Panel title="This section requires a different staff role">
              <p>
                Your current QA role cannot view this section. Choose an
                authorized role in the header, or use one of the permitted
                sections in the navigation.
              </p>
            </Panel>
          ) : section === "products" ? (
            <ProductManager id={id} />
          ) : section === "orders" ? (
            <OrderManager initialId={id} key={id ?? "list"} />
          ) : section === "inventory" ? (
            <InventoryManager lowOnly={params.get("low") === "1"} />
          ) : section === "promotions" ? (
            <Promotions />
          ) : section === "content" ? (
            <ContentManager />
          ) : section === "analytics" || section === "" ? (
            <ExecutiveOverview />
          ) : section === "settings" ? (
            <Settings />
          ) : (
            <Panel title="Section unavailable">
              <Link className="text-link" href="/admin">
                Return to overview
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
function Settings() {
  const c = useCommerce();
  return (
    <div className="space-y-6">
      <Panel title="Integration status">
        <dl className="space-y-4">
          {[
            ["Identity service", "Disconnected · QA role simulator only"],
            [
              "ERPNext / Frappe",
              "Disconnected · device commerce engine owns fixture state",
            ],
            [
              "Payments & refunds",
              "Disconnected · Finance actions are QA simulations",
            ],
            [
              "Shipment carrier API",
              "Disconnected · staff-entered evidence and tracking references",
            ],
            [
              "Builder analytics",
              "Disconnected · no qualified session or paid attribution collection",
            ],
            [
              "Storage / synchronization",
              `${c.persistence} · Web Locks transaction serialization · cross-tab events`,
            ],
          ].map(([name, value]) => (
            <div
              className="grid gap-2 border-b border-divider pb-3 sm:grid-cols-2"
              key={name}
            >
              <dt className="font-semibold">{name}</dt>
              <dd className="text-sm text-admin-muted">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-admin-muted">
          The QA simulator cannot authenticate real users or protect browser
          fixture data from a device owner. Production integrations must enforce
          scoped server sessions and controller-backed transactions.
        </p>
      </Panel>
      <Panel title="Recent audit activity">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Role</th>
                <th>Reason</th>
                <th>Revision</th>
              </tr>
            </thead>
            <tbody>
              {c.state.audit
                .slice(-30)
                .reverse()
                .map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-xs">
                      <Time at={a.at} />
                    </td>
                    <td>{a.action}</td>
                    <td>{a.role}</td>
                    <td>{a.reason || "Validated commerce command"}</td>
                    <td>
                      {a.before_revision} → {a.after_revision}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
