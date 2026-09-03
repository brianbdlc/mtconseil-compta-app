import { EntryForm, type AccountOption } from "@/components/ledger/entry-form";
import { ReverseButton } from "@/components/ledger/reverse-button";
import { formatAmount, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Line = {
  line_no: number;
  debit: number;
  credit: number;
  description: string | null;
  accounts: { number: string; name: string } | null;
};

type Entry = {
  id: string;
  entry_date: string;
  description: string | null;
  reversed_at: string | null;
  reverses_entry_id: string | null;
  journal_lines: Line[];
};

export default async function GrandLivrePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("permission_level")
    .eq("id", user!.id)
    .maybeSingle();
  const isEditeur = profile?.permission_level === "editeur";

  const { data: accountsData } = await supabase
    .from("accounts")
    .select("id, number, name, is_active")
    .eq("is_active", true)
    .order("number");
  const accounts: AccountOption[] = (accountsData ?? []).map((a) => ({
    id: a.id,
    number: a.number,
    name: a.name,
  }));

  const { data: entriesData } = await supabase
    .from("journal_entries")
    .select(
      "id, entry_date, description, reversed_at, reverses_entry_id, journal_lines(line_no, debit, credit, description, accounts(number, name))",
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  const entries = (entriesData ?? []) as unknown as Entry[];

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <h1 className="font-display text-[30px] font-semibold text-ink">
        Grand livre
      </h1>

      {isEditeur && accounts.length > 0 && <EntryForm accounts={accounts} />}

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold text-neutral-900">Écritures</h2>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-surface p-12 text-center">
            <p className="text-[14px] text-neutral-500">
              Aucune écriture pour l’instant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const lines = [...entry.journal_lines].sort(
                (a, b) => a.line_no - b.line_no,
              );
              const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
              const totalCredit = lines.reduce(
                (s, l) => s + Number(l.credit),
                0,
              );
              const isReversal = entry.reverses_entry_id !== null;
              const isReversed = entry.reversed_at !== null;

              return (
                <article
                  key={entry.id}
                  className="overflow-hidden rounded-lg border border-neutral-200 bg-surface"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="tabular text-[13px] font-medium text-neutral-900">
                        {formatDate(entry.entry_date)}
                      </span>
                      <span className="text-[13px] text-neutral-700">
                        {entry.description ?? "—"}
                      </span>
                      {isReversal && (
                        <span className="rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-medium text-info">
                          Contrepassation
                        </span>
                      )}
                      {isReversed && (
                        <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning">
                          Contrepassée
                        </span>
                      )}
                    </div>
                    {isEditeur && !isReversed && (
                      <ReverseButton entryId={entry.id} />
                    )}
                  </header>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-[13px]">
                      <thead>
                        <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                          <th className="py-2 pl-5 font-medium">Compte</th>
                          <th className="py-2 font-medium">Libellé</th>
                          <th className="py-2 text-right font-medium">Débit</th>
                          <th className="py-2 pr-5 text-right font-medium">
                            Crédit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr
                            key={line.line_no}
                            className="border-b border-neutral-100 last:border-0"
                          >
                            <td className="py-2 pl-5">
                              <span className="font-mono text-[12px] text-neutral-500">
                                {line.accounts?.number}
                              </span>{" "}
                              <span className="text-neutral-900">
                                {line.accounts?.name}
                              </span>
                            </td>
                            <td className="py-2 text-neutral-700">
                              {line.description ?? "—"}
                            </td>
                            <td className="tabular py-2 text-right text-neutral-900">
                              {formatAmount(Number(line.debit))}
                            </td>
                            <td className="tabular py-2 pr-5 text-right text-neutral-900">
                              {formatAmount(Number(line.credit))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="text-[13px] font-semibold">
                          <td className="py-2 pl-5 text-neutral-500" colSpan={2}>
                            Totaux
                          </td>
                          <td className="tabular py-2 text-right text-neutral-900">
                            {formatAmount(totalDebit)}
                          </td>
                          <td className="tabular py-2 pr-5 text-right text-neutral-900">
                            {formatAmount(totalCredit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
