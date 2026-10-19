"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCommerce } from "./CommerceContext";
import { canonicalJSON } from "@/lib/commerce-engine";
import type { CommerceCommand, CommandResult } from "@/types/commerce";

type Overlay =
  | null
  | { kind: "cart" | "search" | "sizes" | "mobile" | "account" }
  | {
      kind: "builder";
      panel: "view" | "texture" | "save" | "reset" | "size" | "review";
    }
  | {
      kind: "quick";
      product_id: string;
      color_id?: string;
      wishlist_entry_id?: string;
    };
interface StorefrontUI {
  overlay: Overlay;
  setOverlay: (overlay: Overlay) => void;
  notify: (message: string) => void;
}
const Context = createContext<StorefrontUI | null>(null);
export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(timeout);
  }, [message]);
  return (
    <Context.Provider value={{ overlay, setOverlay, notify: setMessage }}>
      {children}
      <div
        className={`store-toast ${message ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </Context.Provider>
  );
}
export function useStorefront() {
  const context = useContext(Context);
  if (!context) throw new Error("StorefrontProvider is required");
  return context;
}
export function useCommerceAction() {
  const commerce = useCommerce(),
    { notify } = useStorefront();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const working = useRef(false),
    intent = useRef({ fingerprint: "", key: "" });
  const run = useCallback(
    async (
      command: CommerceCommand,
      message = "",
    ): Promise<CommandResult | null> => {
      if (working.current) return null;
      working.current = true;
      setPending(true);
      setError("");
      const fingerprint = canonicalJSON(command);
      if (intent.current.fingerprint !== fingerprint)
        intent.current = { fingerprint, key: crypto.randomUUID() };
      try {
        const result = await commerce.dispatch(command, {
          idempotency_key: intent.current.key,
        });
        intent.current = { fingerprint: "", key: "" };
        if (message) notify(message);
        return result;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The change could not be saved. Retry after refreshing commerce data.",
        );
        return null;
      } finally {
        working.current = false;
        setPending(false);
      }
    },
    [commerce, notify],
  );
  return { run, pending, error, clearError: () => setError("") };
}
export function ActionError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="form-error">
      {message}
    </p>
  ) : null;
}
