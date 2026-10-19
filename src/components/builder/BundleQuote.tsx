"use client";
import type { CommerceQuote } from "@/types/commerce";
import { formatMoney } from "@/lib/storefront";
import { QuoteSummary } from "../cart/CartContents";
export interface BedPricing {
  key: string;
  quote: CommerceQuote | null;
  error: string;
  pending: boolean;
}
export function BundleQuote({
  pricing,
  current,
  expired,
  onRefresh,
}: {
  pricing: BedPricing;
  current: boolean;
  expired: boolean;
  onRefresh: () => void;
}) {
  const quote = pricing.quote,
    groups = quote?.bundle_tiers[0]?.groups ?? [],
    tier = (quote?.bundle_tiers[0]?.basis_points ?? 0) / 100;
  return (
    <section
      className="rounded-card border border-divider bg-surface p-5"
      aria-labelledby="bed-quote-heading"
      aria-busy={!current || pricing.pending}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bed-quote-heading" className="font-serif text-2xl">
          Every layer, itemized.
        </h2>
        <span className="badge">{tier}% group tier</span>
      </div>
      <ol
        className="my-4 grid grid-cols-3 gap-2"
        aria-label="Eligible layer groups"
      >
        {(["foundation", "top", "cushions"] as const).map((group, i) => (
          <li
            key={group}
            className={`rounded-control border px-2 py-3 text-center text-xs capitalize ${groups.includes(group) ? "border-success bg-success-soft text-success" : "border-divider text-ink-muted"}`}
          >
            <span className="mb-1 block text-base" aria-hidden="true">
              {groups.includes(group) ? "✓" : i + 1}
            </span>
            {group === "top" ? "Top layer" : group}
          </li>
        ))}
      </ol>
      <p className="mb-4 text-xs leading-5 text-ink-muted">
        1 eligible group → 0% · 2 → 5% · 3 → 10%. Repeated cushions, inserts and
        an extra throw never create a fourth group. Sale exclusions follow the
        published policy.
      </p>
      <p
        role="status"
        className={`mb-3 text-sm ${expired || pricing.error ? "text-warning" : "text-ink-muted"}`}
      >
        {!current || pricing.pending
          ? "Updating total… previous numbers are stale."
          : expired
            ? "This quote expired. Refresh before adding."
            : pricing.error ||
              "Current device-engine QA quote. Stock is not reserved."}
      </p>
      {quote && (
        <div className={!current || expired ? "opacity-60" : ""}>
          <details className="mb-5 rounded-control border border-divider p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
              {quote.lines.reduce((n, l) => n + l.quantity, 0)} sale units ·
              line prices & exclusions
            </summary>
            <ul className="space-y-4 py-3">
              {quote.lines.map((l) => (
                <li key={l.id} className="text-xs leading-5">
                  <p className="font-medium">
                    {l.quantity} × {l.title}
                  </p>
                  <p>
                    {l.color.name} · {l.size.label}
                  </p>
                  <p className="price">
                    {formatMoney(l.subtotal)} − {formatMoney(l.discount)} ={" "}
                    {formatMoney(l.total)}
                  </p>
                  {!l.bundle_eligible && (
                    <p className="mt-1 text-warning">
                      {l.on_sale
                        ? "Sale line excluded from additional bundle savings and group qualification by current policy."
                        : ["pillow_insert", "duvet_insert"].includes(
                              l.product_role,
                            )
                          ? "Insert: separately priced; never a qualifying layer group."
                          : "Not eligible for additional bundle savings."}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </details>
          <QuoteSummary quote={quote} />
          <p className="mt-3 text-xs text-ink-muted">
            Policy v{quote.policy_version} · quote {quote.quote_id.slice(0, 8)}{" "}
            · valid until{" "}
            {new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Karachi",
            }).format(new Date(quote.expires_at))}{" "}
            PKT
          </p>
          {quote.promo_code && (
            <p className="notice mt-3">{quote.comparison.explanation}</p>
          )}
          {quote.warnings.map((w, i) => (
            <p
              className={w.blocking ? "form-error" : "notice mt-3"}
              key={`${w.code}-${i}`}
            >
              {w.message}
            </p>
          ))}
        </div>
      )}
      <button type="button" className="text-link mt-3" onClick={onRefresh}>
        Refresh price & availability
      </button>
    </section>
  );
}
