"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = {};

/**
 * Formulaire de définition/réinitialisation du mot de passe. Identique dans les
 * deux cas (invitation initiale et récupération) : seul le titre, rendu par le
 * composant serveur parent, distingue les deux.
 */
export function ResetPasswordForm({ cta }: { cta: string }) {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
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
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="confirm"
          className="block text-[12px] font-medium text-neutral-700"
        >
          Confirmer
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
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
        {pending ? "Enregistrement…" : cta}
      </button>
    </form>
  );
}
