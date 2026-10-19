"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCommerce } from "@/context/CommerceContext";
import { safeReturn } from "@/lib/backoffice";
import { Field, Panel } from "../ui/Panel";
import BrandLogo from "../layout/BrandLogo";
import type { Role } from "@/types/commerce";
export default function AuthScreen({
  mode,
}: {
  mode:
    | "sign-in"
    | "register"
    | "forgot-password"
    | "reset-password"
    | "verify-email";
}) {
  const commerce = useCommerce(),
    router = useRouter(),
    params = useSearchParams();
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  const titles = {
    "sign-in": "Welcome to your sanctuary.",
    register: "Make room for a softer life.",
    "forgot-password": "Find your way back.",
    "reset-password": "Choose a fresh start.",
    "verify-email": "Verify your email address.",
  };
  function enter(role: Role) {
    commerce.setDemoRole(role);
    const destination = safeReturn(params.get("returnTo"));
    const target =
      role === "guest"
        ? "/"
        : role === "administrator"
          ? "/admin"
          : destination.startsWith("/admin")
            ? "/account"
            : destination;
    commerce.setViewMode(
      role === "administrator"
        ? "admin"
        : role === "guest"
          ? "storefront"
          : "sanctuary",
    );
    router.push(target);
  }
  return (
    <div className="page-shell grid gap-10 py-12 lg:grid-cols-2 lg:py-20">
      <div className="space-y-6">
        <p className="eyebrow">RAZAI GHAR · My Sanctuary</p>
        <h1 className="page-title max-w-lg">{titles[mode]}</h1>
        <p className="max-w-md text-ink-muted">
          Keep your favourite layers, follow your orders and return to the bed
          looks you love.
        </p>
        <div className="rounded-card bg-surface-soft p-6">
          <h2 className="font-serif text-2xl">Your space, kept together</h2>
          <p className="mt-3">
            Your guest cart and builder draft stay on this device when you
            switch demo views.
          </p>
          <Link
            className="text-link mt-4 inline-flex min-h-11 items-center"
            href="/create-your-bed"
          >
            Return to your bed
          </Link>
        </div>
      </div>
      <Panel>
        <BrandLogo />
        <h2 className="font-serif text-3xl">Explore with a demo session</h2>
        <p className="text-sm text-ink-muted">
          This preview has no connected identity service. Demo roles simulate
          access to this device’s QA customer records; they do not authenticate
          a live account.
        </p>
        <div className="grid gap-3">
          <button className="button-primary" onClick={() => enter("customer")}>
            Continue as demo customer
          </button>
          <button
            className="button-secondary"
            onClick={() => enter("administrator")}
          >
            Explore Admin as demo staff
          </button>
          <button className="text-link min-h-11" onClick={() => enter("guest")}>
            Continue as guest
          </button>
        </div>
        <hr className="border-divider" />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(
              "Identity service unavailable. No account was created, no password was changed and no verification or recovery email was sent. Use a demo session above to explore.",
            );
          }}
        >
          <h3 className="font-semibold">
            {mode === "forgot-password"
              ? "Account recovery"
              : mode === "register"
                ? "Create an account"
                : mode === "verify-email"
                  ? "Email verification"
                  : mode === "reset-password"
                    ? "Password recovery"
                    : "Account sign-in"}
          </h3>
          <Field
            label="Email address"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-ink-muted">
            Credentials are handled only by a connected identity provider. This
            preview never asks for or stores a password.
          </p>
          <button className="button-secondary w-full">
            Check identity service
          </button>
          {message && (
            <p
              role="status"
              className="rounded-control bg-warning-soft p-4 text-sm text-warning"
            >
              {message}
            </p>
          )}
        </form>
        <div className="flex flex-wrap gap-5 text-sm">
          <Link className="text-link min-h-11 content-center" href="/sign-in">
            Sign in
          </Link>
          <Link className="text-link min-h-11 content-center" href="/register">
            Register
          </Link>
          <Link
            className="text-link min-h-11 content-center"
            href="/forgot-password"
          >
            Forgot password
          </Link>
        </div>
      </Panel>
    </div>
  );
}
