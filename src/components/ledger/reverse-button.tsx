"use client";

import { useState, useTransition } from "react";
import { reverseEntry } from "@/lib/actions/ledger";

/**
 * Bouton de contrepassation d'une écriture (éditeur). Confirme avant d'agir : la
 * contrepassation crée une écriture d'inversion et rend l'originale immuable.
 */
export function ReverseButton({
  entryId,
  disabled,
}: {
  entryId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (disabled || pending) return;
    if (
      !window.confirm(
        "Contrepasser cette écriture ? Une écriture d'inversion sera créée et l'originale deviendra immuable.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reverseEntry(entryId);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[12px] text-debit">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-40"
      >
        {pending ? "…" : "Contrepasser"}
      </button>
    </span>
  );
}
