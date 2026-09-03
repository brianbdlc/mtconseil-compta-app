"use client";

import { useState, useTransition } from "react";
import {
  createAccount,
  setAccountActive,
  updateAccount,
} from "@/lib/actions/ledger";
import { ACCOUNT_CLASS_LABELS, ACCOUNT_CLASSES } from "@/lib/format";

export type Account = {
  id: string;
  number: string;
  name: string;
  class: string;
  is_active: boolean;
  description: string | null;
};

const emptyForm = { number: "", name: "", class: "actif", description: "" };

export function AccountManager({
  accounts,
  isEditeur,
}: {
  accounts: Account[];
  isEditeur: boolean;
}) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startEdit = (a: Account) => {
    setEditingId(a.id);
    setForm({
      number: a.number,
      name: a.name,
      class: a.class,
      description: a.description ?? "",
    });
    setError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const submit = () => {
    setError(null);
    const input = {
      number: form.number.trim(),
      name: form.name.trim(),
      class: form.class,
      description: form.description.trim() || null,
    };
    if (!input.number || !input.name) {
      setError("Numéro et nom requis.");
      return;
    }
    startTransition(async () => {
      const res = editingId
        ? await updateAccount(editingId, input)
        : await createAccount(input);
      if (res.ok) cancel();
      else setError(res.error);
    });
  };

  const toggleActive = (a: Account) => {
    startTransition(async () => {
      const res = await setAccountActive(a.id, !a.is_active);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      {isEditeur && (
        <section className="rounded-lg border border-neutral-200 bg-surface p-6">
          <h3 className="text-[15px] font-semibold text-neutral-900">
            {editingId ? "Modifier le compte" : "Nouveau compte"}
          </h3>
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex w-28 flex-col gap-1">
              <span className="text-[12px] font-medium text-neutral-700">
                Numéro
              </span>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="tabular rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </label>
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-[12px] font-medium text-neutral-700">Nom</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-neutral-700">
                Classe
              </span>
              <select
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
                className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              >
                {ACCOUNT_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {ACCOUNT_CLASS_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[220px] flex-1 flex-col gap-1">
              <span className="text-[12px] font-medium text-neutral-700">
                Description
              </span>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[14px] text-neutral-900 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-ink px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-ink-hover disabled:opacity-50"
            >
              {pending ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancel}
                className="rounded-md px-3 py-2 text-[13px] text-neutral-700 hover:bg-neutral-100"
              >
                Annuler
              </button>
            )}
            {error && (
              <span className="rounded-md bg-debit-bg px-3 py-1.5 text-[13px] text-debit">
                {error}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-2.5 font-medium">Numéro</th>
                <th className="py-2.5 font-medium">Nom</th>
                <th className="py-2.5 font-medium">Classe</th>
                <th className="py-2.5 font-medium">Statut</th>
                {isEditeur && <th className="px-5 py-2.5 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="tabular px-5 py-2.5 font-mono text-[12px] text-neutral-700">
                    {a.number}
                  </td>
                  <td className="py-2.5 text-neutral-900">{a.name}</td>
                  <td className="py-2.5 text-neutral-700">
                    {ACCOUNT_CLASS_LABELS[a.class] ?? a.class}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        a.is_active
                          ? "bg-credit-bg text-credit"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {a.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  {isEditeur && (
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] text-neutral-700 hover:bg-neutral-100"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(a)}
                          disabled={pending}
                          className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                        >
                          {a.is_active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
