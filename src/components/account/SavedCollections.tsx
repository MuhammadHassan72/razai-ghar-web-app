"use client";
import Link from "next/link";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import {
  ActionError,
  useCommerceAction,
  useStorefront,
} from "@/context/StorefrontContext";
import type { CommerceQuote, SavedBedLook } from "@/types/commerce";
import {
  formatMoney,
  dimensions,
  priceOf,
  stockOf,
  variantImage,
} from "@/lib/storefront";
import { normalizeBed } from "@/lib/bed-builder";
import { BedPreviewStage } from "../builder/BedPreviewStage";
import { Dialog } from "../ui/Dialog";
import { Field, Panel, Time } from "../ui/Panel";
import { StoreImage } from "../ui/StoreImage";
export function UndoBanner() {
  const c = useCommerce(),
    action = useCommerceAction();
  return (
    <div className="space-y-3" aria-live="polite">
      {c.active_undos.map((u) => (
        <div
          key={u.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-success-soft p-4 text-success"
        >
          <p>
            {u.kind === "look_delete"
              ? "Bed look deleted"
              : "Wishlist item moved to cart"}{" "}
            ·{" "}
            {Math.max(
              0,
              Math.ceil(
                (Date.parse(u.expires_at) - Date.parse(c.clock)) / 1000,
              ),
            )}
            s to undo
          </p>
          <button
            className="text-link min-h-11"
            disabled={action.pending}
            onClick={() =>
              void action.run({ type: "undo", undo_id: u.id }, "Change undone")
            }
          >
            Undo
          </button>
        </div>
      ))}
      <ActionError message={action.error} />
    </div>
  );
}
export function SavedLooks() {
  const c = useCommerce(),
    action = useCommerceAction(),
    ui = useStorefront();
  const [deleted, setDeleted] = useState(false),
    [rename, setRename] = useState<SavedBedLook | null>(null),
    [name, setName] = useState(""),
    [remove, setRemove] = useState<SavedBedLook | null>(null),
    [purchase, setPurchase] = useState<{
      look: SavedBedLook;
      quote: CommerceQuote;
      cartRevision: number;
    } | null>(null),
    [localError, setLocalError] = useState("");
  const looks = deleted ? c.recently_deleted_looks : c.active_looks;
  function review(look: SavedBedLook) {
    setLocalError("");
    try {
      setPurchase({
        look,
        quote: c.quoteSelection(normalizeBed(look.selection)),
        cartRevision: c.state.cart.revision,
      });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Unable to quote look");
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <p className="text-ink-muted">
          Keep a favourite composition, then check current fit, prices and stock
          when you buy.
        </p>
        <button
          className="button-secondary"
          onClick={() => setDeleted(!deleted)}
        >
          {deleted
            ? "Show saved looks"
            : `Recently Deleted (${c.recently_deleted_looks.length})`}
        </button>
      </div>
      {deleted && (
        <p className="rounded-control bg-warning-soft p-4 text-sm text-warning">
          Deleted looks can be restored for 30 days from deletion. The 10-second
          Undo banner reverses a recent delete immediately.
        </p>
      )}
      <UndoBanner />
      <ActionError message={action.error || localError} />
      {looks.length === 0 && (
        <Panel
          title={
            deleted
              ? "No recently deleted looks"
              : "Your next favourite is waiting"
          }
        >
          <Link className="text-link" href="/create-your-bed">
            Create a bed look
          </Link>
        </Panel>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        {looks.map((look) => {
          const size = c.state.sizes.find(
            (s) => s.id === look.selection.bed_size_id,
          );
          return (
            <article
              key={look.id}
              className="overflow-hidden rounded-card border border-divider bg-surface"
            >
              <BedPreviewStage
                state={c.state}
                selection={look.selection}
                inspection="all"
                onEdit={() => {}}
                interactive={false}
              />
              <div className="space-y-4 p-5">
                <h2 className="font-serif text-3xl">{look.name}</h2>
                <p className="text-sm text-ink-muted">
                  {size
                    ? `${size.label} · ${dimensions(size)}`
                    : "Size needs review"}
                </p>
                <p className="text-xs text-ink-muted">
                  {
                    look.selection.slots.filter((s) => s.state === "selected")
                      .length
                  }{" "}
                  selected layers · updated <Time at={look.updated_at} />
                </p>
                {look.deleted_at ? (
                  <>
                    <p className="text-sm">
                      Restorable until{" "}
                      {look.purge_after && <Time at={look.purge_after} />}
                    </p>
                    <button
                      className="button-secondary"
                      disabled={action.pending}
                      onClick={() =>
                        void action.run(
                          {
                            type: "look.restore",
                            look_id: look.id,
                            expected_look_revision: look.revision,
                          },
                          "Look restored",
                        )
                      }
                    >
                      Restore look
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        className="button-secondary"
                        href={`/create-your-bed?look=${encodeURIComponent(look.id)}`}
                      >
                        Open in Builder
                      </Link>
                      <button
                        className="button-primary"
                        onClick={() => review(look)}
                      >
                        Buy this look
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <Link
                        className="text-link min-h-11 content-center"
                        href={`/create-your-bed?look=${encodeURIComponent(look.id)}`}
                      >
                        Edit composition
                      </Link>
                      <button
                        className="text-link min-h-11"
                        disabled={action.pending}
                        onClick={() =>
                          void action.run(
                            {
                              type: "look.duplicate",
                              look_id: look.id,
                              expected_look_revision: look.revision,
                            },
                            "Look duplicated",
                          )
                        }
                      >
                        Duplicate
                      </button>
                      <button
                        className="text-link min-h-11"
                        onClick={() => {
                          setRename(look);
                          setName(look.name);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="text-link min-h-11 text-danger"
                        onClick={() => setRemove(look)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Dialog
        open={!!rename}
        title="Rename saved look"
        onClose={() => setRename(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (rename)
              void action
                .run(
                  {
                    type: "look.save",
                    look_id: rename.id,
                    name,
                    selection: rename.selection,
                    expected_look_revision: rename.revision,
                  },
                  "Look renamed",
                )
                .then((r) => {
                  if (r) setRename(null);
                });
          }}
        >
          <Field
            label="Look name · 60 characters maximum"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-ink-muted">
            If this look changed in another tab, close and reopen to reload the
            latest revision. Your newer composition will not be overwritten.
          </p>
          <ActionError message={action.error} />
          <button className="button-primary" disabled={action.pending}>
            Save name
          </button>
        </form>
      </Dialog>
      <Dialog
        open={!!remove}
        title="Delete saved look?"
        onClose={() => setRemove(null)}
      >
        <p>
          Move {remove?.name} to Recently Deleted for 30 days. You will have 10
          seconds to undo this action.
        </p>
        <button
          className="button-primary mt-5"
          disabled={action.pending}
          onClick={() =>
            remove &&
            void action
              .run(
                {
                  type: "look.delete",
                  look_id: remove.id,
                  expected_look_revision: remove.revision,
                },
                "Look moved to Recently Deleted",
              )
              .then((r) => {
                if (r) setRemove(null);
              })
          }
        >
          Delete look
        </button>
        <ActionError message={action.error} />
      </Dialog>
      <Dialog
        open={!!purchase}
        title="Review this bed at today’s prices"
        onClose={() => setPurchase(null)}
      >
        {purchase && (
          <div className="space-y-4">
            <p className="font-serif text-2xl">{purchase.look.name}</p>
            {purchase.quote.lines.map((l) => (
              <div className="flex justify-between gap-4 text-sm" key={l.id}>
                <span>
                  {l.title} · {l.color.name} × {l.quantity}
                </span>
                <span>{formatMoney(l.total)}</span>
              </div>
            ))}
            <p className="text-lg font-semibold">
              Estimated total {formatMoney(purchase.quote.total)}
            </p>
            <p className="text-sm text-ink-muted">
              Savings {formatMoney(purchase.quote.discount)}. Shipping and tax
              are finalized at checkout.
            </p>
            {purchase.quote.warnings.map((w, i) => (
              <p
                className={w.blocking ? "text-danger" : "text-warning"}
                key={i}
              >
                {w.message}
              </p>
            ))}
            <p className="text-xs">
              Quote expires <Time at={purchase.quote.expires_at} />
            </p>
            <button
              className="text-link min-h-11"
              onClick={() => review(purchase.look)}
            >
              Refresh quote & stock
            </button>
            <ActionError message={action.error} />
            <button
              className="button-primary w-full"
              disabled={
                action.pending ||
                purchase.quote.warnings.some((w) => w.blocking) ||
                Date.parse(purchase.quote.expires_at) <= Date.parse(c.clock)
              }
              onClick={() =>
                void action
                  .run(
                    {
                      type: "cart.add_bundle",
                      selection: normalizeBed(purchase.look.selection),
                      quote: purchase.quote,
                      name: purchase.look.name,
                      expected_cart_revision: purchase.cartRevision,
                    },
                    "Bed look added atomically",
                  )
                  .then((r) => {
                    if (r) {
                      setPurchase(null);
                      ui.setOverlay({ kind: "cart" });
                    }
                  })
              }
            >
              Add this bed look to cart
            </button>
            <Link
              className="text-link min-h-11 inline-flex items-center"
              href={`/create-your-bed?look=${purchase.look.id}`}
            >
              Resolve options in Builder
            </Link>
          </div>
        )}
      </Dialog>
    </div>
  );
}
export function CustomerWishlist() {
  const c = useCommerce(),
    action = useCommerceAction(),
    ui = useStorefront();
  return (
    <div className="space-y-6">
      <UndoBanner />
      <ActionError message={action.error} />
      {c.state.wishlist.length === 0 && (
        <Panel title="A little room for your favourites">
          <Link className="text-link" href="/shop">
            Explore the collection
          </Link>
        </Panel>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {c.state.wishlist.map((entry) => {
          const p = c.state.products.find((p) => p.id === entry.product_id);
          const v = c.state.variants.find((v) => v.id === entry.variant_id);
          const media = p ? variantImage(p, v) : null;
          const available =
            !!p &&
            p.status === "published" &&
            (!entry.variant_id || (!!v && stockOf(c.state, v) > 0));
          return (
            <article
              className="overflow-hidden rounded-card border border-divider bg-surface"
              key={entry.id}
            >
              {media && (
                <StoreImage
                  src={media.url}
                  alt={media.alt}
                  className="aspect-[4/3]"
                  sizes="(min-width:1280px) 25vw, 50vw"
                />
              )}
              <div className="space-y-3 p-5">
                <h2 className="font-serif text-2xl">
                  {p?.title ?? "Archived product reference"}
                </h2>
                {v && (
                  <p className="text-sm">
                    {c.state.colors.find((s) => s.id === v.color_id)?.name} ·{" "}
                    {c.state.sizes.find((s) => s.id === v.size_id)?.label} ·{" "}
                    {formatMoney(priceOf(v, c.clock))}
                  </p>
                )}
                {!available && (
                  <p className="text-sm text-danger">
                    Currently unavailable. Kept in your wishlist.
                  </p>
                )}
                <button
                  className="button-primary w-full"
                  disabled={!available || action.pending}
                  onClick={() => {
                    if (!entry.variant_id) {
                      ui.setOverlay({
                        kind: "quick",
                        product_id: entry.product_id,
                        wishlist_entry_id: entry.id,
                      });
                      return;
                    }
                    void action.run(
                      {
                        type: "wishlist.move",
                        entry_id: entry.id,
                        variant_id: entry.variant_id,
                        expected_cart_revision: c.state.cart.revision,
                      },
                      "Moved to cart · Undo available for 10 seconds",
                    );
                  }}
                >
                  {entry.variant_id ? "Move to cart" : "Choose options & move"}
                </button>
                <button
                  className="text-link min-h-11 text-danger"
                  disabled={action.pending}
                  onClick={() =>
                    void action.run(
                      { type: "wishlist.remove", entry_id: entry.id },
                      "Removed from wishlist",
                    )
                  }
                >
                  Remove from wishlist
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
