"use client";
import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { useCommerce } from "@/context/CommerceContext";
import { STAFF_ROLES, label } from "@/lib/backoffice";
import type { Role } from "@/types/commerce";
export function Field({
  label: title,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="field-label">{title}</span>
      <input className="field" {...props} />
    </label>
  );
}
export function Select({
  label: title,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="field-label">{title}</span>
      <select className="field" {...props}>
        {children}
      </select>
    </label>
  );
}
export function TextArea({
  label: title,
  value,
  onChange,
  maxLength = 2000,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{title}</span>
      <textarea
        className="field min-h-24"
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Check({
  children,
  checked,
  onChange,
}: {
  children: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input
        className="size-5 accent-primary"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
export function Panel({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="panel space-y-5">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
export function Time({ at }: { at: string }) {
  const c = useCommerce();
  return (
    <time dateTime={at} title={at}>
      {new Intl.DateTimeFormat(c.state.profile.locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: c.hydrated ? undefined : "UTC",
      }).format(new Date(at))}
    </time>
  );
}
export function RoleSelect({ staffOnly = false }: { staffOnly?: boolean }) {
  const c = useCommerce();
  return (
    <Select
      label="QA role simulator · device only"
      value={c.role}
      onChange={(e) => c.setDemoRole(e.target.value as Role)}
    >
      {(staffOnly ? STAFF_ROLES : ["guest", "customer", ...STAFF_ROLES]).map(
        (role) => (
          <option key={role} value={role}>
            {label(role)}
          </option>
        ),
      )}
    </Select>
  );
}
export function Freshness() {
  const c = useCommerce();
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
      <span>
        Device snapshot r{c.state.revision} · updated{" "}
        <Time at={c.state.updated_at} />
      </span>
      <button className="text-link min-h-11" onClick={() => void c.refresh()}>
        Refresh data
      </button>
      <span>
        {c.persistence === "ready"
          ? "Live device sync"
          : `Storage: ${c.persistence}`}
      </span>
    </div>
  );
}
