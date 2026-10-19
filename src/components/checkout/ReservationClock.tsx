"use client";
import { useEffect, useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
export default function ReservationClock({
  deadline,
}: {
  deadline: string | null;
}) {
  const { clock } = useCommerce(),
    [now, setNow] = useState(() => Date.parse(clock));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
  return (
    <div
      className={`rounded-control p-4 ${seconds <= 120 ? "bg-warning-soft text-warning" : "bg-surface-soft"}`}
    >
      <p className="text-sm font-medium">
        {seconds
          ? "Your pending QA order has a stock hold"
          : "Your stock hold has expired"}
      </p>
      <p className="price mt-2 text-2xl" aria-live="off">
        {Math.floor(seconds / 60)
          .toString()
          .padStart(2, "0")}
        :{(seconds % 60).toString().padStart(2, "0")}
      </p>
      {seconds > 0 && seconds <= 120 && (
        <p role="status" className="mt-2 text-sm">
          Two minutes or less remain. This preview cannot collect payment or
          extend a reservation. Unpaid held stock is released at expiry.
        </p>
      )}
      {seconds === 0 && (
        <p role="status" className="mt-2 text-sm">
          The unpaid QA order cannot be paid or fulfilled. Review current
          availability before making a new purchase intent.
        </p>
      )}
    </div>
  );
}
