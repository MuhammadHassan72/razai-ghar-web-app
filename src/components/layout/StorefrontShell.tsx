"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { StorefrontProvider } from "@/context/StorefrontContext";
import MegaNavbar from "./MegaNavbar";
import Footer from "./Footer";
import CartDrawer from "../cart/CartDrawer";
import { QuickOptions } from "../product/QuickOptions";
import BrandLogo from "./BrandLogo";
export default function StorefrontShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    checkout = path === "/checkout",
    admin = path === "/admin" || path.startsWith("/admin/");
  return (
    <StorefrontProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {admin ? null : checkout ? (
        <header className="border-b border-divider bg-surface">
          <div className="page-shell flex h-16 items-center justify-between gap-2 lg:h-[72px]">
            <BrandLogo />
            <Link href="/cart" className="text-link">
              Return to cart
            </Link>
          </div>
        </header>
      ) : (
        <MegaNavbar />
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {!checkout && !admin && <Footer />}
      <CartDrawer />
      <QuickOptions />
    </StorefrontProvider>
  );
}
