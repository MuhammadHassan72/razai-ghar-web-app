"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Expand,
  RotateCcw,
  Save,
  ScanSearch,
  Undo2,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import { isCompleteBed } from "@/lib/commerce-engine";
import {
  BED_POSITIONS,
  BED_STEPS,
  bedItems,
  changeBedSize,
  newBed,
  normalizeBed,
  resolveBedEntry,
  skipBedStep,
  stepSlots,
  type SizeChange,
} from "@/lib/bed-builder";
import { dimensions, formatMoney } from "@/lib/storefront";
import { BRAND } from "@/lib/brand";
import type {
  BedSelection,
  BedSlotId,
  CommerceCommand,
  CommerceQuote,
} from "@/types/commerce";
import PageLoading from "../ui/PageLoading";
import { Dialog } from "../ui/Dialog";
import { QuoteSummary } from "../cart/CartContents";
import { BedPreviewStage, type Inspection } from "./BedPreviewStage";
import { BedItemList } from "./BedItemList";
import { SlotSelector } from "./SlotSelector";
import { BundleQuote } from "./BundleQuote";
import { TextureInspector } from "./TextureInspector";
import { SaveLookDialog } from "./SaveLookDialog";
import {
  bedFingerprint,
  readBedRecovery,
  readPurchaseReceipt,
  useBedDraft,
  useBedPricing,
  useBuilderConnection,
} from "./useBedEditor";

