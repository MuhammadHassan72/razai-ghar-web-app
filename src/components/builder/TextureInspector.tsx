"use client";
import { useId } from "react";
import type { BedSelection, BedSlotId, CommerceState } from "@/types/commerce";
import { BED_POSITIONS, bedItems } from "@/lib/bed-builder";
import { FabricPattern } from "./BedPreviewStage";
import { StoreImage } from "../ui/StoreImage";

export function TextureInspector({
  state,
  selection,
  slotId,
  onSlot,
}: {
  state: CommerceState;
  selection: BedSelection;
  slotId: BedSlotId;
  onSlot: (slot: BedSlotId) => void;
}) {
  const items = bedItems(state, selection).filter(
      (i) => i.variant && i.product,
    ),
    item = items.find((i) => i.slot.slot_id === slotId) ?? items[0],
    id = `texture-${useId().replaceAll(":", "")}`;
  if (!item?.product || !item.variant)
    return (
      <p className="notice">
        Select a fabric first to inspect its construction and catalog facts.
      </p>
    );
  const product = item.product,
    variant = item.variant;
  const macro = product.media.find(
    (m) =>
      m.kind === "texture" &&
      m.fidelity === "approved_variant" &&
      variant.media_ids.includes(m.id),
  );
  return (
    <div className="space-y-5">
      <label>
        <span className="field-label">Inspect a selected layer</span>
        <select
          className="field"
          value={item.slot.slot_id}
          onChange={(e) => onSlot(e.target.value as BedSlotId)}
        >
          {items.map((i) => (
            <option key={i.slot.slot_id} value={i.slot.slot_id}>
              {BED_POSITIONS[i.slot.slot_id].label} · {i.color?.name}
            </option>
          ))}
        </select>
      </label>
      {macro ? (
        <StoreImage
          src={macro.url}
          alt={macro.alt}
          className="aspect-[4/3] rounded-card"
          sizes="(max-width:640px) 90vw, 640px"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-card border border-divider">
            <svg
              viewBox="0 0 480 260"
              role="img"
              aria-label={`Symbolic ${variant.weave} construction diagram, not a fabric macro`}
              className="h-auto w-full"
            >
              <defs>
                <FabricPattern
                  id={id}
                  weave={variant.weave}
                  weighted={product.construction === "weighted"}
                />
              </defs>
              <rect
                width="480"
                height="260"
                fill={item.color?.hex ?? "#FFFCF7"}
              />
              <rect width="480" height="260" fill={`url(#${id})`} />
            </svg>
          </div>
          <p className="notice">
            A genuine material macro is unavailable for this option. This
            enlarged weave diagram explains construction; it does not represent
            magnified fibers or exact product texture.
          </p>
        </>
      )}
      <h3 className="font-serif text-2xl">
        {product.title} · {item.color?.name}
      </h3>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-ink-muted">Fiber</dt>
          <dd>
            {variant.fibers
              .map((f) => `${f.percentage}% ${f.fiber}`)
              .join(", ")}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Weave / construction</dt>
          <dd>
            {variant.weave} · {product.construction}
          </dd>
        </div>
        {product.gsm !== null && (
          <div>
            <dt className="text-ink-muted">Fabric mass</dt>
            <dd>
              {product.gsm} g/m²{" "}
              {product.construction === "weighted" ? "shell only" : ""}
            </dd>
          </div>
        )}
        {product.thread_count && (
          <div>
            <dt className="text-ink-muted">Thread count</dt>
            <dd>{product.thread_count.value} threads per square inch</dd>
          </div>
        )}
        {product.total_weight_kg !== null && (
          <div>
            <dt className="text-ink-muted">Total blanket mass</dt>
            <dd>{product.total_weight_kg} kg</dd>
          </div>
        )}
      </dl>
      <p className="text-xs leading-5 text-ink-muted">
        {product.facts_evidence.disclosure}
      </p>
      <p className="text-sm leading-6">
        Care:{" "}
        {product.care.wash_celsius === null
          ? "Follow the sewn label"
          : `Wash ${product.care.wash_celsius}°C`}
        . {product.care.drying}. {product.care.limitations}
      </p>
    </div>
  );
}
