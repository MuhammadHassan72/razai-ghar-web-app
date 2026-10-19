"use client";
import { useId } from "react";
import { Check } from "lucide-react";
import type { SwatchColor } from "@/types/commerce";
export function ColorSwatches({
  colors,
  selected,
  onChange,
  availability,
  limit,
}: {
  colors: SwatchColor[];
  selected: string;
  onChange: (id: string) => void;
  availability?: (id: string) => boolean;
  limit?: number;
}) {
  const name = useId();
  return (
    <fieldset className="swatch-fieldset">
      <legend className="sr-only">Choose a color</legend>
      <div className="flex flex-wrap gap-1">
        {colors.slice(0, limit).map((color) => (
          <label
            key={color.id}
            className="swatch-target"
            title={`${color.name}${availability && !availability(color.id) ? " · out of stock" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={color.id}
              checked={selected === color.id}
              onChange={() => onChange(color.id)}
              className="peer sr-only"
              aria-label={`${color.name}${availability ? (availability(color.id) ? ", available" : ", out of stock") : ""}`}
            />
            <span
              className="swatch-disc peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-focus-visible:outline-offset-4"
              style={{ backgroundColor: color.hex }}
              data-selected={selected === color.id}
            >
              {selected === color.id && (
                <span className="swatch-check">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
