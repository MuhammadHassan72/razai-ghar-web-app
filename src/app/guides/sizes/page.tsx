import type { Metadata } from "next";
import SizeGuide from "@/components/guides/SizeGuide";
import { BRAND } from "@/lib/brand";
export const metadata: Metadata = { title: "Sizes & pocket depth" };
export default function SizesPage() {
  return (
    <div className="page-shell section-space">
      <div className="max-w-4xl">
        <p className="eyebrow">{BRAND.name} · Fit first, settle in later</p>
        <h1 className="page-title mb-6 mt-3">
          Your size, without the guesswork.
        </h1>
        <SizeGuide />
        <section className="mt-10" id="fit-help">
          <h2 className="section-title">Three measurements. One better fit.</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            {[
              {
                title: "Measure across",
                text: "Measure the actual mattress width, edge to edge, without including the bed frame.",
              },
              {
                title: "Measure end to end",
                text: "Measure mattress length. Familiar labels vary across markets and do not replace dimensions.",
              },
              {
                title: "Include the topper",
                text: "Measure the full depth you need to cover. A fitted pocket must accommodate that total without substituting a different width or length.",
              },
            ].map((item, index) => (
              <li
                key={item.title}
                className="rounded-card border border-divider p-5"
              >
                <span className="eyebrow">0{index + 1}</span>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
          <p className="notice mt-6">
            This calculator checks the fixture dimensions and pocket capacity.
            It does not account for unsupported supplier shrinkage or
            elasticity. Follow the actual product’s measurement tolerance,
            washing allowance and sewn label.
          </p>
        </section>
      </div>
    </div>
  );
}
