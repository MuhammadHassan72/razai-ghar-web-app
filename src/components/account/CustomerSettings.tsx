"use client";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import type {
  BedPreference,
  CustomerAddress,
  CustomerProfile,
} from "@/types/commerce";
import { Check, Field, Panel, Select } from "../ui/Panel";
import { Dialog } from "../ui/Dialog";
import { dimensions } from "@/lib/storefront";
export function CustomerProfileEditor() {
  const c = useCommerce();
  return (
    <div className="space-y-6">
      <ProfileForm key={c.state.profile.revision} source={c.state.profile} />
      <BedPreferences />
    </div>
  );
}
function ProfileForm({ source }: { source: CustomerProfile }) {
  const [profile, setProfile] = useState(source),
    action = useCommerceAction();
  return (
    <Panel title="Profile & communication preferences">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(
            {
              type: "profile.update",
              profile,
              expected_profile_revision: source.revision,
            },
            "Profile saved",
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Display name"
            required
            maxLength={160}
            autoComplete="name"
            value={profile.display_name}
            onChange={(e) =>
              setProfile({ ...profile, display_name: e.target.value })
            }
          />
          <Field
            label="Email · verification service not connected"
            type="email"
            value={profile.email}
            readOnly
          />
          <Field
            label="Phone · international format, optional"
            type="tel"
            autoComplete="tel"
            value={profile.phone ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, phone: e.target.value || null })
            }
          />
          <Select
            label="Language & region"
            value={profile.locale}
            onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
          >
            {["en-US", "en-GB", "en-PK"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
          <Select
            label="Preferred units"
            value={profile.preferred_units}
            onChange={(e) =>
              setProfile({
                ...profile,
                preferred_units: e.target
                  .value as CustomerProfile["preferred_units"],
              })
            }
          >
            <option value="metric">Millimetres</option>
            <option value="imperial">Inches</option>
          </Select>
        </div>
        <Check
          checked={profile.communication_preferences.email_marketing}
          onChange={(value) =>
            setProfile({
              ...profile,
              communication_preferences: {
                ...profile.communication_preferences,
                email_marketing: value,
              },
            })
          }
        >
          Email marketing consent
        </Check>
        <Check
          checked={profile.communication_preferences.sms_marketing}
          onChange={(value) =>
            setProfile({
              ...profile,
              communication_preferences: {
                ...profile.communication_preferences,
                sms_marketing: value,
              },
            })
          }
        >
          SMS marketing consent
        </Check>
        <p className="text-xs text-ink-muted">
          These preferences are stored on this device. No messages are sent by
          this preview. Email changes require verified identity integration.
        </p>
        <ActionError message={action.error} />
        <button className="button-primary" disabled={action.pending}>
          Save profile
        </button>
      </form>
    </Panel>
  );
}
function BedPreferences() {
  const c = useCommerce(),
    action = useCommerceAction(),
    [editing, setEditing] = useState<BedPreference | null>(null),
    [deleting, setDeleting] = useState<BedPreference | null>(null);
  function add() {
    const size = c.state.sizes.find((s) => s.product_role === "mattress")!;
    setEditing({
      schema_version: 1,
      id: crypto.randomUUID(),
      owner_id: c.state.profile.id,
      revision: 0,
      name: "",
      market: size.market,
      bed_size_id: size.id,
      mattress_width_mm: size.width_mm,
      mattress_length_mm: size.length_mm,
      mattress_depth_mm: 300,
      preferred_units: c.state.profile.preferred_units,
      preferred_feel: null,
      preferred_fibers: [],
      preferred_color_families: [],
      is_default: c.state.bed_preferences.length === 0,
      updated_at: c.clock,
    });
  }
  return (
    <Panel title="Named beds">
      <p className="text-sm text-ink-muted">
        Store measured mattress dimensions. Regional labels are a starting
        point; fitted pocket depth still needs checking.
      </p>
      <button className="button-secondary" onClick={add}>
        Add a bed
      </button>
      <div className="grid gap-4 sm:grid-cols-2">
        {c.state.bed_preferences.map((b) => (
          <article
            className="rounded-control border border-divider p-4"
            key={b.id}
          >
            <h3 className="font-semibold">
              {b.name}{" "}
              {b.is_default && <span className="badge">Default bed</span>}
            </h3>
            <p>
              {c.state.sizes.find((s) => s.id === b.bed_size_id)?.label} ·{" "}
              {b.market}
            </p>
            <p className="text-sm">
              {b.mattress_width_mm} × {b.mattress_length_mm} ×{" "}
              {b.mattress_depth_mm} mm
            </p>
            <p className="text-xs text-ink-muted">
              {[b.mattress_width_mm, b.mattress_length_mm, b.mattress_depth_mm]
                .map((n) => (n / 25.4).toFixed(1))
                .join(" × ")}{" "}
              in
            </p>
            <div className="mt-3 flex gap-4">
              <button
                className="text-link min-h-11"
                onClick={() => setEditing(structuredClone(b))}
              >
                Edit
              </button>
              <button
                className="text-link min-h-11 text-danger"
                onClick={() => setDeleting(b)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      <Dialog
        open={!!editing}
        title="Your bed preference"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action
                .run(
                  {
                    type: "preference.save",
                    preference: editing,
                    expected_preference_revision: editing.revision,
                  },
                  "Bed preference saved",
                )
                .then((r) => {
                  if (r) setEditing(null);
                });
            }}
          >
            <Field
              label="Bed name · maximum 40 characters"
              required
              maxLength={40}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Select
              label="Market / regional bed size"
              value={editing.bed_size_id}
              onChange={(e) => {
                const size = c.state.sizes.find(
                  (s) => s.id === e.target.value,
                )!;
                setEditing({
                  ...editing,
                  bed_size_id: size.id,
                  market: size.market,
                  mattress_width_mm: size.width_mm,
                  mattress_length_mm: size.length_mm,
                });
              }}
            >
              {c.state.sizes
                .filter((s) => s.product_role === "mattress")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.market} · {s.label} · {dimensions(s)}
                  </option>
                ))}
            </Select>
            <Select
              label="Measurement entry units"
              value={editing.preferred_units}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  preferred_units: e.target
                    .value as BedPreference["preferred_units"],
                })
              }
            >
              <option value="metric">Millimetres</option>
              <option value="imperial">Inches</option>
            </Select>
            <div className="grid grid-cols-3 gap-3">
              {(["width", "length", "depth"] as const).map((axis) => {
                const key = `mattress_${axis}_mm` as const;
                const factor =
                  editing.preferred_units === "imperial" ? 25.4 : 1;
                return (
                  <Field
                    key={axis}
                    label={`${axis} (${factor === 1 ? "mm" : "in"})`}
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={Math.round((editing[key] / factor) * 100) / 100}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [key]: Number(e.target.value) * factor,
                      })
                    }
                  />
                );
              })}
            </div>
            <Select
              label="Preferred feel"
              value={editing.preferred_feel ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  preferred_feel: (e.target.value ||
                    null) as BedPreference["preferred_feel"],
                })
              }
            >
              <option value="">No preference</option>
              <option value="light">Light & airy</option>
              <option value="balanced">Balanced</option>
              <option value="warm">Warm & cozy</option>
            </Select>
            <fieldset>
              <legend className="field-label">Preferred fibers</legend>
              {["Egyptian Cotton", "French Linen", "Merino Wool"].map((f) => (
                <Check
                  key={f}
                  checked={editing.preferred_fibers.includes(
                    f as BedPreference["preferred_fibers"][number],
                  )}
                  onChange={(value) =>
                    setEditing({
                      ...editing,
                      preferred_fibers: value
                        ? [
                            ...editing.preferred_fibers,
                            f as BedPreference["preferred_fibers"][number],
                          ]
                        : editing.preferred_fibers.filter((x) => x !== f),
                    })
                  }
                >
                  {f}
                </Check>
              ))}
            </fieldset>
            <fieldset>
              <legend className="field-label">Preferred color families</legend>
              <div className="grid grid-cols-3">
                {Array.from(new Set(c.state.colors.map((s) => s.family))).map(
                  (f) => (
                    <Check
                      key={f}
                      checked={editing.preferred_color_families.includes(f)}
                      onChange={(value) =>
                        setEditing({
                          ...editing,
                          preferred_color_families: value
                            ? [...editing.preferred_color_families, f]
                            : editing.preferred_color_families.filter(
                                (x) => x !== f,
                              ),
                        })
                      }
                    >
                      {f}
                    </Check>
                  ),
                )}
              </div>
            </fieldset>
            <Check
              checked={editing.is_default}
              onChange={(value) =>
                setEditing({ ...editing, is_default: value })
              }
            >
              Default bed
            </Check>
            <ActionError message={action.error} />
            <button className="button-primary" disabled={action.pending}>
              Save bed preference
            </button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete bed preference?"
        onClose={() => setDeleting(null)}
      >
        <p>
          Remove {deleting?.name} from your profile? Purchased order dimensions
          remain in their original snapshots.
        </p>
        <ActionError message={action.error} />
        <button
          className="button-primary mt-5"
          disabled={action.pending}
          onClick={() =>
            deleting &&
            void action
              .run(
                {
                  type: "preference.delete",
                  preference_id: deleting.id,
                  expected_preference_revision: deleting.revision,
                },
                "Bed preference deleted",
              )
              .then((r) => {
                if (r) setDeleting(null);
              })
          }
        >
          Delete preference
        </button>
      </Dialog>
    </Panel>
  );
}
export function CustomerAddresses() {
  const c = useCommerce(),
    action = useCommerceAction(),
    [editing, setEditing] = useState<CustomerAddress | null>(null),
    [deleting, setDeleting] = useState<CustomerAddress | null>(null);
  function add() {
    setEditing({
      schema_version: 1,
      id: crypto.randomUUID(),
      owner_id: c.state.profile.id,
      revision: 0,
      recipient: c.state.profile.display_name,
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "US",
      phone: c.state.profile.phone,
      label: "",
      default_shipping: c.state.addresses.length === 0,
      default_billing: c.state.addresses.length === 0,
      updated_at: c.clock,
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <p className="max-w-lg text-ink-muted">
          Default shipping and billing flags change atomically. Your existing
          order addresses stay unchanged.
        </p>
        <button className="button-primary" onClick={add}>
          Add address
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {c.state.addresses.map((a) => (
          <Panel title={a.label} key={a.id}>
            <div className="flex flex-wrap gap-2">
              {a.default_shipping && (
                <span className="badge">Shipping default</span>
              )}
              {a.default_billing && (
                <span className="badge">Billing default</span>
              )}
            </div>
            <address className="not-italic">
              {a.recipient}
              <br />
              {a.line1}
              <br />
              {a.line2 && (
                <>
                  {a.line2}
                  <br />
                </>
              )}
              {a.city}, {a.region} {a.postal_code}
              <br />
              {a.country}
            </address>
            <div className="flex gap-5">
              <button
                className="text-link min-h-11"
                onClick={() => setEditing(structuredClone(a))}
              >
                Edit address
              </button>
              <button
                className="text-link min-h-11 text-danger"
                onClick={() => setDeleting(a)}
              >
                Delete
              </button>
            </div>
          </Panel>
        ))}
      </div>
      <Dialog
        open={!!editing}
        title="Delivery & billing address"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action
                .run(
                  {
                    type: "address.save",
                    address: editing,
                    expected_address_revision: editing.revision,
                  },
                  "Address saved",
                )
                .then((r) => {
                  if (r) setEditing(null);
                });
            }}
          >
            <Field
              label="Address label"
              required
              maxLength={160}
              value={editing.label}
              onChange={(e) =>
                setEditing({ ...editing, label: e.target.value })
              }
            />
            {(
              [
                ["recipient", "Recipient", "name"],
                ["line1", "Street address", "address-line1"],
                ["line2", "Apartment / suite (optional)", "address-line2"],
                ["city", "City", "address-level2"],
                [
                  "region",
                  editing.country === "US"
                    ? "State · two-letter code"
                    : "Region",
                  "address-level1",
                ],
                [
                  "postal_code",
                  editing.country === "US" ? "ZIP code" : "Postal code",
                  "postal-code",
                ],
              ] as const
            ).map(([key, title, auto]) => (
              <Field
                key={key}
                label={title}
                required={key !== "line2"}
                autoComplete={auto}
                value={editing[key]}
                maxLength={160}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    [key]:
                      key === "region" && editing.country === "US"
                        ? e.target.value.toUpperCase()
                        : e.target.value,
                  })
                }
              />
            ))}
            <Select
              label="Country"
              autoComplete="country"
              value={editing.country}
              onChange={(e) =>
                setEditing({ ...editing, country: e.target.value })
              }
            >
              {[
                ...new Set([
                  editing.country,
                  ...c.state.markets.map((m) => m.country),
                ]),
              ].map((code) => (
                <option key={code} value={code}>
                  {new Intl.DisplayNames("en", { type: "region" }).of(code)}
                </option>
              ))}
            </Select>
            <Field
              label="Phone · international format (optional)"
              autoComplete="tel"
              type="tel"
              value={editing.phone ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, phone: e.target.value || null })
              }
            />
            <Check
              checked={editing.default_shipping}
              onChange={(v) => setEditing({ ...editing, default_shipping: v })}
            >
              Default shipping address
            </Check>
            <Check
              checked={editing.default_billing}
              onChange={(v) => setEditing({ ...editing, default_billing: v })}
            >
              Default billing address
            </Check>
            <ActionError message={action.error} />
            <button className="button-primary" disabled={action.pending}>
              Save address
            </button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!deleting}
        title="Delete address?"
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete {deleting?.label}? Order-time delivery records remain
          available.
        </p>
        <ActionError message={action.error} />
        <button
          className="button-primary mt-5"
          disabled={action.pending}
          onClick={() =>
            deleting &&
            void action
              .run(
                {
                  type: "address.delete",
                  address_id: deleting.id,
                  expected_address_revision: deleting.revision,
                },
                "Address deleted",
              )
              .then((r) => {
                if (r) setDeleting(null);
              })
          }
        >
          Delete address
        </button>
      </Dialog>
    </div>
  );
}
