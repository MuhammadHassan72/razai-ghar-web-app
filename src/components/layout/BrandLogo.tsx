import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/Razai ghar logo.jpeg";
import { BRAND } from "@/lib/brand";

export default function BrandLogo({
  variant = "header",
  className = "",
}: {
  variant?: "header" | "footer" | "receipt";
  className?: string;
}) {
  const compact = variant === "header";
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm max-[359px]:gap-1 ${className}`}
    >
      <Image
        src={logo}
        alt={BRAND.name}
        sizes={compact ? "(min-width: 1024px) 56px, 48px" : "72px"}
        loading={compact ? "eager" : "lazy"}
        className={
          compact
            ? "h-12 w-12 shrink-0 object-contain max-[359px]:h-8 max-[359px]:w-8 lg:h-14 lg:w-14"
            : "h-[72px] w-[72px] shrink-0 object-contain"
        }
      />
      <span aria-hidden="true" className="whitespace-nowrap text-ink">
        <span
          className={`block font-serif font-semibold leading-none tracking-[0.04em] ${compact ? "text-lg max-[359px]:text-sm sm:text-xl lg:text-2xl" : "text-2xl"}`}
        >
          {BRAND.name}
        </span>
        <span
          className={`mt-1.5 block font-sans uppercase leading-none tracking-[0.18em] text-ink-muted ${compact ? "text-[8px] lg:text-[9px]" : "text-[9px]"}`}
        >
          {BRAND.tagline}
        </span>
      </span>
    </Link>
  );
}
