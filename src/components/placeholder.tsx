/** Placeholder d'une route dont la fonctionnalité arrive dans une phase ultérieure. */
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-[1120px]">
      <h1 className="font-display text-[30px] font-semibold text-ink">{title}</h1>
      <div className="mt-8 rounded-lg border border-dashed border-neutral-200 bg-surface p-12 text-center">
        <p className="text-[14px] text-neutral-500">
          Section à venir — {phase}.
        </p>
      </div>
    </div>
  );
}
