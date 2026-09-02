import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Filet de sécurité : le middleware protège déjà, mais on ne rend jamais
  // le shell sans utilisateur.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("permission_level, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const level = profile?.permission_level ?? "lecteur";
  const isEditeur = level === "editeur";

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-surface px-6">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-neutral-700">
              {profile?.full_name ?? user.email}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isEditeur
                  ? "bg-credit-bg text-credit"
                  : "bg-info-bg text-info"
              }`}
            >
              {isEditeur ? "Éditeur" : "Lecteur"}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Se déconnecter
            </button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
