"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import { canonicalJSON, quoteCart } from "@/lib/commerce-engine";
import { addressSchema } from "@/lib/commerce-contracts";
import { dimensions, formatMoney } from "@/lib/storefront";
import type { CommerceQuote, CustomerAddress } from "@/types/commerce";
import { QuoteSummary } from "../cart/CartContents";
import { BRAND } from "@/lib/brand";

const DRAFT_KEY = "bedding-checkout:draft:v1";
function subscribeDraft(listener: () => void) {
  window.addEventListener("bedding-checkout-draft", listener);
  return () => window.removeEventListener("bedding-checkout-draft", listener);
}
function readDraft() {
  try {
    return window.sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}
function quoteFingerprint(q: CommerceQuote) {
  return canonicalJSON({ ...q, quote_id: "", created_at: "", expires_at: "" });
}
export default function Checkout() {
  const commerce = useCommerce(),
    action = useCommerceAction(),
    router = useRouter();
  const [step, setStep] = useState(0),
    [mode, setMode] = useState<"guest" | "account">(
      commerce.role === "guest" ? "guest" : "account",
    );
  const [contact, setContact] = useState({
    display_name:
      commerce.role === "guest" ? "" : commerce.state.profile.display_name,
    email: commerce.role === "guest" ? "" : commerce.state.profile.email,
  });
  const blankAddress: CustomerAddress = {
    schema_version: 1,
    id: "checkout-delivery",
    owner_id: commerce.state.profile.id,
    revision: 0,
    recipient: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postal_code: "",
    country: "US",
    phone: null,
    label: "Checkout delivery",
    default_shipping: false,
    default_billing: false,
    updated_at: commerce.clock,
  };
  const [address, setAddress] = useState<CustomerAddress>(
    commerce.role === "guest"
      ? blankAddress
      : (commerce.state.addresses.find((a) => a.default_shipping) ??
          blankAddress),
  );
  const [saveAddress, setSaveAddress] = useState(false),
    [deliveryError, setDeliveryError] = useState(""),
    [accepted, setAccepted] = useState<CommerceQuote | null>(null),
    [acknowledged, setAcknowledged] = useState(false),
    [savedNotice, setSavedNotice] = useState("");
  const persistedDraft = useSyncExternalStore(
    subscribeDraft,
    readDraft,
    () => null,
  );
  const current = useMemo(() => {
    try {
      return quoteCart(commerce.state, commerce.state.cart, {
        now: commerce.clock,
        quote_id: `checkout-view-${commerce.state.revision}`,
      });
    } catch {
      return null;
    }
  }, [commerce.state, commerce.clock]);
  const changed =
    accepted &&
    current &&
    quoteFingerprint(accepted) !== quoteFingerprint(current);
  const ready = commerce.persistence === "ready" && !action.pending;
  function persist(nextContact = contact, nextAddress = address) {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ contact: nextContact, address: nextAddress, mode }),
      );
      window.dispatchEvent(new Event("bedding-checkout-draft"));
    } catch {
      setSavedNotice(
        "This browser could not retain checkout progress. Keep this tab open while reviewing.",
      );
    }
  }
  function updateAddress(key: keyof CustomerAddress, value: string) {
    const next = { ...address, [key]: key === "phone" ? value || null : value };
    setAddress(next);
    persist(contact, next);
  }
  async function review() {
    setDeliveryError("");
    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      setDeliveryError(
        parsed.error.issues
          .map((i) => `${i.path.join(" ")}: ${i.message}`)
          .join(". "),
      );
      return;
    }
    const market = commerce.state.markets.find(
      (m) =>
        m.country === address.country && m.id === commerce.state.cart.market,
    );
    if (!market) {
      setDeliveryError(
        "Shipping is unavailable for this country. Choose a configured QA destination.",
      );
      return;
    }
    if (saveAddress && mode === "account") {
      const existing = commerce.state.addresses.find(
        (a) => a.id === address.id,
      );
      const saved = await action.run({
        type: "address.save",
        address: { ...address, owner_id: commerce.state.profile.id },
        expected_address_revision: existing?.revision ?? 0,
      });
      if (!saved) return;
    }
    const result = await action.run({
      type: "cart.set_destination",
      destination: {
        country: address.country,
        region: address.region,
        shipping_method_id: market.shipping_method_id,
      },
      expected_cart_revision: commerce.state.cart.revision,
    });
    if (result?.quote) {
      setAccepted(result.quote);
      setStep(2);
      setAcknowledged(false);
      persist();
    }
  }
  if (!commerce.state.cart.lines.length)
    return (
      <div className="page-shell py-20 text-center">
        <h1 className="page-title">Your cart is ready for a fresh start.</h1>
        <p className="mt-5 text-ink-muted">
          If you already created an order, its receipt is in My Sanctuary.
          Checkout does not create another order from an empty cart.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link className="button-primary" href="/shop">
            Explore bedding
          </Link>
          <Link className="button-secondary" href="/account?tab=orders">
            View QA orders
          </Link>
        </div>
      </div>
    );
  return (
    <div className="page-shell py-10 lg:py-16">
      <p className="eyebrow">{BRAND.name} · A few details, then settle in</p>
      <h1 className="page-title mt-3">Make it yours.</h1>
      <ol
        className="my-8 flex flex-wrap gap-4 text-sm"
        aria-label="Checkout steps"
      >
        {["Contact", "Delivery", "Review & payment"].map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={`flex min-h-11 items-center gap-2 ${step === index ? "font-semibold text-primary" : "text-ink-muted"}`}
              disabled={index > step}
              aria-current={step === index ? "step" : undefined}
              onClick={() => setStep(index)}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full border ${step === index ? "border-primary bg-primary text-on-primary" : "border-divider"}`}
              >
                {index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <section className="rounded-panel border border-divider bg-surface p-5 sm:p-8 lg:col-span-7">
          {persistedDraft && step < 2 && (
            <button
              type="button"
              className="text-link mb-4"
              onClick={() => {
                try {
                  const saved = JSON.parse(persistedDraft);
                  const parsed = addressSchema.safeParse(saved.address);
                  if (
                    !parsed.success ||
                    typeof saved.contact?.display_name !== "string" ||
                    typeof saved.contact?.email !== "string"
                  )
                    throw new Error("Invalid checkout draft");
                  setAddress({
                    ...parsed.data,
                    owner_id: commerce.state.profile.id,
                  });
                  setContact({
                    display_name: saved.contact.display_name.slice(0, 160),
                    email: saved.contact.email.slice(0, 254),
                  });
                  setMode(saved.mode === "guest" ? "guest" : "account");
                  setStep(0);
                  setSavedNotice(
                    "Draft restored. Review contact and delivery to refresh price and stock.",
                  );
                } catch {
                  setSavedNotice(
                    "The saved draft could not be read. It was left unchanged.",
                  );
                }
              }}
            >
              Restore this tab’s saved checkout details
            </button>
          )}
          {savedNotice && (
            <p className="notice mb-4" role="status">
              {savedNotice}
            </p>
          )}
          {step === 0 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                persist();
                setStep(1);
              }}
            >
              <h2 className="font-serif text-3xl">
                Who are we making this for?
              </h2>
              <div className="my-6 flex flex-wrap gap-2">
                <button
                  className={
                    mode === "guest" ? "button-primary" : "button-secondary"
                  }
                  type="button"
                  onClick={() => {
                    setMode("guest");
                    commerce.setDemoRole("guest");
                    setContact({ display_name: "", email: "" });
                    setAddress(blankAddress);
                  }}
                >
                  Checkout as guest
                </button>
                <button
                  className={
                    mode === "account" ? "button-primary" : "button-secondary"
                  }
                  type="button"
                  onClick={() => {
                    setMode("account");
                    if (commerce.role === "guest")
                      commerce.setDemoRole("customer");
                    setContact({
                      display_name: commerce.state.profile.display_name,
                      email: commerce.state.profile.email,
                    });
                    setAddress(
                      commerce.state.addresses.find(
                        (a) => a.default_shipping,
                      ) ?? blankAddress,
                    );
                  }}
                >
                  Use QA account
                </button>
              </div>
              <p className="notice mb-6">
                {mode === "guest"
                  ? "No account is required. This guest order remains in this browser’s QA scope."
                  : "Using your device’s QA profile. No real account authentication is performed."}
              </p>
              <label>
                <span className="field-label">Your name</span>
                <input
                  className="field"
                  required
                  maxLength={160}
                  autoComplete="name"
                  value={contact.display_name}
                  onChange={(event) => {
                    const next = {
                      ...contact,
                      display_name: event.target.value,
                    };
                    setContact(next);
                    persist(next);
                  }}
                />
              </label>
              <label className="mt-5 block">
                <span className="field-label">Email for your order</span>
                <input
                  className="field"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={contact.email}
                  onChange={(event) => {
                    const next = { ...contact, email: event.target.value };
                    setContact(next);
                    persist(next);
                  }}
                />
              </label>
              <p className="mt-3 text-xs text-ink-muted">
                QA receipt data only. {BRAND.name} sends no email or marketing
                messages.
              </p>
              <button
                type="submit"
                className="button-primary mt-7"
                disabled={!ready}
              >
                Continue to delivery <ArrowUpRight size={16} />
              </button>
            </form>
          )}
          {step === 1 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void review();
              }}
            >
              <h2 className="font-serif text-3xl">Where should it belong?</h2>
              {mode === "account" && commerce.state.addresses.length > 0 && (
                <label className="mt-6 block">
                  <span className="field-label">Address book</span>
                  <select
                    className="field"
                    value={
                      commerce.state.addresses.some((a) => a.id === address.id)
                        ? address.id
                        : ""
                    }
                    onChange={(event) => {
                      const selected = commerce.state.addresses.find(
                        (a) => a.id === event.target.value,
                      );
                      setAddress(selected ?? blankAddress);
                    }}
                  >
                    <option value="">Use a new delivery address</option>
                    {commerce.state.addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} · {a.line1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  {
                    key: "recipient",
                    label: "Recipient",
                    auto: "shipping name",
                    required: true,
                  },
                  {
                    key: "line1",
                    label: "Address line 1",
                    auto: "shipping address-line1",
                    required: true,
                  },
                  {
                    key: "line2",
                    label: "Address line 2 (optional)",
                    auto: "shipping address-line2",
                    required: false,
                  },
                  {
                    key: "city",
                    label: "City",
                    auto: "shipping address-level2",
                    required: true,
                  },
                  {
                    key: "region",
                    label: "State / region (US code)",
                    auto: "shipping address-level1",
                    required: true,
                  },
                  {
                    key: "postal_code",
                    label: "Postal / ZIP code",
                    auto: "shipping postal-code",
                    required: true,
                  },
                ].map((field) => (
                  <label
                    key={field.key}
                    className={
                      field.key === "line1" || field.key === "line2"
                        ? "sm:col-span-2"
                        : ""
                    }
                  >
                    <span className="field-label">{field.label}</span>
                    <input
                      className="field"
                      required={field.required}
                      autoComplete={field.auto}
                      maxLength={field.key === "region" ? 2 : 160}
                      value={String(
                        address[field.key as keyof CustomerAddress] ?? "",
                      )}
                      onChange={(event) =>
                        updateAddress(
                          field.key as keyof CustomerAddress,
                          field.key === "region"
                            ? event.target.value.toUpperCase()
                            : event.target.value,
                        )
                      }
                    />
                  </label>
                ))}
                <label>
                  <span className="field-label">Country</span>
                  <select
                    className="field"
                    value={address.country}
                    autoComplete="shipping country"
                    onChange={(event) =>
                      updateAddress("country", event.target.value)
                    }
                  >
                    {commerce.state.markets.map((m) => (
                      <option key={m.id} value={m.country}>
                        {m.country === "US"
                          ? "United States · QA destination"
                          : m.country}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">
                    Delivery phone (optional, +country code)
                  </span>
                  <input
                    className="field"
                    type="tel"
                    autoComplete="shipping tel"
                    value={address.phone ?? ""}
                    onChange={(event) =>
                      updateAddress("phone", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="notice mt-6">
                <h3 className="font-medium text-ink">
                  Configured shipping method
                </h3>
                {commerce.state.markets
                  .filter((m) => m.id === commerce.state.cart.market)
                  .map((m) => (
                    <p key={m.id} className="mt-2">
                      {m.shipping_label}. {m.disclosure}
                    </p>
                  ))}
              </div>
              {mode === "account" && (
                <label className="filter-option mt-3">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(event) => setSaveAddress(event.target.checked)}
                  />
                  Save this delivery address to my QA address book
                </label>
              )}
              <ActionError message={deliveryError || action.error} />
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft size={15} />
                  Contact
                </button>
                <button
                  className="button-primary"
                  type="submit"
                  disabled={!ready}
                >
                  {action.pending ? "Checking delivery…" : "Review order"}
                </button>
              </div>
            </form>
          )}
          {step === 2 && (
            <>
              <h2 className="font-serif text-3xl">One last look.</h2>
              <div className="order-row">
                <div>
                  <h3 className="font-medium">Contact</h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    {contact.display_name}
                    <br />
                    {contact.email}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setStep(0)}
                >
                  Edit contact
                </button>
              </div>
              <div className="order-row">
                <div>
                  <h3 className="font-medium">Delivery</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {address.recipient}
                    <br />
                    {address.line1}
                    <br />
                    {address.line2 && (
                      <>
                        {address.line2}
                        <br />
                      </>
                    )}
                    {address.city}, {address.region} {address.postal_code}
                    <br />
                    {address.country}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setStep(1)}
                >
                  Edit delivery
                </button>
              </div>
              <div className="notice mt-5">
                <LockKeyhole size={21} className="mb-3" />
                <h3 className="font-semibold text-ink">
                  QA pending order · no charge
                </h3>
                <p className="mt-3">
                  No payment provider is connected. This creates one real
                  persisted QA order with a 15-minute inventory hold. Payment
                  remains pending; no card data is requested and no successful
                  payment is simulated.
                </p>
              </div>
              {changed && (
                <p role="alert" className="form-error">
                  Your cart, prices or availability changed. Review the updated
                  total and refresh your accepted quote.
                </p>
              )}
              <button
                type="button"
                className="text-link mt-3"
                onClick={() => {
                  try {
                    setAccepted(commerce.quoteCart());
                    setAcknowledged(false);
                  } catch (cause) {
                    setDeliveryError(
                      cause instanceof Error
                        ? cause.message
                        : "Quote unavailable",
                    );
                  }
                }}
              >
                Refresh price & availability
              </button>
              <label className="filter-option mt-4 items-start">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I reviewed the exact items, delivery details and test total. I
                  understand this is a device-only QA order with no payment or
                  delivery.
                </span>
              </label>
              <ActionError message={action.error || deliveryError} />
              <button
                type="button"
                className="button-primary mt-5 w-full"
                disabled={
                  !ready ||
                  !accepted ||
                  !acknowledged ||
                  !!changed ||
                  !!current?.warnings.some((w) => w.blocking)
                }
                onClick={() => {
                  if (!accepted) return;
                  void action
                    .run({
                      type: "checkout.create",
                      quote: accepted,
                      address_id: address.id,
                      address,
                      contact,
                      expected_cart_revision: commerce.state.cart.revision,
                    })
                    .then((result) => {
                      if (result?.id) {
                        try {
                          sessionStorage.removeItem(DRAFT_KEY);
                        } catch {
                          /* The committed order remains accessible in this device's order history. */
                        }
                        router.replace(`/orders/confirmation/${result.id}`);
                      }
                    });
                }}
              >
                {action.pending
                  ? "Creating your order…"
                  : `Create pending QA order · ${current ? formatMoney(current.total) : "review price"}`}
              </button>
              <p className="mt-4 text-xs leading-5 text-ink-muted">
                The hold starts only after the full order commits. Any required
                line failure creates no partial order or reservation. An expired
                or changed quote must be refreshed.
              </p>
            </>
          )}
        </section>
        <aside className="rounded-panel bg-surface-soft p-5 sm:p-7 lg:sticky lg:top-6 lg:col-span-5">
          <h2 className="mb-6 font-serif text-3xl">Your considered layers</h2>
          {current ? (
            <>
              {current.lines.map((line) => (
                <div
                  key={line.id}
                  className="mb-4 border-b border-divider pb-4"
                >
                  <p className="text-sm font-medium">
                    {line.quantity} × {line.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {line.color.name} · {line.size.label}
                    <br />
                    {dimensions(line.size)}
                  </p>
                  <p className="price mt-2 text-sm">
                    {formatMoney(line.total)}
                  </p>
                </div>
              ))}
              <QuoteSummary quote={current} />
              {current.warnings.map((w, i) => (
                <p
                  key={i}
                  className={w.blocking ? "form-error" : "notice mt-3"}
                >
                  {w.message}
                </p>
              ))}
            </>
          ) : (
            <p className="form-error">
              Current pricing is unavailable. Return to your cart and review
              your selections.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
