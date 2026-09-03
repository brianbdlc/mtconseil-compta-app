import { AccountManager, type Account } from "@/components/ledger/account-manager";
import { createClient } from "@/lib/supabase/server";

export default async function ParametresPage() {
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
    .select("id, number, name, class, is_active, description")
    .order("number");
  const accounts = (accountsData ?? []) as Account[];

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <h1 className="font-display text-[30px] font-semibold text-ink">
        Paramètres
      </h1>

      <section className="space-y-4">
        <div>
          <h2 className="text-[19px] font-semibold text-neutral-900">
            Plan comptable
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            Les comptes servent à imputer les écritures du grand livre. On
            désactive un compte devenu inutile plutôt que de le supprimer, afin
            de préserver l’historique.
          </p>
        </div>
        <AccountManager accounts={accounts} isEditeur={isEditeur} />
      </section>
    </div>
  );
}
