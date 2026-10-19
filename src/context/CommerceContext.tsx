"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createSeedState, QA_DISCLOSURE } from "@/lib/seed-data";
import {
  CommerceError,
  canonicalJSON,
  ensure,
  executeCommand,
  isStaff,
  previewCommand,
  publishedBanners,
  quoteCart,
  quoteSelection,
  validateState,
} from "@/lib/commerce-engine";
import type {
  BedSelection,
  CommerceCommand,
  CommerceErrorData,
  CommerceQuote,
  CommerceState,
  CommandOptions,
  CommandResult,
  RealtimeEvent,
  Role,
  ViewMode,
} from "@/types/commerce";

export const COMMERCE_STORAGE_KEY = "bedding-commerce:qa:v1";
const LOCK_NAME = `${COMMERCE_STORAGE_KEY}:write`;
const COMMIT_EVENT = "bedding-commerce:committed";
const MAX_STORAGE_BYTES = 4_000_000;
const ROLE_NAMES: Role[] = [
  "guest",
  "customer",
  "catalog_editor",
  "marketing_manager",
  "fulfillment_operator",
  "inventory_manager",
  "finance",
  "administrator",
];
export interface CommerceSnapshot {
  state: CommerceState;
  hydrated: boolean;
  persistence: "loading" | "ready" | "read_only" | "error";
  error: CommerceErrorData | null;
  role: Role;
  view_mode: ViewMode;
  last_event: RealtimeEvent | null;
  clock: string;
}
export interface CommercePersistence {
  read(): string | null;
  write(value: string): void;
  exclusive<T>(operation: () => T | Promise<T>): Promise<T>;
  subscribe(listener: () => void): () => void;
  notify(event: RealtimeEvent): void;
  can_write: boolean;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
function errorData(error: unknown): CommerceErrorData {
  if (error instanceof CommerceError)
    return {
      code: error.code,
      message: error.message,
      field_errors: error.field_errors,
      retryable: error.retryable,
      ...(error.current_revision === undefined
        ? {}
        : { current_revision: error.current_revision }),
    };
  return {
    code: "PERSISTENCE_FAILED",
    message:
      "The device could not save commerce data. Existing data was preserved. Check browser storage and retry.",
    field_errors: {},
    retryable: true,
  };
}
function browserPersistence(): CommercePersistence {
  return {
    read: () => window.localStorage.getItem(COMMERCE_STORAGE_KEY),
    write: (value) => window.localStorage.setItem(COMMERCE_STORAGE_KEY, value),
    exclusive: async (operation) => {
      ensure(
        !!navigator.locks,
        "CONCURRENCY_UNAVAILABLE",
        "This browser cannot coordinate cross-tab writes. Open this QA preview in a browser with Web Locks support.",
      );
      return navigator.locks.request(
        LOCK_NAME,
        { mode: "exclusive", signal: AbortSignal.timeout(10000) },
        operation,
      );
    },
    subscribe: (listener) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === COMMERCE_STORAGE_KEY || event.key === null)
          listener();
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") listener();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(COMMIT_EVENT, listener);
      window.addEventListener("focus", listener);
      window.addEventListener("online", listener);
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(COMMIT_EVENT, listener);
        window.removeEventListener("focus", listener);
        window.removeEventListener("online", listener);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    notify: () => {
      window.dispatchEvent(new Event(COMMIT_EVENT));
    },
    can_write: !!navigator.locks,
  };
}

