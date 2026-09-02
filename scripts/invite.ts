/**
 * scripts/invite.ts — invite un utilisateur avec un niveau de permission.
 *
 * Pourquoi ce script : le bouton « Invite user » du dashboard Supabase n'expose
 * PAS de champ user_metadata. Pour fixer le niveau (`lecteur` / `editeur`) dès
 * l'invitation, il faut passer par l'Auth Admin API avec la clé secrète
 * (service_role), depuis un environnement serveur de confiance. Le trigger
 * `handle_new_user` lit ensuite `raw_user_meta_data->>'permission_level'` et crée
 * la ligne `profiles` au bon niveau (défaut `lecteur` si absent).
 *
 * Usage :
 *   SUPABASE_URL=… SUPABASE_SECRET_KEY=… \
 *     npx tsx scripts/invite.ts <courriel> <lecteur|editeur> ["Nom complet"]
 *
 * - SUPABASE_URL : à défaut, NEXT_PUBLIC_SUPABASE_URL est utilisé.
 * - SUPABASE_SECRET_KEY : clé secrète du projet (Project Settings → API →
 *   service_role / sb_secret_…). NE JAMAIS la committer ni l'exposer côté client ;
 *   ne la fournir qu'en variable d'environnement.
 */
import { createClient } from "@supabase/supabase-js";

type Level = "lecteur" | "editeur";

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [email, level, fullName] = process.argv.slice(2);

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !level) {
    fail(
      'Usage : npx tsx scripts/invite.ts <courriel> <lecteur|editeur> ["Nom complet"]',
    );
  }
  if (level !== "lecteur" && level !== "editeur") {
    fail(`Niveau invalide « ${level} » — attendu « lecteur » ou « editeur ».`);
  }
  if (!url || !secret) {
    fail(
      "Variables requises : SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SECRET_KEY.",
    );
  }

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      permission_level: level as Level,
      ...(fullName ? { full_name: fullName } : {}),
    },
  });

  if (error) {
    fail(`Invitation échouée : ${error.message}`);
  }

  console.log(`✓ Invitation envoyée à ${email} (niveau ${level}).`);
  console.log(`  user id = ${data.user.id}`);
  console.log(
    "  Vérifie que public.profiles a bien permission_level = " +
      `'${level}' pour cet utilisateur (créé par le trigger handle_new_user).`,
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
