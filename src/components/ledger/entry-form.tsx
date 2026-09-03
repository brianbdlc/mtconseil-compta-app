"use client";

import { useState, useTransition } from "react";
import { createEntry, type EntryInput } from "@/lib/actions/ledger";
import { formatTotal } from "@/lib/format";

export type AccountOption = {
  id: string;
  number: string;
  name: string;
};

type LineDraft = {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
};

const emptyLine = (): LineDraft => ({
  account_id: "",
  debit: "",
  credit: "",
  description: "",
});

const today = () => new Date().toISOString().slice(0, 10);

/** Formulaire de saisie d'une écriture manuelle équilibrée (éditeur). */
export function EntryForm({ accounts }: { accounts: AccountOption[] }) {
  const [entryDate, setEntryDate] = useState(today());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const num = (s: string) => {
    const n = Number.parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const totalDebit = lines.reduce((s, l) => s + num(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + num(l.credit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;
  const filledLines = lines.filter(
    (l) => l.account_id && (num(l.debit) > 0 || num(l.credit) > 0),
  );
  const canSubmit = balanced && filledLines.length >= 2 && !pending;

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((_, j) => j !== i) : prev));

  const reset = () => {
    setEntryDate(today());
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
  };

  const submit = () => {
    setError(null);
    const payload: EntryInput = {
      entry_date: entryDate,
      description: description.trim() || null,
      lines: filledLines.map((l) => ({
        account_id: l.account_id,
        debit: num(l.debit),
        credit: num(l.credit),
        description: l.description.trim() || null,
      })),
    };
    startTransition(async () => {
      const res = await createEntry(payload);
      if (res.ok) reset();
      else setError(res.error);
    });
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-surface p-6">
      <h2 className="text-[15px] font-semibold text-neutral-900">
        Nouvelle écriture
      </h2>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-neutral-700">Date</span>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </label>
        <label className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span className="text-[12px] font-medium text-neutral-700">
            Description
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. Facture fournisseur — loyer septembre"
            className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="pb-2 pl-1 font-medium">Compte</th>
              <th className="pb-2 font-medium">Libellé</th>
              <th className="pb-2 text-right font-medium">Débit</th>
              <th className="pb-2 text-right font-medium">Crédit</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-1.5 pl-1 pr-2">
                  <select
                    value={line.account_id}
                    onChange={(e) => setLine(i, { account_id: e.target.value })}
                    className="w-full min-w-[200px] rounded-md border border-neutral-200 bg-surface px-2 py-1.5 text-[13px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  >
                    <option value="">— choisir —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.number} · {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    className="w-full rounded-md border border-neutral-200 bg-surface px-2 py-1.5 text-[13px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(e) =>
                      setLine(i, {
                        debit: e.target.value,
                        credit: e.target.value ? "" : line.credit,
                      })
                    }
                    className="tabular w-28 rounded-md border border-neutral-200 bg-surface px-2 py-1.5 text-right text-[13px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(e) =>
                      setLine(i, {
                        credit: e.target.value,
                        debit: e.target.value ? "" : line.debit,
                      })
                    }
                    className="tabular w-28 rounded-md border border-neutral-200 bg-surface px-2 py-1.5 text-right text-[13px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </td>
                <td className="py-1.5 pl-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length <= 2}
                    className="rounded px-2 py-1 text-[12px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                    aria-label="Retirer la ligne"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-[13px] font-medium">
              <td className="pt-3" colSpan={2}>
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-700 hover:bg-neutral-100"
                >
                  + Ajouter une ligne
                </button>
              </td>
              <td className="tabular pt-3 pr-2 text-right text-neutral-900">
                {formatTotal(totalDebit)}
              </td>
              <td className="tabular pt-3 pr-2 text-right text-neutral-900">
                {formatTotal(totalCredit)}
              </td>
              <td className="pt-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-medium ${
            balanced
              ? "bg-credit-bg text-credit"
              : "bg-warning-bg text-warning"
          }`}
        >
          {balanced
            ? "Équilibrée"
            : `Écart : ${formatTotal(Math.abs(totalDebit - totalCredit))}`}
        </span>

        <div className="flex items-center gap-3">
          {error && (
            <span className="rounded-md bg-debit-bg px-3 py-1.5 text-[13px] text-debit">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-ink px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-ink-hover disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : "Enregistrer l'écriture"}
          </button>
        </div>
      </div>
    </section>
  );
}
