export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <h1 className="font-display text-[30px] font-semibold text-ink">
        Tableau de bord
      </h1>
      <p className="mt-2 text-[14px] text-neutral-500">
        Le portrait financier (flux, AP/AR, ventilation par poste) apparaîtra ici
        une fois le grand livre alimenté.
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-neutral-200 bg-surface p-12 text-center">
        <p className="text-[14px] text-neutral-500">
          Aucune donnée pour l&apos;instant.
        </p>
      </div>
    </div>
  );
}
