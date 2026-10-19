"use client";
import { useId } from "react";
import type {
  BedSelection,
  BedSlotId,
  CommerceState,
  Product,
  Weave,
} from "@/types/commerce";
import { BED_POSITIONS, bedItems } from "@/lib/bed-builder";

export type Inspection = "all" | "foundation" | "top";
export function FabricPattern({
  id,
  weave,
  weighted = false,
}: {
  id: string;
  weave: Weave;
  weighted?: boolean;
}) {
  return (
    <pattern
      id={id}
      width={
        weighted
          ? 100
          : weave === "Chunky Knit"
            ? 50
            : weave === "Waffle"
              ? 42
              : 30
      }
      height={
        weighted
          ? 100
          : weave === "Chunky Knit"
            ? 80
            : weave === "Waffle"
              ? 42
              : 30
      }
      patternUnits="userSpaceOnUse"
    >
      {weighted ? (
        <>
          <path
            d="M0 0H100V100"
            fill="none"
            stroke="#29251F"
            strokeOpacity=".24"
            strokeWidth="3"
          />
          <path
            d="M6 6H94V94"
            fill="none"
            stroke="#FFFCF7"
            strokeOpacity=".35"
            strokeWidth="2"
          />
        </>
      ) : weave === "Chunky Knit" ? (
        <>
          <path
            d="M25-20C-12 0 8 28 25 40C42 28 62 0 25-20ZM25 40C-12 60 8 88 25 100C42 88 62 60 25 40Z"
            fill="none"
            stroke="#29251F"
            strokeOpacity=".22"
            strokeWidth="9"
          />
          <path
            d="M22-10C5 4 19 20 25 29M22 50C5 64 19 80 25 89"
            fill="none"
            stroke="#FFFCF7"
            strokeOpacity=".45"
            strokeWidth="7"
          />
        </>
      ) : weave === "Sherpa Fleece" ? (
        <>
          <circle cx="8" cy="10" r="8" fill="#FFFCF7" fillOpacity=".25" />
          <circle cx="23" cy="24" r="8" fill="#29251F" fillOpacity=".10" />
          <circle cx="24" cy="5" r="5" fill="#FFFCF7" fillOpacity=".35" />
        </>
      ) : weave === "Waffle" ? (
        <>
          <path
            d="M3 3H39V39H3Z"
            fill="none"
            stroke="#29251F"
            strokeOpacity=".22"
            strokeWidth="5"
          />
          <path
            d="M7 8H34V34"
            fill="none"
            stroke="#FFFCF7"
            strokeOpacity=".50"
            strokeWidth="4"
          />
        </>
      ) : weave === "Sateen" ? (
        <>
          <path
            d="M0 4H30M0 14H30M0 24H30"
            stroke="#FFFCF7"
            strokeOpacity=".28"
            strokeWidth="2"
          />
          <path d="M8 0V30M23 0V30" stroke="#29251F" strokeOpacity=".055" />
        </>
      ) : weave === "Twill" ? (
        <path
          d="M-30 30L30-30M-15 45L45-15M0 60L60 0"
          stroke="#29251F"
          strokeOpacity=".17"
          strokeWidth="4"
        />
      ) : weave === "Plain Weave" ? (
        <>
          <path
            d="M0 6H30M0 22H30"
            stroke="#FFFCF7"
            strokeOpacity=".3"
            strokeWidth="3"
          />
          <path
            d="M8 0V30M24 0V30"
            stroke="#29251F"
            strokeOpacity=".17"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <path d="M0 0H30M0 15H30" stroke="#FFFCF7" strokeOpacity=".24" />
          <path d="M0 0V30M15 0V30" stroke="#29251F" strokeOpacity=".12" />
        </>
      )}
    </pattern>
  );
}
function FabricShape({
  id,
  path,
  color,
  product,
  weave,
  order,
  variantId,
}: {
  id: string;
  path: string;
  color: string;
  product: Product;
  weave: Weave;
  order: number;
  variantId: string;
}) {
  return (
    <g data-render-order={order} data-variant-id={variantId}>
      <defs>
        <FabricPattern
          id={`${id}-weave`}
          weave={weave}
          weighted={product.construction === "weighted"}
        />
        <clipPath id={`${id}-clip`}>
          <path d={path} />
        </clipPath>
      </defs>
      <path
        d={path}
        fill={color}
        stroke="#29251F"
        strokeOpacity=".2"
        strokeWidth="3"
        className="builder-fabric"
      />
      <path d={path} fill={`url(#${id}-weave)`} />
      <g
        clipPath={`url(#${id}-clip)`}
        opacity=".15"
        fill="none"
        stroke="#29251F"
        strokeWidth="10"
      >
        <path d="M650 650Q730 1050 570 1600M1770 650Q1670 1100 1890 1650M1130 760Q1220 1170 1120 1600" />
      </g>
    </g>
  );
}
export function BedPreviewStage({
  state,
  selection,
  inspection,
  onEdit,
  interactive = true,
}: {
  state: CommerceState;
  selection: BedSelection;
  inspection: Inspection;
  onEdit: (slot: BedSlotId) => void;
  interactive?: boolean;
}) {
  const prefix = `bed-${useId().replaceAll(":", "")}`;
  const items = bedItems(state, selection),
    foundation = items.find((i) => i.slot.slot_id === "foundation"),
    top = items.find((i) => i.slot.slot_id === "main_top"),
    throwItem = items.find((i) => i.slot.slot_id === "throw");
  const bed = state.sizes.find((s) => s.id === selection.bed_size_id),
    bedWidth = bed?.width_mm ?? 1524;
  const visible = (id: BedSlotId) =>
    inspection === "all" ||
    (inspection === "foundation"
      ? id === "foundation"
      : ["main_top", "throw"].includes(id));
  const valid = (item: typeof foundation) =>
    !!(item?.variant && item.product && item.slot.state === "selected");
  const flat =
    foundation?.product?.product_role === "sheet_set" &&
    foundation.product.contents.some(
      (c) => /flat sheet/i.test(c.name) && c.quantity > 0,
    );
  const sleeping =
    foundation?.product?.product_role === "sheet_set"
      ? foundation.product.contents
          .filter((c) => /pillowcase/i.test(c.name))
          .reduce((n, c) => n + c.quantity, 0)
      : 0;
  function cloth(
    item: NonNullable<typeof foundation>,
    path: string,
    order: number,
    suffix = "",
  ) {
    if (!item.product || !item.variant) return null;
    return (
      <FabricShape
        key={item.slot.slot_id + suffix}
        id={`${prefix}-${item.slot.slot_id}${suffix}`}
        path={path}
        color={item.color?.hex ?? "#FFFCF7"}
        product={item.product}
        weave={item.variant.weave}
        order={order}
        variantId={item.variant.id}
      />
    );
  }
  const topPath =
    top?.product?.construction === "weighted"
      ? "M540 790L1860 790L1990 1460Q1200 1510 410 1460Z"
      : top?.variant?.weave === "Sateen"
        ? "M535 790Q880 725 1200 785Q1550 725 1865 790L2060 1480Q1790 1420 1580 1510Q1200 1450 850 1515Q570 1470 340 1500Z"
        : top?.variant?.weave === "Chunky Knit" ||
            top?.variant?.weave === "Sherpa Fleece"
          ? "M525 780Q1200 740 1875 780L2055 1470Q1200 1570 345 1470Z"
          : "M535 790Q1200 755 1865 790L2045 1485Q1200 1535 355 1485Z";
  return (
    <div
      className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-panel bg-surface-inset"
      data-bed-stage="2400x1800"
      data-inspection={inspection}
    >
      <svg
        viewBox="0 0 2400 1800"
        width="2400"
        height="1800"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-labelledby={`${prefix}-title ${prefix}-description`}
      >
        <title id={`${prefix}-title`}>
          {items.some((i) => i.slot.state === "selected")
            ? "Your selected bedding in an illustrative room"
            : "Empty bed setup. No paid bedding selected."}
        </title>
        <desc id={`${prefix}-description`}>
          Deterministic QA illustration using named swatch tokens and symbolic
          weave patterns. Room, mattress, headboard and furniture are styling
          only. This is not exact SKU photography. An equivalent item and
          dimension list follows the stage.
        </desc>
        <defs>
          <linearGradient id={`${prefix}-wall`} x2="0" y2="1">
            <stop stopColor="#FFFCF7" />
            <stop offset="1" stopColor="#E3D8CB" />
          </linearGradient>
          <radialGradient id={`${prefix}-shadow`}>
            <stop stopColor="#29251F" stopOpacity=".22" />
            <stop offset="1" stopColor="#29251F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g data-render-order="0">
          <rect width="2400" height="1800" fill={`url(#${prefix}-wall)`} />
          <path d="M0 900H2400V1800H0Z" fill="#D8CEC2" />
          <path
            d="M0 1350L2400 1040M0 1680L2400 1250M520 1800L2400 1500"
            stroke="#887D71"
            strokeOpacity=".14"
            strokeWidth="3"
          />
          <rect
            x="190"
            y="140"
            width="280"
            height="480"
            rx="130"
            fill="#FFFCF7"
            opacity=".65"
          />
          <rect
            x="1960"
            y="160"
            width="245"
            height="300"
            fill="#EEE6DB"
            stroke="#B7A58A"
            strokeWidth="12"
          />
          <path
            d="M1990 420Q2070 210 2170 210Q2020 330 2160 420"
            fill="none"
            stroke="#A2AB94"
            strokeWidth="18"
          />
          <ellipse
            cx="1200"
            cy="1470"
            rx="1030"
            ry="265"
            fill={`url(#${prefix}-shadow)`}
          />
          <path d="M560 290Q1200 160 1840 290L1880 880H520Z" fill="#B7A58A" />
          <path
            d="M630 330Q1200 220 1770 330L1790 790H610Z"
            fill="#D9CBB6"
            stroke="#887D71"
            strokeOpacity=".4"
            strokeWidth="3"
          />
          <path d="M390 1400H2010L1980 1610H420Z" fill="#887D71" />
          <path
            d="M450 1580H520V1660H450ZM1880 1580H1950V1660H1880Z"
            fill="#6C6258"
          />
          <path
            d="M580 600H1820L2090 1470Q1200 1530 310 1470Z"
            fill="#FFFCF7"
            stroke="#D8CEC2"
            strokeWidth="10"
          />
          <path
            d="M310 1470Q1200 1530 2090 1470L2040 1530Q1200 1590 360 1530Z"
            fill="#EEE6DB"
          />
          <rect
            x="100"
            y="800"
            width="340"
            height="100"
            rx="10"
            fill="#B7A58A"
          />
          <path
            d="M130 900V1120M400 900V1120"
            stroke="#887D71"
            strokeWidth="20"
          />
          <path d="M270 790V590" stroke="#6C6258" strokeWidth="12" />
          <path d="M150 610L200 450H340L390 610Z" fill="#FFFCF7" />
        </g>
        {valid(foundation) &&
          visible("foundation") &&
          cloth(foundation!, "M580 600H1820L2090 1470Q1200 1530 310 1470Z", 10)}
        {valid(foundation) &&
          flat &&
          visible("foundation") &&
          cloth(
            foundation!,
            "M550 715Q1200 675 1850 715L1890 805Q1200 765 510 805Z",
            20,
            "-fold",
          )}
        {valid(top) && visible("main_top") && cloth(top!, topPath, 30)}
        {valid(throwItem) &&
          visible("throw") &&
          cloth(
            throwItem!,
            "M375 1230Q1020 1170 1920 1280L2040 1485Q1050 1370 400 1505L330 1470Z",
            40,
          )}
        {valid(foundation) && sleeping > 0 && inspection === "all" && (
          <g
            data-render-order="50"
            data-insert-included={foundation?.product?.insert_included ?? false}
          >
            {Array.from({ length: Math.min(6, sleeping) }, (_, i) => {
              const count = Math.min(6, sleeping),
                x = count === 1 ? 960 : 650 + i * (1100 / (count - 1)) - 160;
              return (
                <g
                  key={i}
                  transform={`translate(${x} 535) rotate(${i % 2 ? 6 : -6} 220 90)`}
                >
                  <rect
                    width="440"
                    height="195"
                    rx="45"
                    fill={foundation?.color?.hex ?? "#FFFCF7"}
                    stroke="#6C6258"
                    strokeOpacity=".5"
                    strokeDasharray={
                      foundation?.product?.insert_included ? undefined : "12 8"
                    }
                    strokeWidth="3"
                  />
                  <path
                    d="M35 20Q55 95 35 175M405 20Q385 95 405 175"
                    fill="none"
                    stroke="#6C6258"
                    strokeOpacity=".35"
                    strokeWidth="3"
                  />
                </g>
              );
            })}
          </g>
        )}
        {inspection === "all" &&
          items
            .filter((i) => i.slot.slot_id.startsWith("cushion_") && valid(i))
            .sort(
              (a, b) =>
                BED_POSITIONS[a.slot.slot_id].z -
                BED_POSITIONS[b.slot.slot_id].z,
            )
            .map((item) => {
              const size = item.size,
                lumbar = !!size && size.width_mm !== size.length_mm,
                w = Math.min(
                  550,
                  Math.max(
                    250,
                    1250 *
                      (Math.max(size?.width_mm ?? 457, size?.length_mm ?? 457) /
                        bedWidth),
                  ),
                ),
                h = lumbar ? w * 0.43 : w * 0.7;
              const p = BED_POSITIONS[item.slot.slot_id],
                x = p.x * 2400 - w / 2,
                y = p.y * 1800 - h / 2;
              return (
                <g
                  key={item.slot.slot_id}
                  transform={`translate(${x} ${y})`}
                  data-render-order={p.z}
                  data-variant-id={item.variant?.id}
                  data-filled={!!item.insert}
                >
                  <defs>
                    <FabricPattern
                      id={`${prefix}-${item.slot.slot_id}-weave`}
                      weave={item.variant!.weave}
                    />
                  </defs>
                  <rect
                    width={w}
                    height={h}
                    rx={item.insert ? 45 : 18}
                    fill={item.color?.hex ?? "#FFFCF7"}
                    stroke="#29251F"
                    strokeOpacity=".3"
                    strokeWidth={item.insert ? 4 : 2}
                    className="builder-fabric"
                  />
                  <rect
                    width={w}
                    height={h}
                    rx={item.insert ? 45 : 18}
                    fill={`url(#${prefix}-${item.slot.slot_id}-weave)`}
                  />
                  <path
                    d={`M18 18H${w - 18}V${h - 18}H18Z`}
                    rx="20"
                    fill="none"
                    stroke="#FFFCF7"
                    strokeOpacity=".45"
                    strokeWidth="3"
                  />
                </g>
              );
            })}
      </svg>
      <div className="absolute left-3 top-3 max-w-[80%] rounded-full bg-surface/95 px-3 py-1.5 text-[10px] font-medium text-ink sm:text-xs">
        QA illustration · styling-only room & mattress
      </div>
      {interactive &&
        selection.fit_confirmed &&
        inspection === "all" &&
        (Object.keys(BED_POSITIONS) as BedSlotId[])
          .filter((id) => id.startsWith("cushion_"))
          .map((id, i) => {
            const slot = selection.slots.find((s) => s.slot_id === id)!,
              p = BED_POSITIONS[id];
            return (
              <button
                key={id}
                type="button"
                className={`builder-hotspot ${slot.state === "selected" ? "is-filled" : ""}`}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                aria-label={`Edit ${p.label}${slot.state === "selected" ? ", selected" : ", empty"}`}
                onClick={() => onEdit(id)}
              >
                {i + 1}
              </button>
            );
          })}
      {!selection.slots.some((s) => s.state === "selected") && (
        <p className="absolute inset-x-4 bottom-5 rounded-control bg-surface/95 px-4 py-3 text-center text-xs text-ink sm:text-sm">
          An empty starting point. No paid bedding selected.
        </p>
      )}
    </div>
  );
}
