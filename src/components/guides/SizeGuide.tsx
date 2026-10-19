"use client";
import { useState } from "react";
import Link from "next/link";
import { useCommerce } from "@/context/CommerceContext";
import { dimensions } from "@/lib/storefront";

export default function SizeGuide({ compact = false }: { compact?: boolean }) {
  const { state } = useCommerce(),
    beds = state.sizes.filter((s) => s.product_role === "mattress");
  const [bedId, setBed] = useState("us-queen"),
    [units, setUnits] = useState<"metric" | "imperial">("imperial"),
    [width, setWidth] = useState("60"),
    [length, setLength] = useState("80"),
    [depth, setDepth] = useState("12");
  const bed = beds.find((s) => s.id === bedId) ?? beds[0],
    factor = units === "imperial" ? 25.4 : 1;
  const measured = {
    width: Number(width) * factor,
    length: Number(length) * factor,
    depth: Number(depth) * factor,
  };
  const valid =
    Object.values(measured).every(
      (n) => Number.isFinite(n) && n > 0 && n <= 5000,
    ) && measured.depth <= 1000;
  const sheets = state.sizes.filter(
    (s) =>
      ["sheet_set", "fitted_sheet"].includes(s.product_role) &&
      Math.abs(s.width_mm - bed.width_mm) < 1 &&
      Math.abs(s.length_mm - bed.length_mm) < 1,
  );
  const fit =
    valid &&
    sheets.some(
      (s) =>
        Math.abs(s.width_mm - measured.width) <=
          s.measurement_tolerance.plus_minus_mm &&
        Math.abs(s.length_mm - measured.length) <=
          s.measurement_tolerance.plus_minus_mm &&
        !!s.pocket_depth_mm &&
        s.pocket_depth_mm >= measured.depth,
    );
  function changeUnits(next: "metric" | "imperial") {
    const multiplier = next === "metric" ? 25.4 : 1 / 25.4;
    setWidth((Number(width) * multiplier).toFixed(2));
    setLength((Number(length) * multiplier).toFixed(2));
    setDepth((Number(depth) * multiplier).toFixed(2));
    setUnits(next);
  }
  return (
    <div className="space-y-6">
      <p className="text-ink-muted">
        A familiar size name is only a starting point. Measure width, length and
        total mattress depth, including any topper.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Market & mattress</span>
          <select
            className="field"
            value={bedId}
            onChange={(event) => {
              const selected = beds.find((s) => s.id === event.target.value)!;
              setBed(selected.id);
              setWidth(
                String(
                  units === "metric"
                    ? selected.width_mm
                    : selected.display_inches.width,
                ),
              );
              setLength(
                String(
                  units === "metric"
                    ? selected.length_mm
                    : selected.display_inches.length,
                ),
              );
            }}
          >
            {beds.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Your measurement units</span>
          <select
            className="field"
            value={units}
            onChange={(event) =>
              changeUnits(event.target.value as "metric" | "imperial")
            }
          >
            <option value="imperial">Inches</option>
            <option value="metric">Millimetres</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Width", width, setWidth],
          ["Length", length, setLength],
          ["Depth", depth, setDepth],
        ].map(([label, value, setter]) => (
          <label key={String(label)}>
            <span className="field-label">
              {String(label)} ({units === "metric" ? "mm" : "in"})
            </span>
            <input
              className="field"
              type="number"
              min="0.1"
              step="0.1"
              value={String(value)}
              onChange={(event) =>
                (setter as (value: string) => void)(event.target.value)
              }
            />
          </label>
        ))}
      </div>
      <div
        className={`rounded-control p-4 text-sm ${fit ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
        role="status"
      >
        {!valid
          ? "Enter positive measurements within 5,000 mm width/length and 1,000 mm depth."
          : fit
            ? "Your measurements match an available QA fitted size and fit within its pocket depth. Check the actual supplier tolerance and care allowance."
            : "These measurements do not match the selected fitted size or exceed its pocket. Choose another size or measure again; a larger pocket does not correct the wrong width or length."}
      </div>
      <div
        className="overflow-x-auto rounded-control border border-divider"
        role="region"
        aria-label="US mattress dimensions"
        tabIndex={0}
      >
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">
            Actual US mattress and fitted pocket dimensions
          </caption>
          <thead className="bg-surface-soft">
            <tr>
              <th className="p-3">Mattress</th>
              <th className="p-3">Dimensions</th>
              <th className="p-3">QA fitted pocket</th>
            </tr>
          </thead>
          <tbody>
            {beds.map((s) => (
              <tr key={s.id} className="border-t border-divider">
                <th className="p-3 font-medium">{s.label}</th>
                <td className="p-3">{dimensions(s)}</td>
                <td className="p-3">406.4 mm / 16 in</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice">
        Cushions: 18 × 18 in = 457.2 mm square; 20 × 20 in = 508 mm square; Euro
        26 × 26 in = 660.4 mm square; lumbar 14 × 22 in = 355.6 × 558.8 mm.
        Covers and inserts are separate sale units. Never assume a universal
        regional “Euro” size.
      </p>
      {compact && (
        <Link className="text-link" href="/guides/sizes">
          Open the full size guide
        </Link>
      )}
    </div>
  );
}
