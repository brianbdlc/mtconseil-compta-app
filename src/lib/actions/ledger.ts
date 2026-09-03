"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Résultat standard d'une action de mutation du grand livre. */
export type LedgerResult = { ok: true; id?: string } | { ok: false; error: string };

export type LineInput = {
  account_id: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type EntryInput = {
  entry_date: string; // YYYY-MM-DD
  description?: string | null;
  lines: LineInput[];
};

/**
 * Traduit une erreur Postgres/PostgREST en message lisible. Les garanties sont
 * portées par la BD (triggers, RPC) ; on ne fait ici que rendre l'erreur humaine.
 */
function humanize(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("déséquilibr") || m.includes("desequilibr")) {
    return "Écriture déséquilibrée : la somme des débits doit égaler la somme des crédits.";
  }
  if (m.includes("au moins deux lignes")) {
    return "Une écriture doit comporter au moins deux lignes.";
  }
  if (m.includes("droit éditeur") || m.includes("insufficient")) {
    return "Droit éditeur requis pour cette action.";
  }
  if (m.includes("conflit de version")) {
    return "Cette écriture a été modifiée entre-temps. Recharge la page et réessaie.";
  }
  if (m.includes("déjà contrepassée")) {
    return "Cette écriture est déjà contrepassée.";
  }
  if (m.includes("contrepassée") && m.includes("immuable")) {
    return "Écriture contrepassée : elle est en lecture seule.";
  }
  if (m.includes("classe")) {
    return "Impossible de changer la classe d'un compte déjà mouvementé.";
  }
  if (m.includes("duplicate") || m.includes("unique")) {
    return "Ce numéro de compte existe déjà.";
  }
  return "Une erreur est survenue. Vérifie les données et réessaie.";
}

export async function createEntry(input: EntryInput): Promise<LedgerResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_journal_entry", {
    payload: input,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/grand-livre");
  return { ok: true, id: data as string };
}

export async function updateEntry(
  id: string,
  expectedVersion: number,
  input: EntryInput,
): Promise<LedgerResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_journal_entry", {
    p_id: id,
    p_expected_version: expectedVersion,
    payload: input,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/grand-livre");
  return { ok: true };
}

export async function reverseEntry(id: string): Promise<LedgerResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reverse_journal_entry", {
    p_id: id,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/grand-livre");
  return { ok: true, id: data as string };
}

export async function createAccount(input: {
  number: string;
  name: string;
  class: string;
  description?: string | null;
}): Promise<LedgerResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_account", {
    p_number: input.number,
    p_name: input.name,
    p_class: input.class,
    p_description: input.description ?? null,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/parametres");
  return { ok: true, id: data as string };
}

export async function updateAccount(
  id: string,
  input: { number: string; name: string; class: string; description?: string | null },
): Promise<LedgerResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_account", {
    p_id: id,
    p_number: input.number,
    p_name: input.name,
    p_class: input.class,
    p_description: input.description ?? null,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function setAccountActive(
  id: string,
  active: boolean,
): Promise<LedgerResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_active", {
    p_id: id,
    p_active: active,
  });
  if (error) return { ok: false, error: humanize(error.message) };
  revalidatePath("/parametres");
  return { ok: true };
}
