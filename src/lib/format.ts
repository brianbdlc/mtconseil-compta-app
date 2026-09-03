/** Formatage des montants — fr-CA, 2 décimales. À rendre avec la classe `tabular`. */
const money = new Intl.NumberFormat("fr-CA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Retourne le montant formaté, ou "—" pour zéro/vide (colonnes débit/crédit). */
export function formatAmount(value: number | null | undefined): string {
  if (!value) return "—";
  return money.format(value);
}

/** Formate un nombre (même zéro) — pour les totaux. */
export function formatTotal(value: number): string {
  return money.format(value);
}

const dateFmt = new Intl.DateTimeFormat("fr-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value: string): string {
  // value = "YYYY-MM-DD" (date sans fuseau) → éviter le décalage UTC.
  const [y, m, d] = value.split("-").map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

/** Libellé lisible d'une classe de compte. */
export const ACCOUNT_CLASS_LABELS: Record<string, string> = {
  actif: "Actif",
  passif: "Passif",
  capitaux_propres: "Capitaux propres",
  revenus: "Revenus",
  depenses: "Dépenses",
};

export const ACCOUNT_CLASSES = [
  "actif",
  "passif",
  "capitaux_propres",
  "revenus",
  "depenses",
] as const;
