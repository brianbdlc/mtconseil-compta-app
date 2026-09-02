import { ResetPasswordForm } from "@/components/reset-password-form";

/**
 * Page de définition du mot de passe, partagée par deux parcours distingués par
 * le param `type` (posé par /auth/confirm) :
 *   - invite   → première définition du mot de passe d'un invité
 *   - recovery → réinitialisation après « mot de passe oublié »
 * Le formulaire, la validation et updateUser({ password }) sont identiques ;
 * seuls le titre et le sous-titre changent.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const isInvite = type === "invite";

  const title = isInvite ? "Définis ton mot de passe" : "Nouveau mot de passe";
  const subtitle = isInvite
    ? "Bienvenue — choisis un mot de passe d'au moins 8 caractères pour activer ton accès."
    : "Choisis un mot de passe d'au moins 8 caractères.";
  const cta = isInvite ? "Activer mon accès" : "Enregistrer";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-surface p-8 shadow-sm">
        <h1 className="font-display text-[26px] font-semibold text-ink">
          {title}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">{subtitle}</p>

        <ResetPasswordForm cta={cta} />
      </div>
    </main>
  );
}
