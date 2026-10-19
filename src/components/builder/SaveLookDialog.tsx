"use client";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { ActionError, useCommerceAction } from "@/context/StorefrontContext";
import type { BedSelection } from "@/types/commerce";
import { BedItemList } from "./BedItemList";
export function SaveLookDialog({
  selection,
  initialName,
  existing,
  onSaved,
}: {
  selection: BedSelection;
  initialName: string;
  existing: { id: string | null; revision: number };
  onSaved: (id: string, revision: number, name: string) => void;
}) {
  const commerce = useCommerce(),
    action = useCommerceAction(),
    [name, setName] = useState(initialName),
    [copy, setCopy] = useState(!existing.id);
  const stored = commerce.state.saved_looks.find((l) => l.id === existing.id),
    conflict =
      !copy &&
      !!existing.id &&
      (!stored || !!stored.deleted_at || stored.revision !== existing.revision);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (conflict) return;
        void action
          .run(
            {
              type: "look.save",
              look_id: copy ? null : existing.id,
              expected_look_revision: copy ? 0 : existing.revision,
              name: name.trim(),
              selection,
            },
            "Bed look saved on this device",
          )
          .then((result) => {
            if (result?.id)
              onSaved(result.id, copy ? 1 : existing.revision + 1, name.trim());
          });
      }}
    >
      <label className="block">
        <span className="field-label">
          Bed look name · maximum 60 characters
        </span>
        <input
          className="field"
          data-dialog-autofocus
          maxLength={60}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <span className="mt-1 block text-right text-xs text-ink-muted">
          {name.length}/60
        </span>
      </label>
      {existing.id && (
        <fieldset className="space-y-2">
          <legend className="field-label">Save destination</legend>
          <label className="filter-option">
            <input
              type="radio"
              name="look-mode"
              checked={!copy}
              onChange={() => setCopy(false)}
            />
            Update this saved look · expected revision {existing.revision}
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="look-mode"
              checked={copy}
              onChange={() => setCopy(true)}
            />
            Save a separate copy
          </label>
        </fieldset>
      )}
      {conflict && (
        <p className="form-error">
          This look changed or was deleted in another panel. Its newer revision
          will not be overwritten. Save a separate copy, or close this dialog
          and reload the latest saved look.
        </p>
      )}
      <div
        className="max-h-64 overflow-y-auto rounded-control bg-surface-soft p-4"
        role="region"
        aria-label="Composition to save"
        tabIndex={0}
      >
        <BedItemList state={commerce.state} selection={selection} compact />
      </div>
      <p className="notice">
        {commerce.role === "guest"
          ? "Guest draft: saved only in this browser. No identity service is connected; this does not create an account."
          : "QA customer look: private to this device’s customer scope."}{" "}
        Only composition IDs and positions are saved. Prices are checked again
        when shopping.{" "}
        {selection.fit_confirmed === false
          ? "Mattress fit is unconfirmed; this remains a draft."
          : ""}
      </p>
      <ActionError message={action.error} />
      <button
        className="button-primary w-full"
        type="submit"
        disabled={
          action.pending ||
          !name.trim() ||
          conflict ||
          commerce.persistence !== "ready"
        }
      >
        {action.pending
          ? "Saving…"
          : copy
            ? "Save This Bed Look"
            : "Update saved bed look"}
      </button>
    </form>
  );
}
