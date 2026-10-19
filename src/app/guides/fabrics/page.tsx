import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
export const metadata: Metadata = { title: "The fabric guide" };
const fabrics = [
  {
    name: "Egyptian Cotton",
    kind: "Fiber / origin",
    feel: "Cotton fiber described by its declared origin. It may be woven into percale or sateen; the fiber name does not determine the weave.",
    query: "fiber=Egyptian+Cotton",
  },
  {
    name: "French Linen",
    kind: "Fiber / origin",
    feel: "Linen fiber with a declared French origin. These QA products use plain weave, a textured surface and a relaxed drape. Real origin claims require supplier evidence.",
    query: "fiber=French+Linen",
  },
  {
    name: "Percale",
    kind: "Weave",
    feel: "A plain woven surface, usually associated here with a crisp, matte hand. Confirm the selected fiber and product-specific assessment.",
    query: "weave=Percale",
  },
  {
    name: "Sateen",
    kind: "Weave",
    feel: "A float-based woven surface that produces a smoother hand and a subtle sheen. Cotton sateen and percale can share the same raw fiber.",
    query: "weave=Sateen",
  },
  {
    name: "Chunky Knit",
    kind: "Knitted construction",
    feel: "Large visible loops and substantial drape. Thread count does not describe a knit. Check total weight, fiber, care and snagging limitations.",
    query: "weave=Chunky+Knit",
  },
  {
    name: "Sherpa Fleece",
    kind: "Fleece surface / construction",
    feel: "A lofted, textured fleece face. Compare its specific fiber, GSM and warmth assessment; the name does not establish a universal warmth rating.",
    query: "weave=Sherpa+Fleece",
  },
  {
    name: "Waffle",
    kind: "Textured weave",
    feel: "A dimensional woven grid. Texture and air pockets influence the hand, but weight, fiber and finishing still matter.",
    query: "weave=Waffle",
  },
];
export default function FabricGuidePage() {
  return (
    <div className="page-shell section-space">
      <p className="eyebrow">{BRAND.name} · A feel for the finer things</p>
      <h1 className="page-title mt-3">The fabric guide.</h1>
      <p className="mt-5 max-w-[65ch] text-lg leading-8 text-ink-muted">
        Fiber is what a textile is made from. Weave and construction describe
        how it comes together. Keeping those separate makes choosing your next
        layer a little easier.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {fabrics.map((fabric) => (
          <article
            key={fabric.name}
            className="rounded-panel border border-divider bg-surface p-6 sm:p-8"
          >
            <p className="eyebrow">{fabric.kind}</p>
            <h2 className="mt-3 font-serif text-3xl">{fabric.name}</h2>
            <p className="mt-4 leading-7 text-ink-muted">{fabric.feel}</p>
            <Link className="text-link mt-5" href={`/shop?${fabric.query}`}>
              Explore {fabric.name.toLowerCase()} <ArrowUpRight size={15} />
            </Link>
          </article>
        ))}
      </div>
      <section className="mt-12 rounded-panel bg-surface-soft p-7 sm:p-10">
        <h2 className="section-title">
          A specification is not a promise of feel.
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">Thread count</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              A stated count of threads per square inch for appropriate woven
              cloth. It does not describe chunky knit or fleece, and a higher
              number does not automatically prove superior quality.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">GSM & total mass</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              GSM is grams per square metre of a particular textile, not a
              universal warmth score. Weighted blankets separately state total
              weight in kilograms. Insert shell and filling are distinct.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Relative feel</h3>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Softness, warmth and breathability are independent 1–10
              comparative assessments with methods and notes. All assessments at{" "}
              {BRAND.name} are synthetic QA examples, not lab results or
              clinical guidance.
            </p>
          </div>
        </div>
        <Link className="button-secondary mt-8" href="/guides/sizes">
          Next, get the fit right <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}
