"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  ArrowUpRight,
  Ruler,
} from "lucide-react";
import { useCommerce } from "@/context/CommerceContext";
import { useStorefront } from "@/context/StorefrontContext";
import { isStaff } from "@/lib/commerce-engine";
import { CATEGORIES, filterCatalog } from "@/lib/storefront";
import type { Role, ViewMode } from "@/types/commerce";
import { Dialog } from "../ui/Dialog";
import { StoreImage } from "../ui/StoreImage";
import SizeGuide from "../guides/SizeGuide";
import BrandLogo from "./BrandLogo";

export default function MegaNavbar() {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--storefront-header-height",
        `${header.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        "--storefront-header-height",
      );
    };
  }, []);
  const commerce = useCommerce(),
    ui = useStorefront(),
    router = useRouter();
  const [mega, setMega] = useState(false),
    trigger = useRef<HTMLButtonElement>(null),
    hover = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [active, setActive] = useState(-1);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(timeout);
  }, [query]);
  useEffect(
    () => () => {
      if (hover.current) clearTimeout(hover.current);
    },
    [],
  );
  const results =
    debounced.length >= 2 && debounced === query.trim()
      ? filterCatalog(
          commerce.state,
          new URLSearchParams({ q: debounced }),
          undefined,
          commerce.clock,
        ).slice(0, 6)
      : [];
  const announcement = commerce.banners.find(
    (b) => b.placement === "announcement" && b.page === "/",
  );
  function open(kind: "search" | "sizes" | "mobile" | "account" | "cart") {
    setMega(false);
    ui.setOverlay({ kind });
  }
  function navigate(href: string) {
    setMega(false);
    ui.setOverlay(null);
    router.push(href);
  }
  function switchView(mode: ViewMode, href: string) {
    commerce.setViewMode(mode);
    navigate(href);
  }
  const menuLinks = (
    <>
      <div>
        <p className="eyebrow mb-3">Bedding, considered</p>
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/shop/${category.slug}`}
            className="nav-link flex"
            onClick={() => {
              setMega(false);
              ui.setOverlay(null);
            }}
          >
            {category.label}
          </Link>
        ))}
        <button
          type="button"
          className="nav-link flex"
          onClick={() => open("sizes")}
        >
          <Ruler size={16} /> Find your size
        </button>
      </div>
      <div>
        <p className="eyebrow mb-3">Find your feel</p>
        {[
          { label: "Egyptian cotton", query: "fiber=Egyptian+Cotton" },
          { label: "French linen", query: "fiber=French+Linen" },
          { label: "Crisp percale", query: "weave=Percale" },
          { label: "Smooth sateen", query: "weave=Sateen" },
        ].map((item) => (
          <Link
            key={item.label}
            className="nav-link flex"
            href={`/shop?${item.query}`}
            onClick={() => {
              setMega(false);
              ui.setOverlay(null);
            }}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className="text-link"
          href="/guides/fabrics"
          onClick={() => {
            setMega(false);
            ui.setOverlay(null);
          }}
        >
          Fiber & weave explained <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-divider bg-surface/95 backdrop-blur-[12px]"
      >
        {announcement?.announcement_text && (
          <div className="bg-primary px-4 py-2 text-center text-sm leading-5 text-on-primary">
            {announcement.primary_cta ? (
              <Link href={announcement.primary_cta.href}>
                {announcement.announcement_text}{" "}
                <span className="underline">
                  {announcement.primary_cta.label}
                </span>
              </Link>
            ) : (
              announcement.announcement_text
            )}
          </div>
        )}
        <div
          className="page-shell relative"
          onKeyDown={(event) => {
            if (event.key === "Escape" && mega) {
              setMega(false);
              trigger.current?.focus();
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setMega(false);
          }}
        >
          <div className="flex h-16 items-center justify-between gap-3 max-[359px]:gap-1 lg:h-[72px]">
            <button
              type="button"
              className="icon-button lg:hidden"
              aria-label="Open navigation"
              onClick={() => open("mobile")}
            >
              <Menu size={21} />
            </button>
            <BrandLogo />
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-5 lg:flex xl:gap-7"
            >
              <button
                ref={trigger}
                type="button"
                className="nav-link"
                aria-expanded={mega && !ui.overlay}
                aria-controls="bedding-mega-menu"
                onClick={() => {
                  ui.setOverlay(null);
                  setMega(!mega);
                }}
                onMouseEnter={() => {
                  if (hover.current) clearTimeout(hover.current);
                  hover.current = setTimeout(() => setMega(true), 150);
                }}
                onMouseLeave={() => {
                  if (hover.current) clearTimeout(hover.current);
                }}
              >
                Bedding <ChevronDown size={14} />
              </button>
              <Link className="nav-link" href="/shop/blankets-throws">
                Blankets & throws
              </Link>
              <Link className="nav-link" href="/shop/cushions">
                Cushions
              </Link>
              <Link className="nav-link text-primary" href="/create-your-bed">
                Create your own bed
              </Link>
            </nav>
            <div className="flex items-center">
              <button
                type="button"
                className="icon-button"
                aria-label="Search bedding"
                onClick={() => open("search")}
              >
                <Search size={19} />
              </button>
              <Link
                className="icon-button relative hidden sm:inline-flex"
                href="/account?tab=wishlist"
                aria-label={`Wishlist, ${commerce.wishlist_count} saved entries`}
              >
                <Heart size={19} />
                {commerce.wishlist_count > 0 && (
                  <span className="absolute right-0 top-0 rounded-full bg-surface-soft px-1.5 text-[10px]">
                    {commerce.wishlist_count}
                  </span>
                )}
              </Link>
              <button
                className="icon-button hidden sm:inline-flex"
                type="button"
                aria-label="Account and view switcher"
                onClick={() => open("account")}
              >
                <UserRound size={19} />
              </button>
              <button
                className="icon-button relative"
                type="button"
                aria-label={`Open cart, ${commerce.cart_count} sale units`}
                onClick={() => open("cart")}
              >
                <ShoppingBag size={19} />
                <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] text-on-primary">
                  {commerce.cart_count}
                </span>
              </button>
            </div>
          </div>
          {mega && !ui.overlay && (
            <div
              id="bedding-mega-menu"
              className="absolute inset-x-0 top-full grid max-h-[min(560px,70dvh)] grid-cols-4 gap-7 overflow-y-auto rounded-b-panel border border-divider bg-surface p-8 shadow-float"
              onMouseLeave={() => setMega(false)}
            >
              {menuLinks}
              {commerce.state.recipes.slice(0, 2).map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/create-your-bed?recipe=${recipe.id}`}
                  onClick={() => setMega(false)}
                >
                  <StoreImage
                    src={recipe.image.url}
                    alt={recipe.image.alt}
                    className="mb-3 aspect-[4/3] rounded-card"
                    sizes="280px"
                  />
                  <span className="font-serif text-2xl">{recipe.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                    Explore this bed <ArrowUpRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>
      <Dialog
        open={ui.overlay?.kind === "search"}
        onClose={() => ui.setOverlay(null)}
        title="Find your kind of comfort"
        wide
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (active >= 0 && results[active])
              navigate(`/products/${results[active].slug}`);
            else if (query.trim())
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <label htmlFor="global-search" className="field-label">
            Search by product, fabric, color, size or SKU
          </label>
          <div className="flex gap-2">
            <input
              id="global-search"
              data-dialog-autofocus
              className="field"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
              aria-expanded={results.length > 0}
              aria-activedescendant={
                active >= 0 && results[active]
                  ? `suggestion-${results[active].id}`
                  : undefined
              }
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && results.length) {
                  event.preventDefault();
                  setActive((n) => (n + 1) % results.length);
                }
                if (event.key === "ArrowUp" && results.length) {
                  event.preventDefault();
                  setActive((n) =>
                    n < 0
                      ? results.length - 1
                      : (n - 1 + results.length) % results.length,
                  );
                }
              }}
            />
            <button
              type="submit"
              className="button-primary"
              aria-label="Submit search"
            >
              <Search size={19} />
            </button>
          </div>
        </form>
        <p className="mt-3 text-sm text-ink-muted" role="status">
          {query.trim() !== debounced
            ? "Searching…"
            : debounced.length < 2
              ? "Type at least two characters for suggestions."
              : `${results.length} suggested products`}
        </p>
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Suggested products"
          className="mt-3 space-y-1"
        >
          {results.map((product, index) => (
            <li
              key={product.id}
              role="option"
              aria-selected={active === index}
              id={`suggestion-${product.id}`}
              tabIndex={-1}
              className={`cursor-pointer rounded-control p-3 ${active === index ? "bg-surface-soft" : "hover:bg-surface-soft"}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navigate(`/products/${product.slug}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter")
                  navigate(`/products/${product.slug}`);
              }}
            >
              <span className="font-medium">{product.title}</span>
              <span className="mt-1 block text-sm text-ink-muted">
                {product.category} · {product.weave}
              </span>
            </li>
          ))}
        </ul>
        {debounced.length >= 2 && results.length === 0 && (
          <p className="notice mt-4">
            No products match “{debounced}”. Try a fiber, color or category.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              className="badge min-h-11"
              href={`/shop/${c.slug}`}
              onClick={() => ui.setOverlay(null)}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={ui.overlay?.kind === "sizes"}
        onClose={() => ui.setOverlay(null)}
        title="A little measuring goes a long way"
        wide
      >
        <SizeGuide compact />
      </Dialog>
      <Dialog
        open={ui.overlay?.kind === "mobile"}
        onClose={() => ui.setOverlay(null)}
        title="Explore bedding"
        drawer
      >
        <nav aria-label="Mobile navigation" className="space-y-5">
          <Link
            className="button-primary w-full"
            href="/create-your-bed"
            onClick={() => ui.setOverlay(null)}
          >
            Create your own bed
          </Link>
          <div className="grid grid-cols-2 gap-4">{menuLinks}</div>
          <Link
            href="/account?tab=wishlist"
            className="nav-link flex"
            onClick={() => ui.setOverlay(null)}
          >
            Wishlist ({commerce.wishlist_count})
          </Link>
          <button
            className="nav-link"
            type="button"
            onClick={() => open("account")}
          >
            Account & view switcher <ArrowUpRight size={16} />
          </button>
        </nav>
      </Dialog>
      <Dialog
        open={ui.overlay?.kind === "account"}
        onClose={() => ui.setOverlay(null)}
        title="Your space"
        drawer
      >
        <p className="notice mb-6">
          Device-only QA session. The role simulator tests interface
          permissions; it is not an authentication service.
        </p>
        <nav aria-label="View switcher" className="space-y-3">
          <button
            type="button"
            className="button-secondary w-full"
            onClick={() => switchView("storefront", "/")}
          >
            Storefront
          </button>
          <button
            type="button"
            className="button-secondary w-full"
            onClick={() => {
              if (commerce.role === "guest") commerce.setDemoRole("customer");
              switchView("sanctuary", "/account");
            }}
          >
            {commerce.role === "guest"
              ? "Enter QA customer session"
              : "My Sanctuary"}
          </button>
          {isStaff(commerce.role) && (
            <button
              type="button"
              className="button-secondary w-full"
              onClick={() => switchView("admin", "/admin")}
            >
              Admin CMS
            </button>
          )}
        </nav>
        <label className="mt-8 block">
          <span className="field-label">QA role simulator</span>
          <select
            className="field"
            value={commerce.role}
            onChange={(event) => {
              commerce.setDemoRole(event.target.value as Role);
              if (event.target.value === "guest") router.push("/");
            }}
          >
            {[
              "guest",
              "customer",
              "catalog_editor",
              "marketing_manager",
              "fulfillment_operator",
              "inventory_manager",
              "finance",
              "administrator",
            ].map((role) => (
              <option key={role} value={role}>
                {role.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-ink-muted">
          Changing view never grants a role. Simulated roles reset on reload.
        </p>
      </Dialog>
    </>
  );
}
