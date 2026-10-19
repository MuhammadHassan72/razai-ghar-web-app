"use client";
import { useEffect, useRef, useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { canonicalJSON } from "@/lib/commerce-engine";
import { quoteContextKey } from "@/lib/bed-builder";
import { selectionSchema } from "@/lib/commerce-contracts";
import type { BedSelection, CommerceState } from "@/types/commerce";
import type { BedPricing } from "./BundleQuote";
export function useBuilderConnection() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    queueMicrotask(update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function useBedPricing(selection: BedSelection, enabled: boolean) {
  const commerce = useCommerce(),
    [refresh, setRefresh] = useState(0),
    [now, setNow] = useState(() => Date.parse(commerce.clock));
  const [pricing, setPricing] = useState<BedPricing>({
    key: "",
    quote: null,
    error: "",
    pending: false,
  });
  const context = quoteContextKey(commerce.state, commerce.clock),
    key = canonicalJSON({ selection, context, refresh }),
    dispatch = commerce.dispatch;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setPricing((old) => ({ ...old, key, pending: true, error: "" }));
      void dispatch(
        { type: "bed.quote", selection },
        { idempotency_key: crypto.randomUUID() },
      )
        .then((result) => {
          if (!cancelled)
            setPricing({
              key,
              quote: result.quote ?? null,
              error: "",
              pending: false,
            });
        })
        .catch((cause) => {
          if (!cancelled)
            setPricing({
              key,
              quote: null,
              error:
                cause instanceof Error
                  ? cause.message
                  : "A current quote is unavailable. Check your connection and retry.",
              pending: false,
            });
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, selection, dispatch, enabled]);
  return {
    pricing,
    current: pricing.key === key && !pricing.pending,
    expired: !!pricing.quote && now >= Date.parse(pricing.quote.expires_at),
    refresh: () => setRefresh((n) => n + 1),
  };
}
export function useBedDraft(
  selection: BedSelection,
  enabled: boolean,
  expectedRevision?: number,
) {
  const commerce = useCommerce(),
    dispatch = commerce.dispatch;
  const baseline = useRef(
      expectedRevision ?? commerce.state.builder_selection.selection_revision,
    ),
    lastWritten = useRef(""),
    latest = useRef(selection),
    queue = useRef(Promise.resolve());
  const [status, setStatus] = useState("Device draft ready"),
    [conflict, setConflict] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    latest.current = selection;
  }, [selection]);
  useEffect(() => {
    if (!enabled || conflict) return;
    let active = true;
    const timer = setTimeout(() => {
      const fingerprint = canonicalJSON(selection);
      if (lastWritten.current === fingerprint) return;
      setStatus("Saving device draft…");
      queue.current = queue.current.then(async () => {
        if (canonicalJSON(latest.current) !== fingerprint) return;
        const expected = baseline.current;
        try {
          await dispatch(
            {
              type: "builder.save",
              selection,
              expected_selection_revision: expected,
            },
            { idempotency_key: crypto.randomUUID() },
          );
          baseline.current = expected + 1;
          lastWritten.current = fingerprint;
          try {
            const buffered = JSON.parse(
              sessionStorage.getItem(
                `bed-builder:recovery:${commerce.state.profile.id}`,
              ) ?? "null",
            );
            if (
              buffered &&
              bedFingerprint(buffered.selection) === bedFingerprint(selection)
            )
              sessionStorage.removeItem(
                `bed-builder:recovery:${commerce.state.profile.id}`,
              );
          } catch {
            /* The device engine draft is already committed. */
          }
          if (active) setStatus("Draft saved on this device");
        } catch (cause) {
          if (active) {
            setStatus(
              cause instanceof Error
                ? cause.message
                : "Draft could not be saved",
            );
            setConflict(true);
          }
        }
      });
    }, 650);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    selection,
    enabled,
    conflict,
    retry,
    dispatch,
    commerce.state.profile.id,
  ]);
  return {
    status,
    conflict,
    buffer: (next: BedSelection) => {
      try {
        sessionStorage.setItem(
          `bed-builder:recovery:${commerce.state.profile.id}`,
          JSON.stringify({
            owner_id: commerce.state.profile.id,
            expected_revision: baseline.current,
            selection: next,
          }),
        );
      } catch {
        setStatus(
          "Temporary recovery storage is unavailable; wait for the device draft save before leaving.",
        );
      }
    },
    keepCurrent: () => {
      baseline.current = commerce.state.builder_selection.selection_revision;
      setConflict(false);
      setRetry((n) => n + 1);
    },
    acceptStored: () => {
      baseline.current = commerce.state.builder_selection.selection_revision;
      lastWritten.current = "";
      setConflict(false);
      setRetry((n) => n + 1);
      return structuredClone(commerce.state.builder_selection);
    },
  };
}
export function bedFingerprint(selection: BedSelection) {
  return canonicalJSON({ ...selection, selection_revision: 0 });
}
export function readBedRecovery(
  state: CommerceState,
): { selection: BedSelection; expectedRevision: number } | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`bed-builder:recovery:${state.profile.id}`) ??
        "null",
    );
    if (
      !value ||
      value.owner_id !== state.profile.id ||
      !Number.isSafeInteger(value.expected_revision) ||
      value.expected_revision < 0
    )
      return null;
    const parsed = selectionSchema.safeParse(value.selection);
    if (
      parsed.success &&
      bedFingerprint(parsed.data) !== bedFingerprint(state.builder_selection)
    )
      return {
        selection: parsed.data,
        expectedRevision: value.expected_revision,
      };
  } catch {
    return null;
  }
  return null;
}
export function readPurchaseReceipt(
  state: CommerceState,
): { id: string; fingerprint: string } | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`bed-builder:purchase:${state.profile.id}`) ??
        "null",
    );
    if (
      value &&
      typeof value.id === "string" &&
      typeof value.fingerprint === "string" &&
      state.cart.bundles.some((b) => b.id === value.id)
    )
      return value;
  } catch {
    return null;
  }
  return null;
}
