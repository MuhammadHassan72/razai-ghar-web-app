"use client";
import Image, { getImageProps } from "next/image";
import { useState, type CSSProperties } from "react";
export function StoreImage({
  src,
  alt,
  sizes = "(max-width: 767px) 50vw, 25vw",
  priority = false,
  className = "",
  position = "50% 50%",
  mobileSrc,
  mobilePosition,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  position?: string;
  mobileSrc?: string;
  mobilePosition?: string;
}) {
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  return (
    <div
      className={`store-image ${className}`}
      style={
        {
          "--art-desktop-position": position,
          "--art-mobile-position": mobilePosition ?? position,
        } as CSSProperties
      }
    >
      {failed ? (
        <div className="image-error">
          <p>Image unavailable</p>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Retry image
          </button>
        </div>
      ) : (
        <picture className="absolute inset-0 block">
          {mobileSrc && (
            <source
              media="(max-width: 767px)"
              srcSet={
                getImageProps({
                  src: mobileSrc,
                  width: 960,
                  height: 720,
                  alt,
                  sizes: "100vw",
                }).props.srcSet
              }
            />
          )}
          <Image
            key={`${src}-${attempt}`}
            src={
              attempt
                ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`
                : src
            }
            alt={alt}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            className="object-cover"
            style={{ objectPosition: "var(--art-position)" }}
            onError={() => setFailed(true)}
          />
        </picture>
      )}
    </div>
  );
}