export default function BedBuilder() {
  const commerce = useCommerce(),
    params = useSearchParams();
  if (!commerce.hydrated) return <PageLoading />;
  const entry = resolveBedEntry(commerce.state, params);
  const recovery = !params.toString() ? readBedRecovery(commerce.state) : null;
  return (
    <BuilderEditor
      key={params.toString()}
      entry={
        recovery
          ? {
              ...entry,
              selection: recovery.selection,
              expectedDraftRevision: recovery.expectedRevision,
              source: "Recovered uncommitted device draft",
            }
          : entry
      }
    />
  );
}
function BuilderEditor({
  entry,
}: {
  entry: ReturnType<typeof resolveBedEntry> & {
    expectedDraftRevision?: number;
  };
}) {
  const commerce = useCommerce(),
    ui = useStorefront(),
    action = useCommerceAction(),
    router = useRouter();
  const [selection, setSelection] = useState(entry.selection),
    [step, setStep] = useState(0),
    [activeCushion, setActiveCushion] = useState<BedSlotId>("cushion_1");
  const [history, setHistory] = useState<BedSelection[]>([]),
    [name, setName] = useState(entry.name),
    [inspection, setInspection] = useState<Inspection>("all"),
    [textureSlot, setTextureSlot] = useState<BedSlotId>("foundation");
  const [savedLook, setSavedLook] = useState({
    id: "look" in entry ? (entry.look?.id ?? null) : null,
    revision: "look" in entry ? (entry.look?.revision ?? 0) : 0,
  });
  const [sizeReview, setSizeReview] = useState<{
      selection: BedSelection;
      changes: SizeChange[];
    } | null>(null),
    [pendingBed, setPendingBed] = useState("");
  const [changeNotice, setChangeNotice] = useState(""),
    [committed, setCommitted] = useState(() =>
      readPurchaseReceipt(commerce.state),
    );
  const [editReview, setEditReview] = useState<{
      command: CommerceCommand;
      quote: CommerceQuote;
      before: CommerceQuote;
    } | null>(null),
    [cartBaseline, setCartBaseline] = useState(commerce.state.cart.revision),
    [reviewError, setReviewError] = useState("");
  const bundle = "bundle" in entry ? entry.bundle : undefined;
  const online = useBuilderConnection(),
    ready = commerce.persistence === "ready",
    writable = ready && !entry.error;
  const draft = useBedDraft(selection, writable, entry.expectedDraftRevision),
    pricing = useBedPricing(selection, writable && online);
  const previewRef = useRef<HTMLElement>(null),
    [canStick, setCanStick] = useState(false),
    setOverlay = ui.setOverlay;
  useEffect(() => () => setOverlay(null), [setOverlay]);
  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const check = () => {
      const top =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--storefront-header-height",
          ),
        ) || 112;
      setCanStick(
        node.getBoundingClientRect().height + top + 32 <= window.innerHeight,
      );
    };
    const observer = new ResizeObserver(check);
    observer.observe(node);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);
  function edit(next: BedSelection, message = "") {
    setHistory((old) => [...old.slice(-19), structuredClone(selection)]);
    const revised = {
      ...normalizeBed(next),
      selection_revision: selection.selection_revision + 1,
    };
    draft.buffer(revised);
    setSelection(revised);
    setChangeNotice(message);
    action.clearError();
  }
  function undo() {
    const old = history.at(-1);
    if (!old) return;
    setHistory((h) => h.slice(0, -1));
    const revised = {
      ...old,
      selection_revision: selection.selection_revision + 1,
    };
    draft.buffer(revised);
    setSelection(revised);
    setChangeNotice(
      "Last local edit undone. Cart and saved looks were not changed.",
    );
    action.clearError();
  }
  function editSlot(id: BedSlotId) {
    setStep(
      id === "foundation" ? 0 : ["main_top", "throw"].includes(id) ? 1 : 2,
    );
    if (id.startsWith("cushion_")) setActiveCushion(id);
    setOverlay(null);
    requestAnimationFrame(() =>
      document
        .getElementById(`builder-slot-${id}`)
        ?.focus({ preventScroll: false }),
    );
  }
  function chooseSize(id: string) {
    if (!id) return;
    try {
      const proposal = changeBedSize(
        commerce.state,
        selection,
        id,
        commerce.clock,
      );
      if (selection.slots.some((s) => s.variant_id || s.pending_options)) {
        setSizeReview(proposal);
        setOverlay({ kind: "builder", panel: "size" });
      } else {
        edit(
          proposal.selection,
          "Market and mattress size confirmed. Products use verified fit links for this size.",
        );
        setPendingBed("");
      }
    } catch (cause) {
      setChangeNotice(
        cause instanceof Error ? cause.message : "Size could not be selected",
      );
    }
  }
  const items = bedItems(commerce.state, selection),
    bed = commerce.state.sizes.find((s) => s.id === selection.bed_size_id);
  const states = selection.step_intent ?? {
    foundation: "configured",
    top: "configured",
    cushions: "configured",
  };
  const openSteps = Object.entries(states)
    .filter(([, status]) => status === "open")
    .map(([id]) =>
      id === "top" ? "Top layer" : id[0].toUpperCase() + id.slice(1),
    );
  const current =
    pricing.current &&
    !pricing.expired &&
    !!pricing.pricing.quote &&
    !pricing.pricing.quote.warnings.some((w) => w.blocking);
  const sameCommit =
    !!committed &&
    committed.fingerprint === bedFingerprint(selection) &&
    commerce.state.cart.bundles.some((b) => b.id === committed.id);
  const staleEdit = !!bundle && commerce.state.cart.revision !== cartBaseline;
  const canPurchase =
    current &&
    online &&
    ready &&
    !entry.error &&
    !openSteps.length &&
    !action.pending &&
    !staleEdit;
  const complete =
    isCompleteBed(selection) &&
    !selection.slots.some((s) => s.state === "unresolved");
  const cta =
    sameCommit && !bundle
      ? "View added bed bundle"
      : bundle
        ? "Update bed bundle in cart"
        : complete
          ? "Add Complete Bed Bundle to Cart"
          : "Add selected items to cart";
  async function commit(command: CommerceCommand) {
    const fingerprint = bedFingerprint(selection);
    const result = await action.run(
      command,
      bundle
        ? "Bed bundle updated atomically"
        : "Your bed was added as one atomic bundle",
    );
    if (result?.id) {
      const receipt = { id: result.id, fingerprint };
      setCommitted(receipt);
      setCartBaseline(commerce.state.cart.revision + 1);
      try {
        sessionStorage.setItem(
          `bed-builder:purchase:${commerce.state.profile.id}`,
          JSON.stringify(receipt),
        );
      } catch {
        setChangeNotice(
          "Bundle committed. This tab can show the receipt, but its navigation-retry marker could not be retained.",
        );
      }
      setOverlay({ kind: "cart" });
    }
  }
  function purchase() {
    if (sameCommit && !bundle) {
      setOverlay({ kind: "cart" });
      return;
    }
    if (!canPurchase || !pricing.pricing.quote) return;
    const command: CommerceCommand = bundle
      ? {
          type: "cart.replace_bundle",
          bundle_id: bundle.id,
          selection,
          quote: pricing.pricing.quote,
          name: name.trim() || "Your bed look",
          expected_cart_revision: cartBaseline,
        }
      : {
          type: "cart.add_bundle",
          selection,
          quote: pricing.pricing.quote,
          name: name.trim() || "Your bed look",
          expected_cart_revision: commerce.state.cart.revision,
        };
    if (bundle) {
      try {
        const preview = commerce.preview(command);
        setEditReview({
          command,
          quote: preview.after_cart,
          before: preview.before_cart,
        });
        action.clearError();
        setReviewError("");
        setOverlay({ kind: "builder", panel: "review" });
      } catch (cause) {
        setReviewError(
          cause instanceof Error ? cause.message : "Update preview unavailable",
        );
      }
    } else void commit(command);
  }
  function controls(expand = false) {
    return (
      <div
        className="flex flex-wrap gap-2"
        aria-label="Preview inspection controls"
      >
        {(
          [
            ["foundation", "Show foundation"],
            ["top", "Show top layer"],
            ["all", "Show all"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            className={`builder-chip ${inspection === value ? "is-selected" : ""}`}
            key={value}
            aria-pressed={inspection === value}
            onClick={() => setInspection(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="builder-chip"
          onClick={() => {
            setTextureSlot(
              items.find((i) => i.variant)?.slot.slot_id ?? "foundation",
            );
            setOverlay({ kind: "builder", panel: "texture" });
          }}
        >
          <ScanSearch size={15} />
          Zoom texture
        </button>
        {expand && (
          <button
            type="button"
            className="builder-chip"
            onClick={() => setOverlay({ kind: "builder", panel: "view" })}
          >
            <Expand size={15} />
            View bed
          </button>
        )}
      </div>
    );
  }
  const activePanel = ui.overlay?.kind === "builder" ? ui.overlay.panel : null;
  return (
    <div className="page-shell builder-page py-8 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="eyebrow">{BRAND.name} · Made layer by layer</p>
          <h1 className="page-title mt-3">Create your own bed.</h1>
          <p className="mt-4 text-sm leading-6 text-ink-muted sm:text-base">
            Find your fabric, build your palette, and make every layer yours.
            Three eligible groups unlock 10% bundle savings. Every cover, insert
            and dimension stays itemized.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="builder-chip"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={15} />
            Undo
          </button>
          <button
            type="button"
            className="builder-chip"
            onClick={() => setOverlay({ kind: "builder", panel: "reset" })}
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-ink-muted">
        <p>
          {entry.source}
          {bundle ? ` · ${bundle.name}` : ""} · {draft.status}
        </p>
        <p>Prices in {commerce.state.cart.currency} · QA device engine</p>
      </div>
      {entry.error && (
        <div className="notice mt-4">
          <p>{entry.error}</p>
          <Link className="text-link mt-2" href="/create-your-bed">
            Open the preserved device draft
          </Link>
        </div>
      )}
      {!online && (
        <p className="form-error mt-4">
          You’re offline. Your local draft is retained; cart actions wait for a
          connection and a fresh quote.
        </p>
      )}
      {draft.conflict && (
        <div className="notice mt-4">
          <p>
            {draft.status}. A newer device draft may exist; it has not been
            overwritten.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="text-link"
              onClick={() =>
                edit(
                  draft.acceptStored(),
                  "Latest device draft loaded for review.",
                )
              }
            >
              Load saved draft
            </button>
            <button
              type="button"
              className="text-link"
              onClick={draft.keepCurrent}
            >
              Keep this draft and replace the reviewed device version
            </button>
          </div>
        </div>
      )}
      {changeNotice && (
        <p role="status" className="notice mt-4">
          {changeNotice}
        </p>
      )}
      <div className="mt-7 grid min-w-0 items-start gap-8 md:grid-cols-12">
        <aside
          ref={previewRef}
          data-sticky={canStick}
          className="builder-preview min-w-0 md:col-span-6 lg:col-span-7"
          aria-label="Bed preview and equivalent item list"
        >
          <BedPreviewStage
            state={commerce.state}
            selection={selection}
            inspection={inspection}
            onEdit={editSlot}
          />
          <div className="mt-4 space-y-3">
            {controls(true)}
            <p className="text-xs leading-5 text-ink-muted">
              Inspection changes visibility only. Merchandise stays selected.
              Pattern, drape and swatch color are illustrative QA guides; exact
              aligned renders have not been supplied.
            </p>
          </div>
          <details className="mt-4 rounded-card border border-divider bg-surface p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
              Your selected layers ·{" "}
              {selection.slots.filter((s) => s.state === "selected").length +
                selection.insert_links.length}{" "}
              sale units
            </summary>
            <div className="pt-3">
              <BedItemList
                state={commerce.state}
                selection={selection}
                onEdit={editSlot}
                compact
              />
            </div>
          </details>
        </aside>
        <div className="min-w-0 space-y-5 md:col-span-6 lg:col-span-5">
          <section
            className="rounded-card bg-surface-soft p-5"
            aria-labelledby="bed-fit-heading"
          >
            <h2 id="bed-fit-heading" className="font-serif text-2xl">
              First, find your fit.
            </h2>
            <label className="mt-4 block">
              <span className="field-label">Market</span>
              <select
                className="field"
                value={selection.market}
                onChange={(e) => {
                  const first = commerce.state.sizes.find(
                    (s) =>
                      s.market === e.target.value &&
                      s.product_role === "mattress",
                  );
                  if (first) {
                    setPendingBed(first.id);
                    chooseSize(first.id);
                  }
                }}
              >
                {commerce.state.markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="field-label">
                Mattress size · verify actual dimensions
              </span>
              <select
                className="field"
                value={
                  selection.fit_confirmed ? selection.bed_size_id : pendingBed
                }
                onChange={(e) => {
                  setPendingBed(e.target.value);
                  chooseSize(e.target.value);
                }}
              >
                <option value="">Choose your mattress size</option>
                {commerce.state.sizes
                  .filter(
                    (s) =>
                      s.product_role === "mattress" &&
                      s.market === selection.market,
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} · {dimensions(s)}
                    </option>
                  ))}
              </select>
            </label>
            <p className="mt-3 text-xs leading-5 text-ink-muted">
              {selection.fit_confirmed && bed
                ? `${dimensions(bed)}. `
                : "Fit is not confirmed. "}
              Fitted pocket depth is shown per selected SKU. Include any topper
              when measuring.
            </p>
            <button
              type="button"
              className="text-link mt-2"
              onClick={() => setOverlay({ kind: "sizes" })}
            >
              Size & pocket-depth guide
            </button>
          </section>
          <nav className="grid grid-cols-3 gap-2" aria-label="Bed layer steps">
            {BED_STEPS.map((label, i) => {
              const ids = stepSlots(i),
                unresolved = selection.slots.some(
                  (s) => ids.includes(s.slot_id) && s.state === "unresolved",
                ),
                status =
                  states[i === 0 ? "foundation" : i === 1 ? "top" : "cushions"];
              return (
                <button
                  key={label}
                  type="button"
                  className={`builder-step ${step === i ? "is-active" : ""}`}
                  aria-current={step === i ? "step" : undefined}
                  onClick={() => setStep(i)}
                >
                  <span className="mb-2 flex items-center justify-center gap-1.5">
                    <span>{i + 1}</span>
                    <span>{label}</span>
                  </span>
                  <span className="block text-[10px] font-normal">
                    {status !== "open" && !unresolved && (
                      <Check size={11} className="mr-1 inline" />
                    )}
                    {unresolved
                      ? "Needs attention"
                      : status === "skipped"
                        ? "Skipped"
                        : status === "configured"
                          ? `${selection.slots.filter((s) => ids.includes(s.slot_id) && s.state === "selected").length} selected`
                          : "Not considered"}
                  </span>
                </button>
              );
            })}
          </nav>
          <section className="space-y-4" aria-labelledby="builder-current-step">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="builder-current-step" className="font-serif text-3xl">
                {step + 1} {BED_STEPS[step]}
              </h2>
              <button
                type="button"
                className="text-link text-sm"
                onClick={() => {
                  edit(
                    skipBedStep(selection, step, commerce.state),
                    `${BED_STEPS[step]} explicitly skipped. Its merchandise and attached inserts were removed from this draft.`,
                  );
                  if (step < 2) setStep(step + 1);
                }}
              >
                Skip step
              </button>
            </div>
            {step === 0 ? (
              <SlotSelector
                key="foundation"
                state={commerce.state}
                selection={selection}
                slotId="foundation"
                at={commerce.clock}
                onChange={edit}
                onTexture={(id) => {
                  setTextureSlot(id);
                  setOverlay({ kind: "builder", panel: "texture" });
                }}
              />
            ) : step === 1 ? (
              <>
                <SlotSelector
                  key="main_top"
                  state={commerce.state}
                  selection={selection}
                  slotId="main_top"
                  at={commerce.clock}
                  onChange={edit}
                  onTexture={(id) => {
                    setTextureSlot(id);
                    setOverlay({ kind: "builder", panel: "texture" });
                  }}
                />
                <SlotSelector
                  key="throw"
                  state={commerce.state}
                  selection={selection}
                  slotId="throw"
                  at={commerce.clock}
                  onChange={edit}
                  onTexture={(id) => {
                    setTextureSlot(id);
                    setOverlay({ kind: "builder", panel: "texture" });
                  }}
                />
              </>
            ) : (
              <>
                <p className="text-sm leading-6 text-ink-muted">
                  Five named positions, each one cover. Square 18 × 18 in, 20 ×
                  20 in, 26 × 26 in Euro, and lumbar choices depend on the
                  selected family’s verified variants.
                </p>
                <div
                  className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                  aria-label="Decorative cushion positions"
                >
                  {(Object.keys(BED_POSITIONS) as BedSlotId[])
                    .filter((id) => id.startsWith("cushion_"))
                    .map((id, i) => {
                      const slot = selection.slots.find(
                        (s) => s.slot_id === id,
                      )!;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`builder-position ${id === activeCushion ? "is-active" : ""}`}
                          onClick={() => setActiveCushion(id)}
                          aria-pressed={id === activeCushion}
                          aria-label={`${BED_POSITIONS[id].label}, ${slot.state === "selected" ? "selected" : slot.state === "unresolved" ? "needs options" : "empty"}`}
                        >
                          <span className="font-semibold">{i + 1}</span>
                          <span className="text-[10px]">
                            {slot.state === "selected"
                              ? "Selected"
                              : slot.state === "unresolved"
                                ? "Choose"
                                : "Empty"}
                          </span>
                        </button>
                      );
                    })}
                </div>
                <SlotSelector
                  key={activeCushion}
                  state={commerce.state}
                  selection={selection}
                  slotId={activeCushion}
                  at={commerce.clock}
                  onChange={edit}
                  onTexture={(id) => {
                    setTextureSlot(id);
                    setOverlay({ kind: "builder", panel: "texture" });
                  }}
                />
              </>
            )}
            <div className="flex justify-between gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
              ) : (
                <span />
              )}
              {step < 2 && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setStep(step + 1)}
                >
                  Next layer
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </section>
          <BundleQuote
            pricing={pricing.pricing}
            current={pricing.current}
            expired={pricing.expired}
            onRefresh={pricing.refresh}
          />
          <div className="space-y-3 rounded-card bg-surface-soft p-5">
            <button
              type="button"
              className="button-secondary w-full"
              onClick={() => setOverlay({ kind: "builder", panel: "save" })}
            >
              <Save size={16} />
              Save This Bed Look
            </button>
            <p className="text-xs leading-5 text-ink-muted">
              Save an unfinished draft or a complete composition. Names are
              limited to 60 characters. Every save remains device-only until an
              identity/backend service is connected.
            </p>
            {openSteps.length > 0 && (
              <p className="text-sm text-warning">
                Configure or explicitly skip: {openSteps.join(", ")}.
              </p>
            )}
            {staleEdit && (
              <div className="notice">
                <p>
                  The cart changed while this bundle was being edited. Review
                  its latest contents before replacing it.
                </p>
                <button
                  type="button"
                  className="text-link mt-2"
                  onClick={() => {
                    setCartBaseline(commerce.state.cart.revision);
                    pricing.refresh();
                    setChangeNotice(
                      "Latest cart revision accepted for a new update preview. Your local composition is retained.",
                    );
                  }}
                >
                  Review against latest cart
                </button>
              </div>
            )}
            <ActionError message={action.error || reviewError} />
            <button
              type="button"
              className="button-primary hidden w-full md:inline-flex"
              disabled={!(sameCommit && !bundle) && !canPurchase}
              onClick={purchase}
            >
              {action.pending ? "Adding…" : cta}
            </button>
            <p className="text-xs leading-5 text-ink-muted">
              {complete
                ? "A foundation, bed-covering main top and decorative cushion are included."
                : "Partial composition: only the named selected sale units are added."}{" "}
              Covers exclude inserts unless individually selected. The current
              quote includes{" "}
              {pricing.pricing.quote?.lines.reduce(
                (n, l) => n + l.quantity,
                0,
              ) ?? 0}{" "}
              sale units. Shipping and tax may change with destination.
            </p>
          </div>
        </div>
      </div>
      <div className="builder-mobile-bar md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-ink-muted">
              {!pricing.current || pricing.expired
                ? "Refresh required"
                : "Estimated selection total"}
            </p>
            <p className="price text-lg font-semibold">
              {pricing.pricing.quote
                ? formatMoney(pricing.pricing.quote.total)
                : "Choose your layers"}
            </p>
          </div>
          <button
            type="button"
            className="text-link shrink-0 text-xs"
            onClick={() => setOverlay({ kind: "builder", panel: "view" })}
          >
            View bed
          </button>
        </div>
        <button
          type="button"
          className="button-primary mt-2 w-full text-xs"
          disabled={!(sameCommit && !bundle) && !canPurchase}
          onClick={purchase}
        >
          {action.pending ? "Adding…" : cta}
        </button>
      </div>
      <Dialog
        open={activePanel === "view"}
        onClose={() => setOverlay(null)}
        title="View your bed"
        fullscreen
      >
        <div className="mx-auto max-w-5xl space-y-5">
          <BedPreviewStage
            state={commerce.state}
            selection={selection}
            inspection={inspection}
            onEdit={editSlot}
          />
          {controls()}
          <BedItemList
            state={commerce.state}
            selection={selection}
            onEdit={editSlot}
          />
        </div>
      </Dialog>
      <Dialog
        open={activePanel === "texture"}
        onClose={() => setOverlay(null)}
        title="Inspect fabric & construction"
        wide
      >
        <TextureInspector
          state={commerce.state}
          selection={selection}
          slotId={textureSlot}
          onSlot={setTextureSlot}
        />
      </Dialog>
      <Dialog
        open={activePanel === "save"}
        onClose={() => setOverlay(null)}
        title="Save This Bed Look"
      >
        <SaveLookDialog
          selection={selection}
          initialName={name}
          existing={savedLook}
          onSaved={(id, revision, savedName) => {
            setSavedLook({ id, revision });
            setName(savedName);
            setOverlay(null);
            setChangeNotice(`“${savedName}” saved at revision ${revision}.`);
          }}
        />
      </Dialog>
      <Dialog
        open={activePanel === "reset"}
        onClose={() => setOverlay(null)}
        title="Review reset"
      >
        <p className="mb-4 text-sm leading-6">
          Reset clears all selected products, attached inserts and step choices
          from this local draft. Your current market and mattress fit remain.
          Cart bundles and saved looks change only when you explicitly update
          them.
        </p>
        <BedItemList state={commerce.state} selection={selection} compact />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="button-secondary"
            onClick={() => setOverlay(null)}
          >
            Keep this bed
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              edit(
                newBed(selection.bed_size_id, selection.fit_confirmed ?? true),
                "Draft reset. Use Undo to restore its previous composition.",
              );
              setOverlay(null);
            }}
          >
            Clear this draft
          </button>
        </div>
      </Dialog>
      <Dialog
        open={activePanel === "size"}
        onClose={() => {
          setOverlay(null);
          setPendingBed("");
        }}
        title="Review mattress-size changes"
      >
        <p className="text-sm leading-6">
          Compatible exact SKUs stay selected. Replacements retain fabric and
          named color. Price changes and unresolved choices are listed before
          confirmation.
        </p>
        <ul className="my-5 space-y-3">
          {sizeReview?.changes.map((c, i) => (
            <li
              key={i}
              className={`rounded-control p-3 text-sm ${c.kind === "unresolved" ? "bg-warning-soft text-warning" : "bg-surface-soft"}`}
            >
              <strong>
                {BED_POSITIONS[c.slot].label} · {c.kind}
              </strong>
              <p className="mt-1 leading-6">{c.message}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setOverlay(null);
              setPendingBed("");
            }}
          >
            Keep original size
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              if (sizeReview) {
                edit(
                  sizeReview.selection,
                  "Mattress size changed after review. Resolve every flagged position before purchase.",
                );
                setSizeReview(null);
              }
              setPendingBed("");
              setOverlay(null);
            }}
          >
            Confirm reviewed size
          </button>
        </div>
      </Dialog>
      <Dialog
        open={activePanel === "review"}
        onClose={() => setOverlay(null)}
        title="Review bed bundle update"
        wide
      >
        <p className="mb-5 text-sm leading-6">
          This replaces only “{bundle?.name}”. Review the new group savings in
          the itemized quote and the entire cart total below. Other cart lines
          remain.
        </p>
        <BedItemList state={commerce.state} selection={selection} compact />
        {editReview && (
          <div className="mt-5 rounded-control bg-surface-soft p-5">
            <p className="notice mb-4">
              Edited bundle:{" "}
              {(editReview.before.bundle_tiers.find(
                (t) => t.bundle_instance_id === bundle?.id,
              )?.basis_points ?? 0) / 100}
              % →{" "}
              {(editReview.quote.bundle_tiers.find(
                (t) => t.bundle_instance_id === bundle?.id,
              )?.basis_points ?? 0) / 100}
              %. Bundle savings:{" "}
              {formatMoney(
                editReview.before.bundle_tiers.find(
                  (t) => t.bundle_instance_id === bundle?.id,
                )?.discount ?? editReview.before.discount,
              )}{" "}
              →{" "}
              {formatMoney(
                editReview.quote.bundle_tiers.find(
                  (t) => t.bundle_instance_id === bundle?.id,
                )?.discount ?? editReview.quote.discount,
              )}
              . A non-stacking promo may change the final cart winner.
            </p>
            <h3 className="mb-4 font-semibold">Cart after this update</h3>
            <QuoteSummary quote={editReview.quote} />
            <p className="mt-4 text-xs leading-5">
              {editReview.quote.comparison.explanation}
            </p>
          </div>
        )}
        <ActionError message={action.error} />
        <button
          type="button"
          className="text-link mt-4"
          onClick={() => {
            setOverlay(null);
            pricing.refresh();
            setReviewError(
              "Refreshing price and availability. Review the updated quote before reopening the bundle update preview.",
            );
          }}
        >
          Refresh and review again
        </button>
        <button
          type="button"
          className="button-primary mt-5 w-full"
          disabled={
            action.pending ||
            !editReview ||
            !current ||
            commerce.state.cart.revision !== cartBaseline
          }
          onClick={() => {
            if (editReview) void commit(editReview.command);
          }}
        >
          {action.pending ? "Updating…" : "Confirm bundle update"}
        </button>
      </Dialog>
      {savedLook.id && (
        <Link className="text-link mt-8" href="/account?tab=looks">
          Open My Sanctuary saved looks
        </Link>
      )}
      {entry.error && (
        <button
          type="button"
          className="text-link mt-4"
          onClick={() => router.replace("/create-your-bed")}
        >
          Return to the device draft
        </button>
      )}
    </div>
  );
}
