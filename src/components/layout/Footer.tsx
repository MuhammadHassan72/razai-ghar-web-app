import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import BrandLogo from "./BrandLogo";
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-divider bg-surface-soft">
      <div className="page-shell grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo variant="footer" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
            Thoughtful layers. Familiar rituals.
            <br />A quieter place to end your day.
          </p>
          <p className="mt-5 text-xs text-ink-muted">
            {BRAND.name} QA store. All catalog facts and prices are test
            fixtures. No real payments or deliveries.
          </p>
        </div>
        <div>
          <h2 className="eyebrow mb-3">Make yourself comfortable</h2>
          {[
            ["Sheets", "/shop/sheets"],
            ["Duvet covers", "/shop/duvet-covers"],
            ["Blankets & throws", "/shop/blankets-throws"],
            ["Cushions", "/shop/cushions"],
            ["Inserts", "/shop/inserts"],
          ].map(([label, href]) => (
            <Link className="nav-link flex" key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h2 className="eyebrow mb-3">A little guidance</h2>
          <Link className="nav-link flex" href="/guides/fabrics">
            The fabric guide
          </Link>
          <Link className="nav-link flex" href="/guides/sizes">
            Sizes & pocket depth
          </Link>
          <Link className="nav-link flex" href="/create-your-bed">
            Create your own bed
          </Link>
          <Link className="nav-link flex" href="/shop">
            Explore all bedding <ArrowUpRight size={14} />
          </Link>
        </div>
        <div>
          <h2 className="eyebrow mb-3">Your sanctuary</h2>
          <Link className="nav-link flex" href="/account">
            My Sanctuary
          </Link>
          <Link className="nav-link flex" href="/account?tab=orders">
            Your orders
          </Link>
          <Link className="nav-link flex" href="/account?tab=wishlist">
            Your wishlist
          </Link>
          <Link className="nav-link flex" href="/cart">
            Your cart
          </Link>
        </div>
      </div>
      <div className="page-shell flex flex-wrap justify-between gap-3 border-t border-divider py-5 text-xs text-ink-muted">
        <p>© 2026 {BRAND.name} · QA edition</p>
        <p>Screen colors may vary. Editorial images are styling references.</p>
      </div>
    </footer>
  );
}