/** Each provider/request owns its store. No customer state is shared through a server module singleton. */
export function createCommerceStore(
  initialState?: CommerceState,
  dependencies?: {
    persistence: CommercePersistence;
    now?: () => string;
    newId?: () => string;
  },
) {
  const initial = freeze(validateState(initialState ?? createSeedState()));
  const serverSnapshot: CommerceSnapshot = freeze({
    state: initial,
    hydrated: false,
    persistence: "loading",
    error: null,
    role: "customer",
    view_mode: "storefront",
    last_event: null,
    clock: initial.updated_at,
  });
  let snapshot = serverSnapshot;
  let persistence: CommercePersistence | undefined = dependencies?.persistence;
  const now = dependencies?.now ?? (() => new Date().toISOString());
  const newId = dependencies?.newId ?? (() => crypto.randomUUID());
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let starts = 0;
  let initializing: Promise<void> | undefined;
  function publish(patch: Partial<CommerceSnapshot>) {
    snapshot = freeze({ ...snapshot, ...patch });
    for (const listener of listeners) listener();
  }
  function serialize(state: CommerceState) {
    const raw = JSON.stringify(state);
    ensure(
      raw.length * 2 <= MAX_STORAGE_BYTES,
      "STORAGE_CAPACITY",
      "This device's QA data limit was reached. Export data before starting a fresh QA session.",
    );
    return raw;
  }
  function read(): CommerceState | null {
    ensure(persistence, "NOT_READY", "Commerce storage has not initialized.");
    const raw = persistence.read();
    if (raw === null) return null;
    ensure(
      raw.length * 2 <= MAX_STORAGE_BYTES,
      "STORAGE_CAPACITY",
      "Stored commerce data exceeds the supported size.",
    );
    try {
      return validateState(JSON.parse(raw));
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      throw new CommerceError(
        "STORAGE_CORRUPT",
        "Saved commerce data could not be read and was preserved. Export it before resetting this QA session.",
      );
    }
  }
  function refresh() {
    if (!persistence) return;
    try {
      const stored = read();
      ensure(
        stored,
        "STORAGE_REMOVED",
        "Commerce data was removed in another tab. Reload to initialize a fresh QA session.",
      );
      const sameRevision = stored.revision === snapshot.state.revision;
      ensure(
        !sameRevision ||
          canonicalJSON(stored) === canonicalJSON(snapshot.state),
        "STORAGE_CONFLICT",
        "Different data has the same revision. Saved data was preserved; reload before making changes.",
      );
      ensure(
        stored.revision >= snapshot.state.revision,
        "STORAGE_REGRESSION",
        "Saved data is older than the current session. Reload before making changes.",
      );
      publish({
        ...(sameRevision
          ? {}
          : {
              state: stored,
              last_event: {
                event_id: `storage-${stored.revision}`,
                schema_version: 1,
                aggregate_type: "commerce",
                aggregate_id: "qa-device",
                aggregate_version: stored.revision,
                event_type: "storage.refresh",
                occurred_at: stored.updated_at,
              } as RealtimeEvent,
            }),
        hydrated: true,
        persistence: persistence.can_write ? "ready" : "read_only",
        error: null,
      });
    } catch (error) {
      publish({
        hydrated: true,
        persistence: "error",
        error: errorData(error),
      });
    }
  }
  async function initialize() {
    try {
      persistence ??= browserPersistence();
      const initializeInsideLock = () => {
        const stored = read();
        if (stored) publish({ state: stored });
        else {
          ensure(
            persistence!.can_write,
            "CONCURRENCY_UNAVAILABLE",
            "This browser supports only read-only QA data.",
          );
          const fresh = initialState ? initial : createSeedState(now());
          persistence!.write(serialize(fresh));
          publish({ state: fresh });
        }
      };
      if (persistence.can_write)
        await persistence.exclusive(initializeInsideLock);
      else {
        const stored = read();
        if (stored) publish({ state: stored });
      }
      publish({
        hydrated: true,
        persistence: persistence.can_write ? "ready" : "read_only",
        error: null,
        clock: now(),
      });
    } catch (error) {
      publish({
        hydrated: true,
        persistence: "error",
        error: errorData(error),
      });
    }
  }
  async function dispatch(
    command: CommerceCommand,
    options: CommandOptions,
  ): Promise<CommandResult> {
    try {
      ensure(
        snapshot.hydrated && persistence && snapshot.persistence === "ready",
        "NOT_READY",
        "Commerce data is read-only or unavailable. Resolve storage errors before saving.",
      );
      return await persistence.exclusive(() => {
        const stored = read();
        ensure(
          stored,
          "STORAGE_REMOVED",
          "Commerce data was removed. Reload before saving.",
        );
        ensure(
          stored.revision >= snapshot.state.revision,
          "STORAGE_REGRESSION",
          "Saved data is older than the current session. Reload before saving.",
        );
        ensure(
          stored.revision !== snapshot.state.revision ||
            canonicalJSON(stored) === canonicalJSON(snapshot.state),
          "STORAGE_CONFLICT",
          "Different saved data has the same revision. Reload before saving.",
        );
        const outcome = executeCommand(stored, command, options, {
          now: now(),
          actor_id: stored.profile.id,
          role: snapshot.role,
          newId,
        });
        if (outcome.state === stored) {
          publish({ state: stored, error: null });
          return outcome.result;
        }
        persistence!.write(serialize(outcome.state));
        const event: RealtimeEvent = {
          event_id: newId(),
          schema_version: 1,
          aggregate_type: "commerce",
          aggregate_id: "qa-device",
          aggregate_version: outcome.state.revision,
          event_type: command.type,
          occurred_at: outcome.state.updated_at,
        };
        publish({
          state: outcome.state,
          error: null,
          persistence: "ready",
          last_event: event,
          clock: now(),
        });
        persistence!.notify(event);
        return outcome.result;
      });
    } catch (error) {
      const safe = errorData(error);
      publish({
        error: safe,
        ...([
          "PERSISTENCE_FAILED",
          "STORAGE_CORRUPT",
          "STORAGE_REMOVED",
          "STORAGE_CAPACITY",
          "STORAGE_REGRESSION",
        ].includes(safe.code)
          ? { persistence: "error" as const }
          : {}),
      });
      throw error instanceof CommerceError
        ? error
        : new CommerceError(
            safe.code,
            safe.message,
            safe.field_errors,
            safe.retryable,
          );
    }
  }
  function maintenance() {
    if (snapshot.persistence !== "ready") return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    )
      return;
    const clock = now();
    const activeUndos = (time: string) =>
      snapshot.state.undo_records
        .filter((u) => Date.parse(u.expires_at) > Date.parse(time))
        .map((u) => u.id)
        .join(",");
    const bannerIds = (time: string) =>
      publishedBanners(snapshot.state, time)
        .map((b) => `${b.id}:${b.revision}`)
        .join(",");
    const crossed = (time: string | null) =>
      !!time &&
      Date.parse(time) > Date.parse(snapshot.clock) &&
      Date.parse(time) <= Date.parse(clock);
    const pricingBoundary =
      snapshot.state.variants.some(
        (v) => v.sale && (crossed(v.sale.starts_at) || crossed(v.sale.ends_at)),
      ) ||
      snapshot.state.promos.some(
        (p) => crossed(p.starts_at) || crossed(p.ends_at),
      ) ||
      crossed(snapshot.state.bundle_policy.starts_at) ||
      crossed(snapshot.state.bundle_policy.ends_at);
    if (
      activeUndos(clock) !== activeUndos(snapshot.clock) ||
      bannerIds(clock) !== bannerIds(snapshot.clock) ||
      pricingBoundary
    )
      publish({ clock });
    const due =
      snapshot.state.orders.some(
        (o) =>
          o.payment_state === "pending" &&
          o.reservation_expires_at &&
          o.reservation_expires_at <= clock,
      ) ||
      snapshot.state.saved_looks.some(
        (l) => l.purge_after && l.purge_after <= clock,
      );
    if (due)
      void dispatch(
        { type: "maintenance.expire" },
        { idempotency_key: newId() },
      ).catch(() => undefined);
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start() {
      starts++;
      if (starts === 1) {
        persistence ??= dependencies?.persistence ?? browserPersistence();
        unsubscribe = persistence.subscribe(refresh);
        timer = setInterval(maintenance, 1000);
      }
      initializing ??= initialize();
      await initializing;
    },
    stop() {
      starts = Math.max(0, starts - 1);
      if (!starts) {
        unsubscribe?.();
        unsubscribe = undefined;
        if (timer) clearInterval(timer);
        timer = undefined;
      }
    },
    refresh,
    async retryPersistence() {
      await initialize();
    },
    dispatch,
    quoteCart: (): CommerceQuote =>
      quoteCart(snapshot.state, snapshot.state.cart, {
        now: now(),
        quote_id: newId(),
      }),
    quoteSelection: (selection: BedSelection): CommerceQuote =>
      quoteSelection(snapshot.state, selection, {
        now: now(),
        quote_id: newId(),
      }),
    preview: (command: CommerceCommand) =>
      previewCommand(snapshot.state, command, {
        now: now(),
        actor_id: snapshot.state.profile.id,
        role: snapshot.role,
        newId,
      }),
    setDemoRole(role: Role) {
      ensure(ROLE_NAMES.includes(role), "ROLE", "Unknown QA role.");
      publish({
        role,
        view_mode:
          (!isStaff(role) && snapshot.view_mode === "admin") ||
          (role === "guest" && snapshot.view_mode === "sanctuary")
            ? "storefront"
            : snapshot.view_mode,
      });
    },
    setViewMode(view_mode: ViewMode) {
      ensure(
        ["storefront", "builder", "sanctuary", "admin"].includes(view_mode),
        "VIEW",
        "Unknown view.",
      );
      ensure(
        view_mode !== "admin" || isStaff(snapshot.role),
        "FORBIDDEN",
        "Choose an authorized QA staff role before opening Admin CMS.",
      );
      ensure(
        view_mode !== "sanctuary" || snapshot.role !== "guest",
        "SIGN_IN_REQUIRED",
        "A customer QA session is required for My Sanctuary.",
      );
      publish({ view_mode });
    },
    exportData: () => serialize(snapshot.state),
    clearError: () => {
      publish({ error: null });
    },
  };
}
export type CommerceStore = ReturnType<typeof createCommerceStore>;
export interface CommerceContextValue extends CommerceSnapshot {
  dispatch: CommerceStore["dispatch"];
  preview: CommerceStore["preview"];
  quoteCart: CommerceStore["quoteCart"];
  quoteSelection: CommerceStore["quoteSelection"];
  setDemoRole: CommerceStore["setDemoRole"];
  setViewMode: CommerceStore["setViewMode"];
  refresh: CommerceStore["refresh"];
  retryPersistence: CommerceStore["retryPersistence"];
  exportData: CommerceStore["exportData"];
  clearError: CommerceStore["clearError"];
  cart_count: number;
  wishlist_count: number;
  active_looks: CommerceState["saved_looks"];
  recently_deleted_looks: CommerceState["saved_looks"];
  active_undos: CommerceState["undo_records"];
  banners: CommerceState["hero_banners"];
  disclosure: string;
}
const CommerceContext = createContext<CommerceStore | null>(null);
export function CommerceProvider({
  children,
  initialState,
  store: injectedStore,
}: {
  children: ReactNode;
  initialState?: CommerceState;
  store?: CommerceStore;
}) {
  const [store] = useState(
    () => injectedStore ?? createCommerceStore(initialState),
  );
  useEffect(() => {
    void store.start();
    return () => {
      store.stop();
    };
  }, [store]);
  return (
    <CommerceContext.Provider value={store}>
      <CommerceEnvironmentNotice />
      {children}
    </CommerceContext.Provider>
  );
}
function CommerceEnvironmentNotice() {
  const commerce = useCommerce();
  return (
    <aside
      className="border-b border-divider bg-warning-soft px-4 py-2 font-sans text-xs text-warning"
      aria-label="Commerce environment"
    >
      QA preview · Device-only fixture data · No real payments.{" "}
      {commerce.persistence === "read_only" &&
        "This browser is read-only because cross-tab write locks are unavailable."}
      {commerce.persistence === "error" && (
        <span role="alert">
          {" "}
          {commerce.error?.message}{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              void commerce.retryPersistence();
            }}
          >
            Retry storage
          </button>
        </span>
      )}
    </aside>
  );
}
export function useCommerce(): CommerceContextValue {
  const store = useContext(CommerceContext);
  if (!store)
    throw new CommerceError(
      "PROVIDER_REQUIRED",
      "useCommerce must be called inside CommerceProvider.",
    );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return useMemo<CommerceContextValue>(
    () => ({
      ...snapshot,
      dispatch: store.dispatch,
      preview: store.preview,
      quoteCart: store.quoteCart,
      quoteSelection: store.quoteSelection,
      setDemoRole: store.setDemoRole,
      setViewMode: store.setViewMode,
      refresh: store.refresh,
      retryPersistence: store.retryPersistence,
      exportData: store.exportData,
      clearError: store.clearError,
      cart_count: snapshot.state.cart.lines.reduce(
        (sum, l) => sum + l.quantity,
        0,
      ),
      wishlist_count: snapshot.state.wishlist.length,
      active_looks: snapshot.state.saved_looks.filter((l) => !l.deleted_at),
      recently_deleted_looks: snapshot.state.saved_looks.filter(
        (l) => !!l.deleted_at,
      ),
      active_undos: snapshot.state.undo_records.filter(
        (u) => Date.parse(u.expires_at) > Date.parse(snapshot.clock),
      ),
      banners: publishedBanners(snapshot.state, snapshot.clock),
      disclosure: QA_DISCLOSURE,
    }),
    [snapshot, store],
  );
}
