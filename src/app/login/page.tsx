"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-surface p-8 shadow-sm">
        <h1 className="font-display text-[26px] font-semibold text-ink">
          MT Conseil
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Comptabilité — connexion
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-[12px] font-medium text-neutral-700"
            >
              Courriel
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-[12px] font-medium text-neutral-700"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </div>

          {state.error && (
            <p className="rounded-md bg-debit-bg px-3 py-2 text-[13px] text-debit">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-ink px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-ink-hover disabled:opacity-60"
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <Link
          href="/mot-de-passe-oublie"
          className="mt-4 block text-[13px] text-ink hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </main>
  );
}
